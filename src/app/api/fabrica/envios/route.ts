// src/app/api/fabrica/envios/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    // Obtener usuario
    const user = (req as any).user;
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }
    
    // Identificar si es admin para privilegios especiales
    const isAdmin = user.roleId === 'role-admin';
    
    // Determinar la ubicación de fábrica correcta
    let fabricaId: string;
    
    // Si el usuario tiene sucursalId, verificar si es una fábrica
    if (user.sucursalId) {
      const sucursalUsuario = await prisma.ubicacion.findUnique({
        where: { id: user.sucursalId }
      });
      
      if (sucursalUsuario && sucursalUsuario.tipo === 'fabrica') {
        fabricaId = user.sucursalId;
      } else if (!isAdmin) {
        return NextResponse.json(
          { error: 'El usuario no está asignado a una fábrica' },
          { status: 403 }
        );
      } else {
        fabricaId = 'ubicacion-fabrica';
      }
    } else {
      if (isAdmin || user.roleId === 'role-fabrica') {
        fabricaId = 'ubicacion-fabrica';
      } else {
        return NextResponse.json(
          { error: 'El usuario no tiene permisos para acceder a la fábrica' },
          { status: 403 }
        );
      }
    }
    
    // Verificar que la ubicación de fábrica existe
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
    
    // Obtener parámetros de filtrado
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get('estado');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Construir consulta
    const where: any = {
      OR: [
        { origenId: fabricaId },  // Envíos desde la fábrica
        { destinoId: fabricaId }  // Envíos hacia la fábrica
      ]
    };
    
    // Filtrar por estado si se proporciona
    if (estado) {
      where.estado = estado;
    }
    
    console.log(`Buscando envíos para la fábrica: ${fabricaVerificada.nombre} (${fabricaId})`);
    
    // Ejecutar consulta
    const envios = await prisma.envio.findMany({
      where,
      take: limit,
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
            insumo: true,
            producto: true
          }
        }
      },
      orderBy: {
        fechaCreacion: 'desc'
      }
    });
    
    console.log(`Se encontraron ${envios.length} envíos para la fábrica`);
    
    return NextResponse.json(envios);
  } catch (error: any) {
    console.error('Error detallado al obtener envíos:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener envíos' },
      { status: 500 }
    );
  }
}