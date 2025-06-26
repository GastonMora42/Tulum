// src/app/api/pdv/conciliacion/guardar/route.ts - VERSIÓN CORREGIDA CON SINTAXIS PRISMA CORRECTA
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
    
    // 🔧 VERIFICAR CONTINGENCIAS SOLO DE LA CATEGORÍA ESPECÍFICA - SINTAXIS CORREGIDA
    console.log(`[GUARDAR] Verificando contingencias para categoría: ${categoriaId || 'general'}`);
    
    let contingenciasBloqueo = [];
    if (categoriaId) {
      // 🔧 CORRECCIÓN: OR al nivel superior
      contingenciasBloqueo = await prisma.contingencia.findMany({
        where: {
          ubicacionId: sucursalId,
          tipo: 'conciliacion',
          estado: { in: ['pendiente', 'en_revision'] },
          OR: [
            // 🔧 SINTAXIS CORRECTA: OR al nivel superior con múltiples condiciones en descripcion
            { descripcion: { contains: `categoriaId-${categoriaId}` } },
            { descripcion: { contains: `Categoría: ${categoriaId}` } }
          ]
        }
      });
      
      console.log(`[GUARDAR] Contingencias específicas encontradas para categoría ${categoriaId}: ${contingenciasBloqueo.length}`);
    } else {
      // Conciliación general
      contingenciasBloqueo = await prisma.contingencia.findMany({
        where: {
          ubicacionId: sucursalId,
          tipo: 'conciliacion_general',
          estado: { in: ['pendiente', 'en_revision'] }
        }
      });
      
      console.log(`[GUARDAR] Contingencias generales encontradas: ${contingenciasBloqueo.length}`);
    }
    
    if (contingenciasBloqueo.length > 0 && !forzarContingencia) {
      const categoria = categoriaId ? await prisma.categoria.findUnique({ where: { id: categoriaId }, select: { nombre: true } }) : null;
      const nombreCategoria = categoria?.nombre || 'Categoría desconocida';
      
      return NextResponse.json(
        { 
          error: categoriaId 
            ? `La categoría "${nombreCategoria}" tiene una contingencia de conciliación pendiente que debe ser resuelta antes de realizar nueva conciliación. Las demás categorías pueden conciliarse normalmente.`
            : 'Existe una contingencia de conciliación general pendiente que debe ser resuelta antes de realizar nueva conciliación.',
          categoriaAfectada: categoriaId,
          categoriaNombre: nombreCategoria,
          soloEstaCategoria: !!categoriaId // 🆕 Indicar que solo afecta esta categoría
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
      // 🆕 ACTUALIZAR CONCILIACIÓN CON IDENTIFICADORES MEJORADOS DE CATEGORÍA
      const observacionesFinales = categoriaId 
        ? `${observaciones || ''}\nConciliación de categoría: ${categoriaNombre} | categoriaId-${categoriaId} | Categoría: ${categoriaId} | FINALIZADA_${new Date().toISOString()}`
        : `${observaciones || ''}\nConciliación general | FINALIZADA_${new Date().toISOString()}`;
      
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
        
        // 🆕 TÍTULO Y DESCRIPCIÓN ESPECÍFICOS CON IDENTIFICADORES ÚNICOS
        const titulo = categoriaId 
          ? `Diferencias Conciliación - ${categoriaNombre} - ${fechaFormateada}`
          : `Diferencias Conciliación General - ${fechaFormateada}`;
        
        const tipoContingencia = categoriaId ? 'conciliacion' : 'conciliacion_general';
        
        // 🆕 DESCRIPCIÓN CON IDENTIFICADORES ÚNICOS Y ESPECÍFICOS
        const descripcionContingencia = categoriaId ? `
CONCILIACIÓN DE CATEGORÍA CON DIFERENCIAS

Categoría: ${categoriaNombre} (categoriaId-${categoriaId})
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

🔒 BLOQUEO GRANULAR: Esta contingencia bloquea ÚNICAMENTE futuras conciliaciones de la categoría "${categoriaNombre}" (ID: ${categoriaId}) hasta su resolución. Las demás categorías pueden seguir conciliándose normalmente.

IDENTIFICADORES DE BLOQUEO:
- categoriaId-${categoriaId}
- Categoría: ${categoriaId}
- Sucursal: ${sucursalId}
        `.trim() : `
CONCILIACIÓN GENERAL CON DIFERENCIAS

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

🔒 BLOQUEO GENERAL: Esta contingencia bloquea futuras conciliaciones generales hasta su resolución.
        `.trim();
        
        const contingencia = await tx.contingencia.create({
          data: {
            titulo,
            descripcion: descripcionContingencia,
            origen: 'sucursal',
            creadoPor: user.id,
            estado: 'pendiente',
            tipo: tipoContingencia,
            ubicacionId: sucursalId,
            urgente: diferenciasPorProducto.length > 5 || diferenciasPorProducto.some(d => Math.abs(d.diferencia) > 10)
          }
        });
        
        console.log(`[GUARDAR] Contingencia generada: ${contingencia.id} para ${categoriaId ? `categoría ${categoriaNombre} (${categoriaId})` : 'conciliación general'}`);
      }
      
      return { 
        success: true,
        hayDiferencias: hayDiferencias || forzarContingencia,
        mensaje: hayDiferencias || forzarContingencia
          ? `Conciliación de ${categoriaId ? `la categoría "${categoriaNombre}"` : 'inventario'} finalizada con diferencias. Se ha generado una contingencia para revisión administrativa. ${categoriaId ? 'Las demás categorías pueden seguir funcionando normalmente.' : ''}` 
          : `Conciliación de ${categoriaId ? `la categoría "${categoriaNombre}"` : 'inventario'} completada exitosamente. Los números coinciden perfectamente.`,
        diferencias: diferenciasPorProducto.length,
        contingenciaGenerada: hayDiferencias || forzarContingencia,
        categoriaId: categoriaId || null,
        categoriaNombre: categoriaNombre || null,
        soloEstaCategoria: !!categoriaId, // 🆕 Indicar que solo afecta esta categoría
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