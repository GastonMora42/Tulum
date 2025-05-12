// src/app/api/pdv/conciliacion/guardar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { format } from 'date-fns';

export async function POST(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const body = await req.json();
    const { id, productos, observaciones, sucursalId } = body;
    
    if (!id || !productos || !Array.isArray(productos) || !sucursalId) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }
    
    // Obtener usuario actual
    const user = (req as any).user;
    
    // Verificar que el usuario tenga acceso a esta sucursal
    if (user.sucursalId && user.sucursalId !== sucursalId && user.roleId !== 'role-admin') {
      return NextResponse.json(
        { error: 'No tiene permisos para esta sucursal' },
        { status: 403 }
      );
    }
    
    // Verificar que la conciliación existe y pertenece a la sucursal
    const conciliacion = await prisma.conciliacion.findFirst({
      where: { id, sucursalId }
    });
    
    if (!conciliacion) {
      return NextResponse.json(
        { error: 'Conciliación no encontrada o no pertenece a esta sucursal' },
        { status: 404 }
      );
    }
    
    // Verificar si hay diferencias
    let hayDiferencias = false;
    const diferenciasPorProducto: Array<{
      productoId: string;
      stockTeorico: number;
      stockFisico: number;
      diferencia: number;
      nombre?: string;
    }> = [];
    
    // Obtener info adicional de productos para el reporte
    const productosInfo = await prisma.producto.findMany({
      where: { id: { in: productos.map(p => p.productoId) } }
    });
    
    const productosPorId = new Map();
    productosInfo.forEach(p => productosPorId.set(p.id, p));
    
    for (const producto of productos) {
      const { productoId, stockTeorico, stockFisico } = producto;
      if (stockFisico === null) continue; // Ignorar productos no contados
      
      const diferencia = stockFisico - stockTeorico;
      
      if (diferencia !== 0) {
        hayDiferencias = true;
        diferenciasPorProducto.push({
          productoId,
          stockTeorico,
          stockFisico,
          diferencia,
          nombre: productosPorId.get(productoId)?.nombre
        });
      }
    }
    
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Actualizar conciliación
      await tx.conciliacion.update({
        where: { id },
        data: {
          estado: hayDiferencias ? 'con_contingencia' : 'completada',
          detalles: productos, // Prisma manejará la conversión a JSONB automáticamente
          observaciones: observaciones || ''
        }
      });
      
      // 2. Si hay diferencias, crear contingencia
      if (hayDiferencias) {
        // Formatear detalles para descripción
        const detallesTexto = diferenciasPorProducto.map(diff => 
          `- ${diff.nombre || diff.productoId}: Teórico=${diff.stockTeorico}, Físico=${diff.stockFisico}, Diferencia=${diff.diferencia}`
        ).join('\n');
        
        const fechaFormateada = format(new Date(), 'dd/MM/yyyy');
        
        await tx.contingencia.create({
          data: {
            titulo: `Diferencias en conciliación de inventario ${fechaFormateada}`,
            descripcion: `Se encontraron diferencias en la conciliación de inventario:\n\n${detallesTexto}\n\nObservaciones: ${observaciones || 'Ninguna'}`,
            origen: 'sucursal',
            creadoPor: user.id,
            estado: 'pendiente',
            tipo: 'stock'
          }
        });
      }
      
      // 3. Actualizar stock si es necesario
      const registrosMovimiento = [];
      
      for (const producto of productos) {
        const { productoId, stockFisico } = producto;
        if (stockFisico === null) continue; // Ignorar productos no contados
        
        // Buscar stock actual
        const stock = await tx.stock.findFirst({
          where: {
            productoId,
            ubicacionId: sucursalId
          }
        });
        
        if (stock) {
          const valorAnterior = stock.cantidad;
          const diferencia = stockFisico - valorAnterior;
          
          // Solo actualizar si hay diferencia
          if (diferencia !== 0) {
            // Actualizar stock
            await tx.stock.update({
              where: { id: stock.id },
              data: {
                cantidad: stockFisico,
                ultimaActualizacion: new Date(),
                version: { increment: 1 }
              }
            });
            
            // Registrar movimiento de stock
            const movimiento = await tx.movimientoStock.create({
              data: {
                stockId: stock.id,
                tipoMovimiento: 'ajuste',
                cantidad: Math.abs(diferencia),
                motivo: `Ajuste por conciliación de inventario ${format(new Date(), 'dd/MM/yyyy')}`,
                usuarioId: user.id,
                fecha: new Date()
              }
            });
            
            registrosMovimiento.push({
              id: movimiento.id,
              productoId,
              diferencia
            });
          }
        } else if (stockFisico > 0) {
          // Crear nuevo stock si no existe pero hay stock físico
          const nuevoStock = await tx.stock.create({
            data: {
              productoId,
              ubicacionId: sucursalId,
              cantidad: stockFisico,
              ultimaActualizacion: new Date()
            }
          });
          
          // Registrar movimiento inicial
          const movimiento = await tx.movimientoStock.create({
            data: {
              stockId: nuevoStock.id,
              tipoMovimiento: 'entrada',
              cantidad: stockFisico,
              motivo: `Creación inicial por conciliación de inventario ${format(new Date(), 'dd/MM/yyyy')}`,
              usuarioId: user.id,
              fecha: new Date()
            }
          });
          
          registrosMovimiento.push({
            id: movimiento.id,
            productoId,
            diferencia: stockFisico
          });
        }
      }
      
      return { 
        success: true,
        hayDiferencias,
        mensaje: hayDiferencias 
          ? 'Conciliación guardada con diferencias detectadas' 
          : 'Conciliación completada sin diferencias',
        movimientos: registrosMovimiento
      };
    });
    
    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('Error al guardar conciliación:', error);
    return NextResponse.json(
      { error: error.message || 'Error al guardar conciliación' },
      { status: 500 }
    );
  }
}