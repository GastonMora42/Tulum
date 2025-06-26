// src/app/api/envios/route.ts - VERSIÓN CORREGIDA PARA PDV
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(req.url);
    const user = (req as any).user;
    
    // Parámetros de filtro
    const origenId = searchParams.get('origenId');
    const destinoId = searchParams.get('destinoId');
    const estado = searchParams.get('estado');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    console.log(`[API ENVIOS] Usuario ${user.email} (${user.roleId}) consultando envíos`);
    console.log(`[API ENVIOS] Filtros: origen=${origenId}, destino=${destinoId}, estado=${estado}`);
    
    // Construir consulta base
    const where: any = {};
    
    // 🔧 FILTROS DIFERENCIADOS POR ROL
    if (user.roleId === 'role-vendedor') {
      // 🆕 VENDEDORES: Solo ven envíos dirigidos a su sucursal
      if (!user.sucursalId) {
        return NextResponse.json(
          { error: 'Vendedor sin sucursal asignada' },
          { status: 400 }
        );
      }
      
      // Forzar que solo vea envíos dirigidos a su sucursal
      where.destinoId = user.sucursalId;
      console.log(`[API ENVIOS] Vendedor restringido a sucursal: ${user.sucursalId}`);
      
    } else if (user.roleId === 'role-admin') {
      // 🆕 ADMINISTRADORES: Pueden ver todos los envíos
      console.log(`[API ENVIOS] Admin - acceso completo a todos los envíos`);
      
      // Aplicar filtros opcionales solo si se proporcionan
      if (origenId) {
        where.origenId = origenId;
      }
      if (destinoId) {
        where.destinoId = destinoId;
      }
      
    } else if (user.roleId === 'role-fabrica') {
      // 🆕 OPERADORES DE FÁBRICA: Solo ven envíos que salen de fábrica
      if (!user.sucursalId) {
        // Si no tiene sucursal asignada, buscar fábricas
        const fabricas = await prisma.ubicacion.findMany({
          where: { tipo: 'fabrica' }
        });
        
        if (fabricas.length > 0) {
          where.origenId = { in: fabricas.map(f => f.id) };
        }
      } else {
        where.origenId = user.sucursalId;
      }
      
      console.log(`[API ENVIOS] Operador fábrica - envíos desde fábrica`);
      
    } else {
      // Otros roles sin acceso
      return NextResponse.json(
        { error: 'Su rol no tiene permisos para ver envíos' },
        { status: 403 }
      );
    }
    
    // 🔧 APLICAR FILTRO DE ESTADO
    if (estado) {
      // Si estado contiene comas, dividir y buscar múltiples estados
      if (estado.includes(',')) {
        where.estado = { in: estado.split(',').map(s => s.trim()) };
      } else {
        where.estado = estado;
      }
    }
    
    console.log('🔍 Consulta final de envíos:', JSON.stringify(where, null, 2));
    
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
            producto: {
              include: {
                categoria: true
              }
            }
          }
        }
      },
      orderBy: [
        { estado: 'asc' }, // Pendientes primero
        { fechaCreacion: 'desc' }
      ]
    });
    
    console.log(`[API ENVIOS] Se encontraron ${envios.length} envíos para el usuario`);
    
    // 🆕 AGREGAR METADATOS ÚTILES PARA EL FRONTEND
    const enviosConMetadata = envios.map(envio => ({
      ...envio,
      metadata: {
        puedeRecibir: ['enviado', 'en_transito'].includes(envio.estado) && 
                     (user.roleId === 'role-admin' || envio.destinoId === user.sucursalId),
        puedeMarcarEnviado: envio.estado === 'pendiente' && 
                           (user.roleId === 'role-admin' || envio.origenId === user.sucursalId),
        esDelUsuario: envio.usuarioId === user.id,
        consultadoPor: {
          rol: user.roleId,
          sucursalId: user.sucursalId
        }
      }
    }));
    
    return NextResponse.json(enviosConMetadata);
    
  } catch (error: any) {
    console.error('Error al obtener envíos:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Error al obtener envíos',
        details: error.stack || 'Sin detalles adicionales'
      },
      { status: 500 }
    );
  }
}