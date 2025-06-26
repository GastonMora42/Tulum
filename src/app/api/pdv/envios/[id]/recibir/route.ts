// src/app/api/pdv/envios/[id]/recibir/route.ts - VERSIÓN CORREGIDA PARA ADMIN Y VENDEDORES
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
    
    // 🆕 NUEVA LÓGICA: Diferente validación para vendedores vs administradores
    if (user.roleId === 'role-vendedor') {
      // 🔧 VALIDACIONES ESPECÍFICAS PARA VENDEDORES
      if (!user.sucursalId) {
        return NextResponse.json(
          { error: 'El vendedor debe tener una sucursal asignada para recibir envíos' },
          { status: 403 }
        );
      }
      
      // Verificar que el envío está dirigido a la sucursal del vendedor
      const envio = await prisma.envio.findUnique({
        where: { id },
        select: { destinoId: true, estado: true }
      });
      
      if (!envio) {
        return NextResponse.json(
          { error: 'Envío no encontrado' },
          { status: 404 }
        );
      }
      
      if (envio.destinoId !== user.sucursalId) {
        return NextResponse.json(
          { error: 'No tiene permiso para recibir este envío. El envío no está dirigido a su sucursal.' },
          { status: 403 }
        );
      }
      
      console.log(`[API PDV] Vendedor ${user.email} recibiendo envío para su sucursal ${user.sucursalId}`);
      
    } else if (user.roleId === 'role-admin') {
      // 🆕 LÓGICA PARA ADMINISTRADORES: Sin restricciones de sucursal
      console.log(`[API PDV] Administrador ${user.email} recibiendo envío ${id} - sin restricciones de sucursal`);
      
      // Solo verificar que el envío existe
      const envio = await prisma.envio.findUnique({
        where: { id },
        select: { id: true, estado: true, destinoId: true, destino: { select: { nombre: true } } }
      });
      
      if (!envio) {
        return NextResponse.json(
          { error: 'Envío no encontrado' },
          { status: 404 }
        );
      }
      
      console.log(`[API PDV] Admin recibiendo envío dirigido a: ${envio.destino?.nombre} (${envio.destinoId})`);
      
    } else {
      // Otros roles no permitidos
      return NextResponse.json(
        { error: 'Su rol no tiene permisos para recibir envíos' },
        { status: 403 }
      );
    }
    
    // Verificar que el envío existe y obtener detalles completos
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
        }).length,
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
      { error: error.message || 'Error al recibir envío' },
      { status: 500 }
    );
  }
}

// 🆕 GET MEJORADO PARA OBTENER DETALLES DEL ENVÍO ANTES DE RECEPCIÓN
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
    const response = {
      ...envio,
      metadata: {
        puedeRecibir: ['enviado', 'en_transito'].includes(envio.estado),
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