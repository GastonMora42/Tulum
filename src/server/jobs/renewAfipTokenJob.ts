// src/server/jobs/renewAfipTokenJob.ts - VERSIÓN CORREGIDA
import { AfipSoapClient } from '@/lib/afip/afipSoapClient';
import prisma from '@/server/db/client';

export async function renewAfipTokens(): Promise<{
  success: boolean;
  renewed: number;
  errors: number;
  details?: any[];
}> {
  console.log('[AFIP-RENEW] 🚀 Iniciando renovación automática de tokens AFIP');
  
  try {
    // Obtener todas las configuraciones activas
    const configuraciones = await prisma.configuracionAFIP.findMany({
      where: { activo: true },
      include: { sucursal: true }
    });
    
    console.log(`[AFIP-RENEW] 📋 Encontradas ${configuraciones.length} configuraciones activas`);
    
    if (configuraciones.length === 0) {
      return {
        success: true,
        renewed: 0,
        errors: 0,
        details: [{ message: 'No hay configuraciones AFIP activas' }]
      };
    }
    
    let renewed = 0;
    let errors = 0;
    const details: any[] = [];
    
    // Procesar cada configuración
    for (const config of configuraciones) {
      try {
        console.log(`[AFIP-RENEW] 🔄 Procesando CUIT ${config.cuit} - ${config.sucursal.nombre}`);
        
        // 🔧 CORRECCIÓN: Buscar token existente con manejo de null
        const tokenExistente = await prisma.tokenAFIP.findFirst({
          where: { cuit: config.cuit }
        });
        
        // Calcular si necesita renovación (si falta menos de 6 horas)
        const now = new Date();
        const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
        
        let needsRenewal = false;
        let hoursUntilExpiry = 0;
        
        // 🔧 CORRECCIÓN: Verificación null explícita
        if (tokenExistente === null) {
          needsRenewal = true;
          console.log(`[AFIP-RENEW] ❗ No hay token para CUIT ${config.cuit}`);
        } else {
          hoursUntilExpiry = (tokenExistente.expirationTime.getTime() - now.getTime()) / (1000 * 60 * 60);
          needsRenewal = tokenExistente.expirationTime <= sixHoursFromNow;
          
          console.log(`[AFIP-RENEW] ⏰ Token para CUIT ${config.cuit} expira en ${hoursUntilExpiry.toFixed(1)} horas`);
        }
        
        if (needsRenewal) {
          console.log(`[AFIP-RENEW] 🔐 Renovando token para CUIT ${config.cuit}...`);
          
          // Crear cliente AFIP y forzar renovación
          const client = new AfipSoapClient(config.cuit);
          
          // ✨ Verificar conectividad antes de intentar renovar
          const conectividad = await client.verificarConectividad();
          
          if (!conectividad.servidor || !conectividad.autenticacion) {
            throw new Error(`Falla conectividad: Servidor=${conectividad.servidor}, Auth=${conectividad.autenticacion}`);
          }
          
          // Intentar obtener auth (esto fuerza la renovación)
          const auth = await client.getAuth();
          
          // Verificar que se obtuvo correctamente
          if (!auth.Token || !auth.Sign) {
            throw new Error('No se pudo obtener token o sign válidos');
          }
          
          // ✨ Validar formato del token
          if (auth.Token.length < 100) {
            throw new Error(`Token muy corto: ${auth.Token.length} caracteres`);
          }
          
          if (auth.Sign.length < 50) {
            throw new Error(`Sign muy corto: ${auth.Sign.length} caracteres`);
          }
          
          renewed++;
          
          details.push({
            cuit: config.cuit,
            status: 'renovado',
            sucursal: config.sucursal.nombre,
            timestamp: new Date(),
            tokenLength: auth.Token.length,
            signLength: auth.Sign.length,
            horasVencimiento: 12 // Nuevo token dura 12 horas
          });
          
          console.log(`[AFIP-RENEW] ✅ Token renovado exitosamente para CUIT ${config.cuit}`);
          
          // ✨ Test rápido del token recién obtenido
          try {
            const ultimoNumero = await client.getLastInvoiceNumber(config.puntoVenta, 6);
            console.log(`[AFIP-RENEW] ✅ Token validado con último comprobante: ${ultimoNumero}`);
          } catch (testError) {
            console.warn(`[AFIP-RENEW] ⚠️ Token renovado pero falló test: ${testError}`);
          }
          
          // Pausa entre renovaciones para no sobrecargar AFIP
          await new Promise(resolve => setTimeout(resolve, 3000));
          
        } else if (tokenExistente !== null) { // 🔧 CORRECCIÓN: Verificación explícita de null
          console.log(`[AFIP-RENEW] ✅ Token para CUIT ${config.cuit} sigue vigente (${hoursUntilExpiry.toFixed(1)}h restantes)`);
          
          details.push({
            cuit: config.cuit,
            status: 'vigente',
            sucursal: config.sucursal.nombre,
            expira: tokenExistente.expirationTime,
            horasRestantes: Math.round(hoursUntilExpiry)
          });
        }
      } catch (error) {
        console.error(`[AFIP-RENEW] ❌ Error renovando token para CUIT ${config.cuit}:`, error);
        errors++;
        
        details.push({
          cuit: config.cuit,
          status: 'error',
          sucursal: config.sucursal?.nombre || 'Desconocida',
          error: error instanceof Error ? error.message : 'Error desconocido',
          timestamp: new Date()
        });
      }
    }
    
    const result = {
      success: errors === 0,
      renewed,
      errors,
      details
    };
    
    console.log(`[AFIP-RENEW] 🏁 Renovación completada. Renovados: ${renewed}, Errores: ${errors}`);
    
    return result;
  } catch (error) {
    console.error('[AFIP-RENEW] ❌ Error general en renovación de tokens:', error);
    return {
      success: false,
      renewed: 0,
      errors: 1,
      details: [{
        status: 'error_general',
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date()
      }]
    };
  }
}

// 🔧 CORRECCIÓN: Función de estado sin include innecesario
export async function checkAllTokensStatus(): Promise<{
  total: number;
  valid: number;
  expiring: number;
  expired: number;
  tokens: any[];
}> {
  try {
    // 🔧 CORRECCIÓN: Sin include porque TokenAFIP no tiene relaciones directas
    const tokens = await prisma.tokenAFIP.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    const now = new Date();
    const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    
    const validTokens = tokens.filter(token => token.expirationTime > now);
    const expiringTokens = tokens.filter(token => 
      token.expirationTime > now && token.expirationTime <= sixHoursFromNow
    );
    
    return {
      total: tokens.length,
      valid: validTokens.length,
      expiring: expiringTokens.length,
      expired: tokens.length - validTokens.length,
      tokens: tokens.map(token => ({
        cuit: token.cuit,
        valid: token.expirationTime > now,
        expiring: token.expirationTime > now && token.expirationTime <= sixHoursFromNow,
        hoursUntilExpiry: Math.round((token.expirationTime.getTime() - now.getTime()) / (1000 * 60 * 60)),
        createdAt: token.createdAt,
        expirationTime: token.expirationTime
      }))
    };
  } catch (error) {
    console.error('[AFIP-STATUS] Error al verificar estado de tokens:', error);
    throw error;
  }
}

// 🔧 NUEVA FUNCIÓN: Estado para verificación en el endpoint de status
export async function checkAfipTokensStatus(): Promise<{
  total: number;
  valid: number;
  expired: number;
  tokens: any[];
}> {
  try {
    const statusData = await checkAllTokensStatus();
    return {
      total: statusData.total,
      valid: statusData.valid,
      expired: statusData.expired,
      tokens: statusData.tokens
    };
  } catch (error) {
    console.error('[AFIP] Error al verificar estado de tokens:', error);
    throw error;
  }
}