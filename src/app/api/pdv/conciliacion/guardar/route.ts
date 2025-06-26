// src/app/api/pdv/conciliacion/guardar/route.ts - VERSIÓN CORREGIDA POR CATEGORÍA
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { format } from 'date-fns';

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const body = await req.json();
    const { id, productos, observaciones, sucursalId, categoriaId, forzarContingencia } = body;
    
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
    
    // 🔧 VERIFICAR CONTINGENCIAS SOLO DE LA CATEGORÍA ESPECÍFICA
    let contingenciasBloqueo = [];
    if (categoriaId) {
      contingenciasBloqueo = await prisma.contingencia.findMany({
        where: {
          ubicacionId: sucursalId,
          tipo: 'conciliacion',
          estado: { in: ['pendiente', 'en_revision'] },
          AND: [
            {
              OR: [
                { descripcion: { contains: `Categoría: ${categoriaId}` } },
                { descripcion: { contains: `categoriaId-${categoriaId}` } }
              ]
            }
          ]
        }
      });
    } else {
      // Conciliación general
      contingenciasBloqueo = await prisma.contingencia.findMany({
        where: {
          ubicacionId: sucursalId,
          tipo: 'conciliacion_general',
          estado: { in: ['pendiente', 'en_revision'] }
        }
      });
    }
    
    if (contingenciasBloqueo.length > 0 && !forzarContingencia) {
      const categoria = categoriaId ? await prisma.categoria.findUnique({ where: { id: categoriaId }, select: { nombre: true } }) : null;
      const nombreCategoria = categoria?.nombre || 'Categoría desconocida';
      
      return NextResponse.json(
        { 
          error: categoriaId 
            ? `La categoría "${nombreCategoria}" tiene una contingencia de conciliación pendiente que debe ser resuelta antes de realizar nueva conciliación.`
            : 'Existe una contingencia de conciliación general pendiente que debe ser resuelta antes de realizar nueva conciliación.',
          categoriaAfectada: categoriaId
        },
        { status: 409 }
      );
    }
    
    // Obtener información de categoría si aplica
    let categoriaNombre = '';
    if (categoriaId) {
      const categoria = await prisma.categoria.findUnique({
        where: { id: categoriaId }
      });
      categoriaNombre = categoria?.nombre || 'Categoría desconocida';
    }
    
    // Procesar diferencias
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
      // Actualizar conciliación con información de categoría
      const observacionesFinales = categoriaId 
        ? `${observaciones || ''}\nConciliación de categoría: ${categoriaNombre} | categoriaId-${categoriaId} | Categoría: ${categoriaId}`
        : observaciones || '';
      
      await tx.conciliacion.update({
        where: { id },
        data: {
          estado: (hayDiferencias || forzarContingencia) ? 'con_contingencia' : 'completada',
          detalles: productos,
          observaciones: observacionesFinales
        }
      });
      
      if (hayDiferencias || forzarContingencia) {
        const detallesTexto = diferenciasPorProducto.map(diff => 
          `- ${diff.nombre || diff.productoId}: Sistema=${diff.stockTeorico}, Contado=${diff.stockFisico}, Diferencia=${diff.diferencia > 0 ? '+' : ''}${diff.diferencia}`
        ).join('\n');
        
        const fechaFormateada = format(new Date(), 'dd/MM/yyyy HH:mm');
        
        // 🔧 TÍTULO Y DESCRIPCIÓN ESPECÍFICOS PARA CATEGORÍA CON IDENTIFICADOR MEJORADO
        const titulo = categoriaId 
          ? `Diferencias en Conciliación - ${categoriaNombre} - ${fechaFormateada}`
          : `Diferencias en Conciliación de Inventario - ${fechaFormateada}`;
        
        const tipoContingencia = categoriaId ? 'conciliacion' : 'conciliacion_general';
        
        const contingencia = await tx.contingencia.create({
          data: {
            titulo,
            descripcion: `
${categoriaId ? 'CONCILIACIÓN DE CATEGORÍA CON DIFERENCIAS' : 'CONCILIACIÓN DE INVENTARIO CON DIFERENCIAS'}

${categoriaId ? `Categoría: ${categoriaNombre} (categoriaId-${categoriaId})` : 'Conciliación General'}
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

${categoriaId ? `\n🔒 BLOQUEO: Esta contingencia bloquea futuras conciliaciones ÚNICAMENTE de la categoría "${categoriaNombre}" hasta su resolución. Las demás categorías pueden seguir funcionando normalmente.` : '\n🔒 BLOQUEO: Esta contingencia bloquea futuras conciliaciones generales hasta su resolución.'}
            `.trim(),
            origen: 'sucursal',
            creadoPor: user.id,
            estado: 'pendiente',
            tipo: tipoContingencia,
            ubicacionId: sucursalId,
            urgente: diferenciasPorProducto.length > 5 || diferenciasPorProducto.some(d => Math.abs(d.diferencia) > 10)
          }
        });
        
        console.log(`[CONCILIACIÓN] Contingencia generada: ${contingencia.id} para ${categoriaId ? `categoría ${categoriaNombre}` : 'conciliación general'}`);
      }
      
      return { 
        success: true,
        hayDiferencias: hayDiferencias || forzarContingencia,
        mensaje: hayDiferencias || forzarContingencia
          ? `Conciliación de ${categoriaId ? categoriaNombre : 'inventario'} finalizada con diferencias. Se ha generado una contingencia para revisión administrativa. ${categoriaId ? 'Las demás categorías pueden seguir funcionando normalmente.' : ''}` 
          : `Conciliación de ${categoriaId ? categoriaNombre : 'inventario'} completada exitosamente. Los números coinciden perfectamente.`,
        diferencias: diferenciasPorProducto.length,
        contingenciaGenerada: hayDiferencias || forzarContingencia,
        categoriaId: categoriaId || null,
        categoriaNombre: categoriaNombre || null,
        bloqueaTodasLasCategorias: !categoriaId // 🆕 Indicar si bloquea todas las categorías
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