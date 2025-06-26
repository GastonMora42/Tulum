// src/app/api/pdv/envios/[id]/recibir/route.ts - NUEVA API PARA PDV
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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // 🔧 VERIFICAR PERMISO ESPECÍFICO PARA RECEPCIÓN DE ENVÍOS
  const permissionError = await checkPermission('envio:recibir')(req);
  if (permissionError) return permissionError;
  
  try {
    const { id } = params;
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
    
    // 🔧 VALIDAR QUE EL USUARIO SEA VENDEDOR Y TENGA SUCURSAL ASIGNADA
    if (user.roleId === 'role-vendedor' && !user.sucursalId) {
      return NextResponse.json(
        { error: 'El vendedor debe tener una sucursal asignada para recibir envíos' },
        { status: 403 }
      );
    }
    
    // Verificar que el envío existe
    const envio = await prisma.envio.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            producto: true,
            insumo: true
          }
        },
        destino: true,
        origen: true
      }
    });
    
    if (!envio) {
      return NextResponse.json(
        { error: 'Envío no encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar estado del envío
    if (envio.estado !== 'enviado' && envio.estado !== 'en_transito') {
      return NextResponse.json(
        { error: `El envío no puede ser recibido porque está en estado ${envio.estado}. Los estados válidos son 'enviado' y 'en_transito'.` },
        { status: 400 }
      );
    }
    
    // 🔧 VERIFICAR QUE EL DESTINO COINCIDE CON LA SUCURSAL DEL VENDEDOR (PARA VENDEDORES)
    if (user.roleId === 'role-vendedor') {
      const userSucursalId = user.sucursalId;
      
      if (envio.destinoId !== userSucursalId) {
        return NextResponse.json(
          { error: 'No tiene permiso para recibir este envío. El envío no está dirigido a su sucursal.' },
          { status: 403 }
        );
      }
    }
    
    // 🆕 AGREGAR HEADER DE CONTEXTO PARA EL SERVICIO DE STOCK
    req.headers.set('x-context', 'envio-recepcion');
    
    console.log(`[API PDV] Invocando envioService.recibirEnvio para el envío ${id}`);
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
    
    return NextResponse.json({
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
        }).length
      }
    });
    
  } catch (error: any) {
    console.error('Error al recibir envío en PDV:', error);
    return NextResponse.json(
      { error: error.message || 'Error al recibir envío' },
      { status: 500 }
    );
  }
}

// 🆕 GET PARA OBTENER DETALLES DEL ENVÍO ANTES DE RECEPCIÓN
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('envio:ver')(req);
  if (permissionError) return permissionError;
  
  try {
    const { id } = params;
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
    
    // Verificar permisos para vendedores
    if (user.roleId === 'role-vendedor' && envio.destinoId !== user.sucursalId) {
      return NextResponse.json(
        { error: 'No tiene permiso para ver este envío' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(envio);
    
  } catch (error: any) {
    console.error('Error al obtener envío:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener envío' },
      { status: 500 }
    );
  }
}