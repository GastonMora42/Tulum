// src/app/api/pdv/conciliacion/guardar/route.ts - VERSIÓN MEJORADA
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { format } from 'date-fns';

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const body = await req.json();
    const { id, productos, observaciones, sucursalId, forzarContingencia } = body;
    
    if (!id || !productos || !Array.isArray(productos) || !sucursalId) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }
    
    const user = (req as any).user;
    
    // Verificar permisos de sucursal
    if (user.sucursalId && user.sucursalId !== sucursalId && user.roleId !== 'role-admin') {
      return NextResponse.json(
        { error: 'No tiene permisos para esta sucursal' },
        { status: 403 }
      );
    }
    
    // Verificar que la conciliación existe
    const conciliacion = await prisma.conciliacion.findFirst({
      where: { id, sucursalId }
    });
    
    if (!conciliacion) {
      return NextResponse.json(
        { error: 'Conciliación no encontrada' },
        { status: 404 }
      );
    }
    
    // NUEVA LÓGICA: Verificar si existe contingencia pendiente antes de proceder
    const contingenciasPendientes = await prisma.contingencia.findMany({
      where: {
        ubicacionId: sucursalId,
        tipo: 'stock',
        estado: { in: ['pendiente', 'en_revision'] }
      }
    });
    
    if (contingenciasPendientes.length > 0 && !forzarContingencia) {
      return NextResponse.json(
        { error: 'Existe una contingencia de stock pendiente. Debe ser resuelta antes de realizar nueva conciliación.' },
        { status: 409 }
      );
    }
    
    // Analizar diferencias
    let hayDiferencias = false;
    const diferenciasPorProducto: Array<{
      productoId: string;
      stockTeorico: number;
      stockFisico: number;
      diferencia: number;
      nombre?: string;
    }> = [];
    
    // Obtener información de productos
    const productosInfo = await prisma.producto.findMany({
      where: { id: { in: productos.map(p => p.productoId) } }
    });
    
    const productosPorId = new Map();
    productosInfo.forEach(p => productosPorId.set(p.id, p));
    
    // Verificar diferencias
    for (const produto of productos) {
      const { productoId, stockTeorico, stockFisico } = produto;
      if (stockFisico === null || stockFisico === undefined) continue;
      
      const diferencia = stockFisico - stockTeorico;
      
      if (diferencia !== 0 || forzarContingencia) {
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
      const estadoFinal = (hayDiferencias || forzarContingencia) ? 'con_contingencia' : 'completada';
      
      await tx.conciliacion.update({
        where: { id },
        data: {
          estado: estadoFinal,
          detalles: productos,
          observaciones: observaciones || ''
        }
      });
      
      // 2. Si hay diferencias o se fuerza, crear contingencia MEJORADA
      if (hayDiferencias || forzarContingencia) {
        const detallesTexto = diferenciasPorProducto.map(diff => 
          `- ${diff.nombre || diff.productoId}: Sistema=${diff.stockTeorico}, Contado=${diff.stockFisico}, Diferencia=${diff.diferencia > 0 ? '+' : ''}${diff.diferencia}`
        ).join('\n');
        
        const fechaFormateada = format(new Date(), 'dd/MM/yyyy HH:mm');
        
        const contingencia = await tx.contingencia.create({
          data: {
            titulo: `Diferencias en Conciliación de Inventario - ${fechaFormateada}`,
            descripcion: `
CONCILIACIÓN DE INVENTARIO CON DIFERENCIAS

Fecha: ${fechaFormateada}
Sucursal: ${sucursalId}
Realizada por: ${user.name}

PRODUCTOS CON DIFERENCIAS:
${detallesTexto}

${observaciones ? `\nObservaciones del vendedor:\n${observaciones}` : ''}

ACCIONES REQUERIDAS:
- Verificar las diferencias encontradas
- Investigar posibles causas (movimientos no registrados, mermas, etc.)
- Ajustar el stock del sistema si corresponde
- Documentar las correcciones realizadas
            `.trim(),
            origen: 'sucursal',
            creadoPor: user.id,
            estado: 'pendiente',
            tipo: 'stock',
            ubicacionId: sucursalId,
            urgente: diferenciasPorProducto.length > 5 || diferenciasPorProducto.some(d => Math.abs(d.diferencia) > 10)
          }
        });
        
        console.log(`[CONCILIACIÓN] Contingencia generada: ${contingencia.id} con ${diferenciasPorProducto.length} diferencias`);
      }
      
      // 3. NUEVO: Actualizar stock SOLO si no hay diferencias significativas (opcional)
      // Por ahora, NO actualizamos automáticamente el stock hasta que admin resuelva
      
      return { 
        success: true,
        hayDiferencias: hayDiferencias || forzarContingencia,
        mensaje: hayDiferencias || forzarContingencia
          ? 'Conciliación finalizada con diferencias. Se ha generado una contingencia para revisión administrativa.' 
          : 'Conciliación completada exitosamente. Los números coinciden perfectamente.',
        diferencias: diferenciasPorProducto.length,
        contingenciaGenerada: hayDiferencias || forzarContingencia
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