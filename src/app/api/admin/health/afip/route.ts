// src/app/api/admin/health/afip/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import prisma from '@/server/db/client';
import { AfipSoapClient } from '@/lib/afip/afipSoapClient';

export async function POST(req: NextRequest) {
  // Autenticar
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permisos
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;

  try {
    console.log('[HEALTH] Iniciando health check de AFIP...');

    // 1. Verificar configuraciones AFIP
    const configuraciones = await prisma.configuracionAFIP.findMany({
      where: { activo: true },
      include: { sucursal: true }
    });

    if (configuraciones.length === 0) {
      return NextResponse.json({
        connectivity: 'error',
        certificates: 'error',
        authentication: 'error',
        lastToken: 'error',
        message: 'No hay configuraciones AFIP activas',
        recommendations: ['Configurar al menos una sucursal con datos AFIP']
      });
    }

    console.log(`[HEALTH] Encontradas ${configuraciones.length} configuraciones`);

    // Usar la primera configuración para el test
    const config = configuraciones[0];
    let connectivity = 'error';
    let certificates = 'error';
    let authentication = 'error';
    let lastToken = 'error';
    let recommendations: string[] = [];
    let details: any = {};

    // 2. Test de conectividad (URLs de AFIP)
    try {
      console.log('[HEALTH] Probando conectividad...');
      const isProduction = process.env.AFIP_ENV === 'production';
      
      const wsfeUrl = isProduction
        ? 'https://servicios1.afip.gob.ar/wsfev1/service.asmx?WSDL'
        : 'https://wswhomo.afip.gob.ar/wsfev1/service.asmx?WSDL';

      const response = await fetch(wsfeUrl, { 
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10 segundos timeout
      });

      if (response.ok) {
        connectivity = 'ok';
        console.log('[HEALTH] ✅ Conectividad OK');
      } else {
        connectivity = 'warning';
        recommendations.push(`HTTP ${response.status} al conectar con AFIP`);
      }
      
      details.connectivity = {
        url: wsfeUrl,
        status: response.status,
        ambiente: isProduction ? 'producción' : 'homologación'
      };
    } catch (connError) {
      console.error('[HEALTH] Error conectividad:', connError);
      recommendations.push('No se puede conectar a servidores de AFIP');
      details.connectivity = {
        error: connError instanceof Error ? connError.message : 'Error desconocido'
      };
    }

    // 3. Test de certificados
    try {
      console.log('[HEALTH] Verificando certificados...');
      const cert = process.env.AFIP_CERT;
      const key = process.env.AFIP_KEY;

      if (!cert || !key) {
        certificates = 'error';
        recommendations.push('Certificados AFIP no configurados en variables de entorno');
      } else {
        const certPem = Buffer.from(cert, 'base64').toString('utf8');
        const keyPem = Buffer.from(key, 'base64').toString('utf8');

        const certValid = certPem.includes('-----BEGIN CERTIFICATE-----');
        const keyValid = keyPem.includes('-----BEGIN PRIVATE KEY-----');

        if (certValid && keyValid) {
          certificates = 'ok';
          console.log('[HEALTH] ✅ Certificados OK');
        } else {
          certificates = 'error';
          recommendations.push('Certificados tienen formato inválido');
        }

        details.certificates = {
          certFormat: certValid,
          keyFormat: keyValid,
          certLength: cert.length,
          keyLength: key.length
        };
      }
    } catch (certError) {
      console.error('[HEALTH] Error certificados:', certError);
      certificates = 'error';
      recommendations.push('Error al verificar certificados');
    }

    // 4. Test de autenticación AFIP
    try {
      console.log('[HEALTH] Probando autenticación...');
      const client = new AfipSoapClient(config.cuit);
      const auth = await client.getAuth();
      
      if (auth.Token && auth.Sign) {
        authentication = 'ok';
        console.log('[HEALTH] ✅ Autenticación OK');
        
        details.authentication = {
          tokenLength: auth.Token.length,
          signLength: auth.Sign.length,
          cuit: config.cuit
        };
      } else {
        authentication = 'error';
        recommendations.push('No se pudo obtener token de autenticación de AFIP');
      }
    } catch (authError) {
      console.error('[HEALTH] Error autenticación:', authError);
      authentication = 'error';
      recommendations.push(`Error de autenticación: ${authError instanceof Error ? authError.message : 'Error desconocido'}`);
      
      details.authentication = {
        error: authError instanceof Error ? authError.message : 'Error desconocido'
      };
    }

    // 5. Verificar tokens en BD
    try {
      console.log('[HEALTH] Verificando tokens en BD...');
      const tokens = await prisma.tokenAFIP.findMany({
        where: { cuit: config.cuit }
      });

      const validTokens = tokens.filter(t => t.expirationTime > new Date());
      
      if (validTokens.length > 0) {
        lastToken = 'ok';
        const nextExpiry = validTokens[0].expirationTime;
        const hoursUntilExpiry = (nextExpiry.getTime() - Date.now()) / (1000 * 60 * 60);
        
        details.lastToken = {
          count: validTokens.length,
          nextExpiry: nextExpiry.toISOString(),
          hoursUntilExpiry: Math.round(hoursUntilExpiry * 10) / 10
        };
        
        if (hoursUntilExpiry < 2) {
          lastToken = 'warning';
          recommendations.push('Token AFIP expira pronto (menos de 2 horas)');
        }
      } else {
        lastToken = 'warning';
        recommendations.push('No hay tokens AFIP válidos en base de datos');
        
        details.lastToken = {
          count: 0,
          totalTokens: tokens.length
        };
      }
    } catch (tokenError) {
      console.error('[HEALTH] Error verificando tokens:', tokenError);
      lastToken = 'error';
      recommendations.push('Error al verificar tokens en base de datos');
    }

    // 6. Generar recomendaciones adicionales
    if (connectivity === 'ok' && certificates === 'ok' && authentication === 'ok') {
      if (recommendations.length === 0) {
        recommendations.push('✅ Sistema AFIP funcionando correctamente');
      }
    } else {
      if (connectivity === 'error') {
        recommendations.push('🔴 Verificar conexión a internet y URLs de AFIP');
      }
      if (certificates === 'error') {
        recommendations.push('🔴 Regenerar certificados AFIP desde el portal');
      }
      if (authentication === 'error') {
        recommendations.push('🔴 Verificar CUIT y certificados en AFIP');
      }
    }

    console.log('[HEALTH] Health check completado');

    return NextResponse.json({
      connectivity,
      certificates,
      authentication,
      lastToken,
      recommendations,
      details,
      configuraciones: configuraciones.map(c => ({
        sucursal: c.sucursal.nombre,
        cuit: c.cuit,
        puntoVenta: c.puntoVenta
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[HEALTH] Error general:', error);
    return NextResponse.json({
      connectivity: 'error',
      certificates: 'error',
      authentication: 'error',
      lastToken: 'error',
      error: error instanceof Error ? error.message : 'Error desconocido',
      recommendations: ['Error interno del sistema - revisar logs del servidor']
    }, { status: 500 });
  }
}