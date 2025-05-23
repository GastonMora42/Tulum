// src/app/api/admin/facturas/debug-afip/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { AfipDebugService } from '@/server/services/facturacion/afipDebugService';
import prisma from '@/server/db/client';

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;

  try {
    const body = await req.json();
    const { accion, cuit, facturaId } = body;

    let resultado;

    switch (accion) {
      case 'test-conectividad-completa':
        if (!cuit) {
          // Obtener CUIT de configuración
          const config = await prisma.configuracionAFIP.findFirst({
            where: { activo: true }
          });
          if (!config) {
            throw new Error('No hay configuración AFIP activa');
          }
          resultado = await AfipDebugService.testConectividadCompleta(config.cuit);
        } else {
          resultado = await AfipDebugService.testConectividadCompleta(cuit);
        }
        break;

      case 'debug-factura':
        if (!facturaId) {
          throw new Error('Se requiere facturaId');
        }
        resultado = await AfipDebugService.debugFacturaEspecifica(facturaId);
        break;

      case 'verificar-configuracion':
        const configs = await prisma.configuracionAFIP.findMany({
          where: { activo: true },
          include: { sucursal: true }
        });
        
        resultado = {
          configuraciones: configs.map(c => ({
            sucursal: c.sucursal.nombre,
            cuit: c.cuit,
            puntoVenta: c.puntoVenta,
            activo: c.activo
          })),
          variables_entorno: {
            AFIP_ENV: process.env.AFIP_ENV,
            AFIP_CERT_LENGTH: process.env.AFIP_CERT?.length || 0,
            AFIP_KEY_LENGTH: process.env.AFIP_KEY?.length || 0,
            AFIP_CUIT: process.env.AFIP_CUIT
          }
        };
        break;

        case 'test-autenticacion':
            if (!cuit) {
              const config = await prisma.configuracionAFIP.findFirst({
                where: { activo: true }
              });
              if (!config) throw new Error('No hay configuración AFIP activa');
              resultado = await AfipDebugService.testAutenticacionManual(config.cuit);
            } else {
              resultado = await AfipDebugService.testAutenticacionManual(cuit);
            }
            break;
        
          case 'test-ultimo-comprobante':
            const { puntoVenta = 1 } = body;
            if (!cuit) {
              const config = await prisma.configuracionAFIP.findFirst({
                where: { activo: true }
              });
              if (!config) throw new Error('No hay configuración AFIP activa');
              resultado = await AfipDebugService.testUltimoComprobante(config.cuit, config.puntoVenta);
            } else {
              resultado = await AfipDebugService.testUltimoComprobante(cuit, puntoVenta);
            }
            break;
        

      default:
        throw new Error('Acción no válida');
    }

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Error en debug AFIP:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}