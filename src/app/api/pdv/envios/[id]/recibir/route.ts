// src/app/api/pdv/envios/[id]/recibir/route.ts - VERSIÓN CORREGIDA
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';
import { envioService } from '@/server/services/envio/envioService';
import prisma from '@/server/db/client';

// Esquema de validación para recepción en PDV
const recepcionPDVSchema = z.object({
  items: z.array(
    z.object({
      itemEnvioId: z.string(),
      cantidadRecibida: z.number().nonnegative()
    })
  ),
  observaciones: z.string().optional()
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // 🔧 VERIFICAR PERMISO ESPECÍFICO PARA RECEPCIÓN DE ENVÍOS
  const permissionError = await checkPermission(['envio:recibir', 'envio:ver'])(req);
  if (permissionError) return permissionError;
  
  try {
    const { id } = await params;
    console.log(`[API PDV] Procesando recepción de envío ${id} en PDV`);
    
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = recepcionPDVSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { items, observaciones } = validation.data;
    console.log(`[API PDV] Items a recibir:`, items);
    
    // Obtener usuario
    const user = (req as any).user;
    
    // 🆕 VERIFICAR QUE EL ENVÍO EXISTE PRIMERO
    const envio = await prisma.envio.findUnique({
      where: { id },
      include: {
        origen: true,
        destino: true,
        items: {
          include: {
            producto: true,
            insumo: true
          }
        }
      }
    });
    
    if (!envio) {
      return NextResponse.json(
        { error: 'Envío no encontrado' },
        { status: 404 }
      );
    }
    
    console.log(`[API PDV] Envío encontrado: ${envio.origen.nombre} → ${envio.destino.nombre} (Estado: ${envio.estado})`);
    
    // 🆕 NUEVA LÓGICA: Validaciones diferenciadas para vendedores vs administradores
    if (user.roleId === 'role-vendedor') {
      // 🔧 VALIDACIONES ESPECÍFICAS PARA VENDEDORES
      if (!user.sucursalId) {
        return NextResponse.json(
          { error: 'El vendedor debe tener una sucursal asignada para recibir envíos' },
          { status: 403 }
        );
      }
      
      // Verificar que el envío está dirigido a la sucursal del vendedor
      if (envio.destinoId !== user.sucursalId) {
        return NextResponse.json(
          { 
            error: 'No tiene permiso para recibir este envío. El envío no está dirigido a su sucursal.',
            details: {
              envioDestino: envio.destino.nombre,
              sucursalUsuario: user.sucursalId
            }
          },
          { status: 403 }
        );
      }
      
      console.log(`[API PDV] Vendedor ${user.email} autorizado para recibir envío en su sucursal ${user.sucursalId}`);
      
    } else if (user.roleId === 'role-admin') {
      // 🆕 LÓGICA PARA ADMINISTRADORES: Sin restricciones de sucursal
      console.log(`[API PDV] Administrador ${user.email} recibiendo envío ${id} - acceso completo`);
      
    } else {
      // Otros roles no permitidos
      return NextResponse.json(
        { error: 'Su rol no tiene permisos para recibir envíos' },
        { status: 403 }
      );
    }
    
    // 🔧 VERIFICAR ESTADO DEL ENVÍO
    const estadosValidos = ['enviado', 'en_transito'];
    if (!estadosValidos.includes(envio.estado)) {
      return NextResponse.json(
        { 
          error: `El envío no puede ser recibido porque está en estado "${envio.estado}". Estados válidos: ${estadosValidos.join(', ')}.`,
          estadoActual: envio.estado,
          estadosValidos
        },
        { status: 400 }
      );
    }
    
    // 🔧 VALIDAR QUE TODOS LOS ITEMS PERTENECEN AL ENVÍO
    const itemsEnvioIds = new Set(envio.items.map(item => item.id));
    const itemsRecibidosIds = new Set(items.map(item => item.itemEnvioId));
    
    for (const itemRecibidoId of itemsRecibidosIds) {
      if (!itemsEnvioIds.has(itemRecibidoId)) {
        return NextResponse.json(
          { 
            error: `El item ${itemRecibidoId} no pertenece a este envío`,
            itemsValidos: Array.from(itemsEnvioIds)
          },
          { status: 400 }
        );
      }
    }
    
    // 🆕 AGREGAR HEADER DE CONTEXTO PARA EL SERVICIO DE STOCK
    req.headers.set('x-context', 'envio-recepcion');
    
    console.log(`[API PDV] Todas las validaciones pasadas. Invocando envioService.recibirEnvio para el envío ${id}`);
    
    // 🔧 LLAMAR AL SERVICIO CON VALIDACIÓN ADICIONAL
    const resultado = await envioService.recibirEnvio({
      envioId: id,
      usuarioId: user.id,
      items,
      observaciones
    });
    
    console.log(`[API PDV] Recepción completada exitosamente`);
    
    // 🆕 VERIFICAR SI HAY DIFERENCIAS PARA INFORMAR AL FRONTEND
    const hayDiferencias = items.some(item => {
      const itemEnvio = envio.items.find(i => i.id === item.itemEnvioId);
      return itemEnvio && itemEnvio.cantidad !== item.cantidadRecibida;
    });
    
    // 🔧 RESPUESTA MEJORADA CON MÁS INFORMACIÓN
    return NextResponse.json({
      success: true,
      envio: resultado,
      hayDiferencias,
      message: hayDiferencias 
        ? 'Envío recibido con diferencias. Se ha generado una contingencia para revisión administrativa.'
        : 'Envío recibido correctamente. El stock ha sido actualizado.',
      resumen: {
        totalItems: items.length,
        itemsConDiferencia: items.filter(item => {
          const itemEnvio = envio.items.find(i => i.id === item.itemEnvioId);
          return itemEnvio && itemEnvio.cantidad !== item.cantidadRecibida;
        }).length,
        diferencias: items.filter(item => {
          const itemEnvio = envio.items.find(i => i.id === item.itemEnvioId);
          return itemEnvio && itemEnvio.cantidad !== item.cantidadRecibida;
        }).map(item => {
          const itemEnvio = envio.items.find(i => i.id === item.itemEnvioId);
          return {
            item: itemEnvio?.producto?.nombre || itemEnvio?.insumo?.nombre,
            enviado: itemEnvio?.cantidad || 0,
            recibido: item.cantidadRecibida
          };
        }),
        recibidoPor: {
          rol: user.roleId,
          nombre: user.name,
          email: user.email,
          sucursal: user.roleId === 'role-vendedor' ? user.sucursalId : 'Admin - Sin restricción'
        }
      }
    });
    
  } catch (error: any) {
    console.error('Error al recibir envío en PDV:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Error al recibir envío',
        details: error.stack || 'Sin detalles adicionales'
      },
      { status: 500 }
    );
  }
}

// 🆕 GET MEJORADO PARA OBTENER DETALLES DEL ENVÍO ANTES DE RECEPCIÓN
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission(['envio:ver', 'envio:recibir'])(req);
  if (permissionError) return permissionError;
  
  try {
    const { id } = await params;
    const user = (req as any).user;
    
    const envio = await prisma.envio.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            producto: {
              include: {
                categoria: true
              }
            },
            insumo: true
          }
        },
        origen: true,
        destino: true,
        usuario: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!envio) {
      return NextResponse.json(
        { error: 'Envío no encontrado' },
        { status: 404 }
      );
    }
    
    // 🆕 VERIFICAR PERMISOS DIFERENCIADOS POR ROL
    if (user.roleId === 'role-vendedor') {
      // Vendedores solo pueden ver envíos dirigidos a su sucursal
      if (envio.destinoId !== user.sucursalId) {
        return NextResponse.json(
          { error: 'No tiene permiso para ver este envío' },
          { status: 403 }
        );
      }
    } else if (user.roleId === 'role-admin') {
      // Administradores pueden ver cualquier envío
      console.log(`[API PDV] Admin ${user.email} consultando envío ${id}`);
    } else {
      // Otros roles restringidos
      return NextResponse.json(
        { error: 'Su rol no tiene permisos para ver envíos' },
        { status: 403 }
      );
    }
    
    // 🆕 AGREGAR METADATOS ÚTILES PARA EL FRONTEND
    const estadosValidosParaRecepcion = ['enviado', 'en_transito'];
    const response = {
      ...envio,
      metadata: {
        puedeRecibir: estadosValidosParaRecepcion.includes(envio.estado),
        estadosValidosParaRecepcion,
        consultadoPor: {
          rol: user.roleId,
          nombre: user.name,
          restriccionSucursal: user.roleId === 'role-vendedor' ? user.sucursalId : null
        }
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('Error al obtener envío:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener envío' },
      { status: 500 }
    );
  }
}