// MEJORAS EN API: src/app/api/pdv/facturas/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import prisma from '@/server/db/client';

interface RouteParams {
  params: {
    id: string;
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  // Autenticar
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const { id } = params;
    
    console.log(`📊 [API] Obteniendo factura ${id}...`);
    
    // 🔧 MEJORAR QUERY PARA INCLUIR TODOS LOS DATOS NECESARIOS
    const factura = await prisma.facturaElectronica.findUnique({
      where: { id },
      include: {
        venta: {
          include: {
            items: {
              include: {
                producto: {
                  select: {
                    id: true,
                    nombre: true,
                    precio: true,
                    descripcion: true,
                    codigoBarras: true
                  }
                }
              },
              orderBy: {
                id: 'asc' // Mantener orden consistente
              }
            },
            sucursal: {
              select: {
                id: true,
                nombre: true,
                direccion: true,
                telefono: true
              }
            },
            pagos: {
              select: {
                id: true,
                medioPago: true,
                monto: true,
                referencia: true,
                datosPago: true
              }
            },
            usuario: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        sucursal: {
          include: {
            configuracionAFIP: {
              select: {
                cuit: true,
                puntoVenta: true
              }
            }
          }
        }
      }
    });
    
    if (!factura) {
      console.warn(`⚠️ [API] Factura no encontrada: ${id}`);
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }
    
    console.log(`✅ [API] Factura encontrada: ${factura.id}`);
    console.log(`📋 [API] Estado: ${factura.estado}, Items: ${factura.venta.items.length}`);
    
    // 🔧 FORMATEAR RESPUESTA PARA ASEGURAR COMPATIBILIDAD CON IMPRESORA
    const response = {
      // Datos de la factura
      id: factura.id,
      ventaId: factura.ventaId,
      tipoComprobante: factura.tipoComprobante,
      puntoVenta: factura.puntoVenta,
      numeroFactura: factura.numeroFactura,
      fechaEmision: factura.fechaEmision,
      cae: factura.cae,
      vencimientoCae: factura.vencimientoCae,
      estado: factura.estado,
      qrData: factura.qrData,
      
      // Datos de la venta (estructura garantizada)
      venta: {
        id: factura.venta.id,
        fecha: factura.venta.fecha,
        total: factura.venta.total,
        descuento: factura.venta.descuento,
        clienteNombre: factura.venta.clienteNombre,
        clienteCuit: factura.venta.clienteCuit,
        facturada: factura.venta.facturada,
        
        // Items con estructura garantizada
        items: factura.venta.items.map(item => ({
          id: item.id,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          descuento: item.descuento || 0,
          producto: {
            id: item.producto.id,
            nombre: item.producto.nombre,
            precio: item.producto.precio,
            descripcion: item.producto.descripcion || '',
            codigoBarras: item.producto.codigoBarras || ''
          },
          // Calcular subtotal
          subtotal: item.cantidad * item.precioUnitario * (1 - (item.descuento || 0) / 100)
        })),
        
        // Datos de la sucursal
        sucursal: {
          id: factura.venta.sucursal.id,
          nombre: factura.venta.sucursal.nombre,
          direccion: factura.venta.sucursal.direccion,
          telefono: factura.venta.sucursal.telefono
        },
        
        // Datos de pagos
        pagos: factura.venta.pagos.map(pago => ({
          id: pago.id,
          medioPago: pago.medioPago,
          monto: pago.monto,
          referencia: pago.referencia,
          datosPago: pago.datosPago
        })),
        
        // Usuario que realizó la venta
        usuario: {
          id: factura.venta.usuario.id,
          name: factura.venta.usuario.name,
          email: factura.venta.usuario.email
        }
      },
      
      // Datos de la sucursal (para compatibilidad)
      sucursal: {
        id: factura.sucursal.id,
        nombre: factura.sucursal.nombre,
        configuracionAFIP: factura.sucursal.configuracionAFIP
      },
      
      // 🔧 DATOS ADICIONALES PARA IMPRESIÓN
      cuit: factura.sucursal.configuracionAFIP?.cuit || null,
      
      // Metadatos
      createdAt: factura.createdAt,
      updatedAt: factura.updatedAt,
      
      // 🔧 VALIDACIÓN DE DATOS PARA IMPRESIÓN
      _validacion: {
        tieneItems: factura.venta.items.length > 0,
        tieneTotal: factura.venta.total > 0,
        tieneCAE: !!factura.cae,
        estadoCompleto: factura.estado === 'completada',
        datosCompletos: !!(
          factura.id &&
          factura.venta &&
          factura.venta.items.length > 0 &&
          factura.venta.total > 0 &&
          factura.venta.sucursal
        )
      }
    };
    
    // 🔧 LOGGING PARA DEBUGGING
    console.log(`📊 [API] Respuesta preparada:`, {
      facturaId: response.id,
      estado: response.estado,
      itemsCount: response.venta.items.length,
      total: response.venta.total,
      tieneCAE: !!response.cae,
      datosCompletos: response._validacion.datosCompletos
    });
    
    // 🔧 ADVERTENCIAS SI HAY DATOS FALTANTES
    if (!response._validacion.datosCompletos) {
      console.warn(`⚠️ [API] Datos incompletos para factura ${id}:`, {
        tieneId: !!response.id,
        tieneVenta: !!response.venta,
        tieneItems: response.venta.items.length > 0,
        tieneTotal: response.venta.total > 0,
        tieneSucursal: !!response.venta.sucursal
      });
    }
    
    if (response.estado === 'procesando') {
      console.log(`⏳ [API] Factura ${id} aún en procesamiento`);
    }
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error(`❌ [API] Error al obtener factura ${params.id}:`, error);
    return NextResponse.json(
      { 
        error: 'Error al obtener factura',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
