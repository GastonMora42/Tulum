// src/app/api/fabrica/envios-pendientes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    // Obtener usuario de la solicitud
    const user = (req as any).user;
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }
    
    // Identificar si es admin para privilegios especiales
    const isAdmin = user.roleId === 'role-admin';
    
    // PASO 1: Determinar la ubicación de fábrica correcta
    let fabricaId: string;
    
    // Si el usuario tiene sucursalId, verificar si es una fábrica
    if (user.sucursalId) {
      const sucursalUsuario = await prisma.ubicacion.findUnique({
        where: { id: user.sucursalId }
      });
      
      // Si la ubicación del usuario es de tipo 'fabrica', usarla
      if (sucursalUsuario && sucursalUsuario.tipo === 'fabrica') {
        fabricaId = user.sucursalId;
      } 
      // Si no es fábrica y no es admin, error
      else if (!isAdmin) {
        return NextResponse.json(
          { error: 'El usuario no está asignado a una fábrica' },
          { status: 403 }
        );
      }
      // Admin con sucursal que no es fábrica - usar la fábrica predeterminada
      else {
        fabricaId = 'ubicacion-fabrica';
      }
    } 
    // Usuario sin sucursalId
    else {
      // Si es admin, permitir acceso a la fábrica predeterminada
      if (isAdmin) {
        fabricaId = 'ubicacion-fabrica';
      }
      // Si no es admin pero tiene rol de fábrica, usar la fábrica predeterminada
      else if (user.roleId === 'role-fabrica') {
        fabricaId = 'ubicacion-fabrica';
        // Opcional: Asignar la fábrica al usuario para futuras consultas
        await prisma.user.update({
          where: { id: user.id },
          data: { sucursalId: fabricaId }
        });
        console.log(`Usuario ${user.id} actualizado con ubicación de fábrica predeterminada`);
      }
      // Si no es admin ni tiene rol de fábrica, error
      else {
        return NextResponse.json(
          { error: 'El usuario no tiene permisos para acceder a la fábrica' },
          { status: 403 }
        );
      }
    }
    
    // PASO 2: Verificar que la ubicación de fábrica existe
    const fabricaVerificada = await prisma.ubicacion.findUnique({
      where: { id: fabricaId }
    });
    
    if (!fabricaVerificada) {
      console.error(`No se encontró la ubicación de fábrica con ID: ${fabricaId}`);
      return NextResponse.json(
        { error: 'No se encontró la ubicación de fábrica' },
        { status: 404 }
      );
    }
    
    console.log(`Buscando envíos pendientes para la fábrica: ${fabricaVerificada.nombre} (${fabricaId})`);
    
    // PASO 3: Obtener los envíos pendientes para la fábrica
    const envios = await prisma.envio.findMany({
      where: {
        destinoId: fabricaId,
        estado: 'enviado', // Solo los que están en estado enviado y pendientes de recepción
        items: {
          some: {
            insumoId: { not: null } // Solo envíos de insumos
          }
        }
      },
      include: {
        origen: true,
        destino: true,
        usuario: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            insumo: true
          }
        }
      },
      orderBy: {
        fechaEnvio: 'desc'
      }
    });
    
    console.log(`Se encontraron ${envios.length} envíos pendientes para la fábrica`);
    
    return NextResponse.json(envios);
  } catch (error: any) {
    console.error('Error detallado al obtener envíos pendientes:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener envíos pendientes' },
      { status: 500 }
    );
  }
}