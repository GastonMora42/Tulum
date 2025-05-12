// src/app/api/pdv/conciliacion/guardar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { format } from 'date-fns'; // Añadida esta importación

export async function POST(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const body = await req.json();
    const { id, productos, observaciones, sucursalId } = body;
    
    if (!id || !productos || !Array.isArray(productos)) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }
    
    // Obtener usuario
    const user = (req as any).user;

    if (!sucursalId) {
      return NextResponse.json(
        { error: 'No se ha definido una sucursal' },
        { status: 400 }
      );
    }
    
    // Verificar si hay diferencias
    let hayDiferencias = false;
    const diferenciasPorProducto: { productoId: any; stockTeorico: any; stockFisico: any; diferencia: number; }[] = [];
    
    for (const producto of productos) {
      const { productoId, stockTeorico, stockFisico } = producto;
      const diferencia = stockFisico - stockTeorico;
      
      if (diferencia !== 0) {
        hayDiferencias = true;
        diferenciasPorProducto.push({
          productoId,
          stockTeorico,
          stockFisico,
          diferencia
        });
      }
    }

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Actualizar conciliación usando Prisma modelo en vez de SQL directo
      // Esto evita el problema de casteo de JSON
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
          `- ${diff.productoId}: Teórico=${diff.stockTeorico}, Físico=${diff.stockFisico}, Diferencia=${diff.diferencia}`
        ).join('\n');
        
        const fechaFormateada = format(new Date(), 'dd/MM/yyyy');
        
        await tx.contingencia.create({
          data: {
            titulo: `Diferencias en conciliación de inventario ${fechaFormateada}`,
            descripcion: `Se encontraron diferencias en la conciliación de inventario:\n\n${detallesTexto}\n\nObservaciones: ${observaciones || 'Ninguna'}`,
            origen: 'sucursal',
            creadoPor: user.id,
            estado: 'pendiente'
          }
        });
      }
      
      // 3. Actualizar stock si es necesario
      for (const producto of productos) {
        const { productoId, stockFisico } = producto;
        
        // Buscar stock actual
        const stock = await tx.stock.findFirst({
          where: {
            productoId,
            ubicacionId: sucursalId
          }
        });
        
        if (stock) {
          // Actualizar stock
          await tx.stock.update({
            where: { id: stock.id },
            data: {
              cantidad: stockFisico,
              ultimaActualizacion: new Date()
            }
          });
          
          // Registrar movimiento de stock
          await tx.movimientoStock.create({
            data: {
              stockId: stock.id,
              tipoMovimiento: 'ajuste',
              cantidad: Math.abs(stockFisico - stock.cantidad),
              motivo: `Ajuste por conciliación de inventario ${format(new Date(), 'dd/MM/yyyy')}`,
              usuarioId: user.id,
              fecha: new Date()
            }
          });
        }
      }
      
      return { 
        success: true,
        hayDiferencias,
        mensaje: hayDiferencias 
          ? 'Conciliación guardada con diferencias detectadas' 
          : 'Conciliación completada sin diferencias'
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