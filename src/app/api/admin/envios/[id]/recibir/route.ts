// src/app/api/admin/envios/[id]/recibir/route.ts - ENDPOINT ESPECÍFICO PARA ADMINISTRADORES
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';
import { envioService } from '@/server/services/envio/envioService';
import prisma from '@/server/db/client';

// Esquema de validación para recepción administrativa
const recepcionAdminSchema = z.object({
  items: z.array(
    z.object({
      itemEnvioId: z.string(),
      cantidadRecibida: z.number().nonnegative()
    })
  ),
  observaciones: z.string().optional(),
  forzarRecepcion: z.boolean().optional() // Para casos especiales
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // 🔧 VERIFICAR QUE SEA ADMINISTRADOR
  const user = (req as any).user;
  if (user.roleId !== 'role-admin') {
    return NextResponse.json(
      { error: 'Solo los administradores pueden usar este endpoint' },
      { status: 403 }
    );
  }
  
  try {
    const { id } = params;
    console.log(`[API ADMIN] Administrador ${user.email} procesando recepción de envío ${id}`);
    
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = recepcionAdminSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { items, observaciones, forzarRecepcion } = validation.data;
    console.log(`[API ADMIN] Items a recibir:`, items);
    console.log(`[API ADMIN] Forzar recepción:`, forzarRecepcion);
    
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
        origen: true,
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
    
    // 🆕 VERIFICACIONES ESPECIALES PARA ADMINISTRADORES
    console.log(`[API ADMIN] Envío encontrado:`);
    console.log(`[API ADMIN] - Estado: ${envio.estado}`);
    console.log(`[API ADMIN] - Origen: ${envio.origen.nombre}`);
    console.log(`[API ADMIN] - Destino: ${envio.destino.nombre}`);
    console.log(`[API ADMIN] - Items: ${envio.items.length}`);
    
    // Verificar estado del envío (más flexible para admins)
    const estadosValidos = ['enviado', 'en_transito'];
    if (forzarRecepcion) {
      // Con forzar recepción, también permitir algunos estados especiales
      estadosValidos.push('con_contingencia', 'pendiente');
    }
    
    if (!estadosValidos.includes(envio.estado)) {
      return NextResponse.json(
        { 
          error: `El envío no puede ser recibido porque está en estado ${envio.estado}. Estados válidos: ${estadosValidos.join(', ')}.`,
          suggestion: forzarRecepcion ? 'Ya está usando forzar recepción' : 'Use forzarRecepcion: true para casos especiales'
        },
        { status: 400 }
      );
    }
    
    // 🆕 VALIDACIONES DE SEGURIDAD PARA ADMINISTRADORES
    const diferenciasDetectadas = items.some(item => {
      const itemEnvio = envio.items.find(i => i.id === item.itemEnvioId);
      return itemEnvio && itemEnvio.cantidad !== item.cantidadRecibida;
    });
    
    const discrepanciasMayores = items.some(item => {
      const itemEnvio = envio.items.find(i => i.id === item.itemEnvioId);
      if (!itemEnvio) return false;
      const diferencia = Math.abs(itemEnvio.cantidad - item.cantidadRecibida);
      const porcentajeDiferencia = (diferencia / itemEnvio.cantidad) * 100;
      return porcentajeDiferencia > 20; // Más del 20% de diferencia
    });
    
    if (discrepanciasMayores && !forzarRecepcion) {
      return NextResponse.json(
        { 
          error: 'Se detectaron discrepancias mayores al 20%. Use forzarRecepcion: true para proceder.',
          details: {
            diferenciasDetectadas,
            requiereForzar: true
          }
        },
        { status: 400 }
      );
    }
    
    // 🆕 AGREGAR HEADER DE CONTEXTO ADMINISTRATIVO
    req.headers.set('x-context', 'admin-recepcion-envio');
    req.headers.set('x-admin-user', user.id);
    
    console.log(`[API ADMIN] Invocando envioService.recibirEnvio con contexto administrativo`);
    const resultado = await envioService.recibirEnvio({
      envioId: id,
      usuarioId: user.id,
      items,
      observaciones: observaciones ? 
        `[RECEPCIÓN ADMINISTRATIVA] ${observaciones}` : 
        '[RECEPCIÓN ADMINISTRATIVA] Procesado por administrador'
    });
    
    console.log(`[API ADMIN] Recepción administrativa completada exitosamente`);
    
    // 🆕 ESTADÍSTICAS DE LA RECEPCIÓN
    const estadisticas = {
      totalItems: items.length,
      itemsConDiferencia: items.filter(item => {
        const itemEnvio = envio.items.find(i => i.id === item.itemEnvioId);
        return itemEnvio && itemEnvio.cantidad !== item.cantidadRecibida;
      }).length,
      diferenciasDetectadas,
      discrepanciasMayores,
      forzadoPorAdmin: forzarRecepcion || false,
      recepcionAdministrativa: true
    };
    
    // 🆕 LOG ESPECIAL PARA AUDITORÍA
    console.log(`[AUDIT] Recepción administrativa completada:`);
    console.log(`[AUDIT] - Admin: ${user.name} (${user.email})`);
    console.log(`[AUDIT] - Envío: ${id}`);
    console.log(`[AUDIT] - Origen→Destino: ${envio.origen.nombre}→${envio.destino.nombre}`);
    console.log(`[AUDIT] - Estadísticas:`, estadisticas);
    
    return NextResponse.json({
      envio: resultado,
      estadisticas,
      message: diferenciasDetectadas
        ? 'Envío recibido por administrador con diferencias. Se ha generado contingencia para revisión.'
        : 'Envío recibido correctamente por administrador. Stock actualizado.',
      auditoria: {
        procesadoPor: 'Administrador',
        usuario: {
          id: user.id,
          nombre: user.name,
          email: user.email
        },
        fechaProceso: new Date(),
        contexto: 'recepcion-administrativa'
      }
    });
    
  } catch (error: any) {
    console.error('[API ADMIN] Error al recibir envío:', error);
    
    // 🆕 LOG DE ERROR PARA AUDITORÍA
    console.error(`[AUDIT-ERROR] Fallo en recepción administrativa:`);
    console.error(`[AUDIT-ERROR] - Admin: ${user.name} (${user.email})`);
    console.error(`[AUDIT-ERROR] - Envío: ${params.id}`);
    console.error(`[AUDIT-ERROR] - Error:`, error.message);
    
    return NextResponse.json(
      { 
        error: error.message || 'Error al recibir envío',
        context: 'admin-reception',
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}

// 🆕 ENDPOINT GET PARA VISTA PREVIA ADMINISTRATIVA
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const user = (req as any).user;
  if (user.roleId !== 'role-admin') {
    return NextResponse.json(
      { error: 'Solo los administradores pueden usar este endpoint' },
      { status: 403 }
    );
  }
  
  try {
    const { id } = params;
    
    const envio = await prisma.envio.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            producto: {
              include: {
                categoria: true,
                stocks: {
                  where: {
                    // Corregido: ubicacionId debe ser un string, así que usamos un filtro diferente
                    // para traer solo los stocks que tienen ubicacionId definido (no null)
                    // Prisma permite usar 'not' con undefined para filtrar los que no son null
                    ubicacionId: { not: undefined }
                  },
                  include: {
                    ubicacion: {
                      select: {
                        id: true,
                        nombre: true
                      }
                    }
                  }
                }
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
        },
        contingencias: {
          include: {
            usuario: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            fechaCreacion: 'desc'
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
    
    // 🆕 INFORMACIÓN ADMINISTRATIVA EXTENDIDA
    const adminMetadata = {
      puedeRecibir: ['enviado', 'en_transito', 'con_contingencia'].includes(envio.estado),
      requiereForzar: ['con_contingencia', 'pendiente'].includes(envio.estado),
      consultadoPor: {
        rol: 'Administrador',
        nombre: user.name,
        email: user.email
      },
      estadoDetallado: {
        actual: envio.estado,
        fechaCreacion: envio.fechaCreacion,
        fechaEnvio: envio.fechaEnvio,
        fechaRecepcion: envio.fechaRecepcion
      },
      stockDestino: await Promise.all(
        envio.items.map(async item => {
          if (!item.productoId) return null;
          
          const stockActual = await prisma.stock.findFirst({
            where: {
              productoId: item.productoId,
              ubicacionId: envio.destinoId
            }
          });
          
          return {
            productoId: item.productoId,
            stockActual: stockActual?.cantidad || 0
          };
        })
      ).then(results => results.filter(Boolean))
    };
    
    return NextResponse.json({
      ...envio,
      adminMetadata
    });
    
  } catch (error: any) {
    console.error('[API ADMIN] Error al obtener envío:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener envío' },
      { status: 500 }
    );
  }
}