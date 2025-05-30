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
    
    if (user.sucursalId && user.sucursalId !== sucursalId && user.roleId !== 'role-admin') {
      return NextResponse.json(
        { error: 'No tiene permisos para esta sucursal' },
        { status: 403 }
      );
    }
    
    const conciliacion = await prisma.conciliacion.findFirst({
      where: { id, sucursalId }
    });
    
    if (!conciliacion) {
      return NextResponse.json(
        { error: 'Conciliación no encontrada' },
        { status: 404 }
      );
    }
    
    // 🆕 VERIFICAR SOLO CONTINGENCIAS DE CONCILIACIÓN
    const contingenciasConciliacion = await prisma.contingencia.findMany({
      where: {
        ubicacionId: sucursalId,
        tipo: 'conciliacion', // 🔥 Solo este tipo bloquea nuevas conciliaciones
        estado: { in: ['pendiente', 'en_revision'] }
      }
    });
    
    if (contingenciasConciliacion.length > 0 && !forzarContingencia) {
      return NextResponse.json(
        { error: 'Existe una contingencia de conciliación pendiente. Debe ser resuelta antes de realizar nueva conciliación.' },
        { status: 409 }
      );
    }
    
    // Resto de la lógica...
    let hayDiferencias = false;
    const diferenciasPorProducto: Array<{
      productoId: string;
      stockTeorico: number;
      stockFisico: number;
      diferencia: number;
      nombre?: string;
    }> = [];
    
    const productosInfo = await prisma.producto.findMany({
      where: { id: { in: productos.map(p => p.productoId) } }
    });
    
    const productosPorId = new Map();
    productosInfo.forEach(p => productosPorId.set(p.id, p));
    
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
      await tx.conciliacion.update({
        where: { id },
        data: {
          estado: (hayDiferencias || forzarContingencia) ? 'con_contingencia' : 'completada',
          detalles: productos,
          observaciones: observaciones || ''
        }
      });
      
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
            tipo: 'conciliacion', // 🔥 ESPECÍFICO para conciliaciones
            ubicacionId: sucursalId,
            urgente: diferenciasPorProducto.length > 5 || diferenciasPorProducto.some(d => Math.abs(d.diferencia) > 10)
          }
        });
        
        console.log(`[CONCILIACIÓN] Contingencia de conciliación generada: ${contingencia.id}`);
      }
      
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