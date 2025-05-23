// src/app/api/admin/facturas/diagnostico-avanzado/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import prisma from '@/server/db/client';
import { getFacturacionService } from '@/server/services/facturacion/factoryService';

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;

  try {
    const body = await req.json();
    const { facturaId, accion } = body;

    const resultado: any = {
      timestamp: new Date().toISOString(),
      accion,
      datos: {}
    };

    if (accion === 'verificar-factura' && facturaId) {
      // 1. VERIFICAR FACTURA EN BD
      const factura = await prisma.facturaElectronica.findUnique({
        where: { id: facturaId },
        include: {
          venta: {
            include: {
              items: { include: { producto: true } },
              sucursal: true
            }
          },
          sucursal: true
        }
      });

      if (!factura) {
        return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
      }

      resultado.datos.factura = {
        id: factura.id,
        estado: factura.estado,
        tipoComprobante: factura.tipoComprobante,
        puntoVenta: factura.puntoVenta,
        numeroFactura: factura.numeroFactura,
        cae: factura.cae,
        error: factura.error,
        createdAt: factura.createdAt,
        updatedAt: factura.updatedAt,
        logs: factura.logs
      };

      // 2. VERIFICAR CONFIGURACIÓN AFIP
      const configAFIP = await prisma.configuracionAFIP.findFirst({
        where: {
          sucursalId: factura.sucursalId,
          activo: true
        }
      });

      resultado.datos.configuracionAFIP = configAFIP ? {
        existe: true,
        cuit: configAFIP.cuit,
        puntoVenta: configAFIP.puntoVenta,
        activo: configAFIP.activo
      } : { existe: false };

      // 3. VERIFICAR VENTA
      resultado.datos.venta = {
        id: factura.venta.id,
        total: factura.venta.total,
        sucursalId: factura.venta.sucursalId,
        clienteNombre: factura.venta.clienteNombre,
        clienteCuit: factura.venta.clienteCuit,
        itemsCount: factura.venta.items.length
      };

      // 4. VERIFICAR CONECTIVIDAD AFIP
      if (configAFIP) {
        try {
          const facturacionService = await getFacturacionService(factura.sucursalId);
          const conectividad = await facturacionService.diagnosticarConectividad();
          resultado.datos.conectividadAFIP = conectividad;
        } catch (error) {
          resultado.datos.conectividadAFIP = {
            error: error instanceof Error ? error.message : 'Error desconocido'
          };
        }
      }

      // 5. ANALIZAR LOGS
      if (factura.logs) {
        const logs = factura.logs.split('\n');
        resultado.datos.analisisLogs = {
          totalLineas: logs.length,
          ultimasLineas: logs.slice(-5),
          tieneErrores: logs.some(log => log.includes('❌') || log.includes('ERROR')),
          tieneExitos: logs.some(log => log.includes('✅') || log.includes('SUCCESS'))
        };
      }

    } else if (accion === 'test-conectividad') {
      // TEST DE CONECTIVIDAD GENERAL
      const configuraciones = await prisma.configuracionAFIP.findMany({
        where: { activo: true },
        include: { sucursal: true }
      });

      for (const config of configuraciones) {
        try {
          const facturacionService = await getFacturacionService(config.sucursalId);
          const conectividad = await facturacionService.diagnosticarConectividad();
          
          resultado.datos[config.sucursal.nombre] = {
            cuit: config.cuit,
            puntoVenta: config.puntoVenta,
            conectividad
          };
        } catch (error) {
          resultado.datos[config.sucursal.nombre] = {
            cuit: config.cuit,
            error: error instanceof Error ? error.message : 'Error desconocido'
          };
        }
      }

    } else if (accion === 'facturas-problemáticas') {
      // BUSCAR FACTURAS CON PROBLEMAS
      const facturas = await prisma.facturaElectronica.findMany({
        where: {
          OR: [
            { estado: 'procesando', updatedAt: { lt: new Date(Date.now() - 10 * 60 * 1000) } },
            { estado: 'error' },
            { AND: [{ estado: 'completada' }, { cae: null }] },
            { AND: [{ estado: 'completada' }, { cae: '' }] }
          ]
        },
        include: {
          venta: { select: { total: true, clienteNombre: true } },
          sucursal: { select: { nombre: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 20
      });

      resultado.datos.facturasProblematicas = facturas.map(f => ({
        id: f.id,
        estado: f.estado,
        cae: f.cae,
        error: f.error,
        updatedAt: f.updatedAt,
        sucursal: f.sucursal?.nombre,
        ventaTotal: f.venta?.total,
        cliente: f.venta?.clienteNombre,
        minutosDesdeUpdate: Math.round((Date.now() - f.updatedAt.getTime()) / 1000 / 60)
      }));
    }

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Error en diagnóstico avanzado:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}