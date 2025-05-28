// src/app/api/admin/afip/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { checkAllTokensStatus } from '@/server/jobs/renewAfipTokenJob';
import { AfipSoapClient } from '@/lib/afip/afipSoapClient';
import prisma from '@/server/db/client';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;
  
  try {
    console.log('[AFIP-STATUS] 📊 Obteniendo estado completo...');
    
    // 1. Estado de tokens
    const tokensStatus = await checkAllTokensStatus();
    
    // 2. Estado de configuraciones
    const configs = await prisma.configuracionAFIP.findMany({
      where: { activo: true },
      include: { sucursal: true }
    });
    
    // 3. Test de conectividad por configuración
    const conectividadPorConfig = [];
    
    for (const config of configs) {
      try {
        const client = new AfipSoapClient(config.cuit);
        
        // Test rápido
        const serverStatus = await client.getServerStatus();
        const ultimoNumero = await client.getLastInvoiceNumber(config.puntoVenta, 6);
        
        conectividadPorConfig.push({
          cuit: config.cuit,
          sucursal: config.sucursal.nombre,
          puntoVenta: config.puntoVenta,
          servidor: serverStatus.AppServer === 'OK' && serverStatus.DbServer === 'OK',
          ultimoComprobante: ultimoNumero,
          status: 'ok'
        });
      } catch (error) {
        conectividadPorConfig.push({
          cuit: config.cuit,
          sucursal: config.sucursal.nombre,
          puntoVenta: config.puntoVenta,
          status: 'error',
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }
    
    // 4. Estadísticas de facturas recientes
    const facturas24h = await prisma.facturaElectronica.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });
    
    const facturasExitosas24h = await prisma.facturaElectronica.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        estado: 'completada'
      }
    });
    
    const result = {
      timestamp: new Date().toISOString(),
      tokens: tokensStatus,
      configuraciones: {
        total: configs.length,
        activas: configs.filter(c => c.activo).length,
        detalles: configs.map(c => ({
          sucursal: c.sucursal.nombre,
          cuit: c.cuit,
          puntoVenta: c.puntoVenta,
          activo: c.activo
        }))
      },
      conectividad: conectividadPorConfig,
      estadisticas: {
        facturas24h,
        facturasExitosas24h,
        tasaExito: facturas24h > 0 ? ((facturasExitosas24h / facturas24h) * 100).toFixed(1) + '%' : 'N/A'
      },
      ambiente: process.env.AFIP_ENV || 'development',
      resumen: {
        status: conectividadPorConfig.every(c => c.status === 'ok') && tokensStatus.valid > 0 ? 'healthy' : 'warning',
        mensaje: conectividadPorConfig.every(c => c.status === 'ok') 
          ? '✅ Todos los sistemas funcionando correctamente'
          : '⚠️ Algunos sistemas presentan problemas'
      }
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[AFIP-STATUS] ❌ Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}