// src/server/jobs/renewAfipTokenJob.ts
import { AfipSoapClient } from '@/lib/afip/afipSoapClient';
import prisma from '@/server/db/client';

// Asegúrate de que esta función esté correctamente exportada
export async function renewAfipTokens(): Promise<{
  success: boolean;
  renewed: number;
  errors: number;
  details?: any[];
}> {
  console.log('[AFIP] Iniciando renovación automática de tokens AFIP');
  
  try {
    // Obtener todas las configuraciones activas
    const configuraciones = await prisma.configuracionAFIP.findMany({
      where: { activo: true }
    });
    
    console.log(`[AFIP] Encontradas ${configuraciones.length} configuraciones activas`);
    
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
        console.log(`[AFIP] Procesando CUIT ${config.cuit}`);
        
        // Buscar token existente
        const tokenExistente = await prisma.tokenAFIP.findFirst({
          where: { cuit: config.cuit }
        });
        
        // Calcular si necesita renovación (si falta menos de 6 horas para expirar)
        const now = new Date();
        const needsRenewal = !tokenExistente || 
          (tokenExistente.expirationTime.getTime() - now.getTime()) < 6 * 60 * 60 * 1000;
        
        if (needsRenewal) {
          console.log(`[AFIP] Token para CUIT ${config.cuit} requiere renovación`);
          
          // Crear cliente AFIP y forzar autenticación
          const client = new AfipSoapClient(config.cuit);
          
          // Intentar obtener auth (esto fuerza la renovación)
          const auth = await client.getAuth();
          
          // Verificar que se obtuvo correctamente
          if (!auth.Token || !auth.Sign) {
            throw new Error('No se pudo obtener token o sign válidos');
          }
          
          renewed++;
          
          details.push({
            cuit: config.cuit,
            status: 'renovado',
            sucursal: config.sucursalId,
            timestamp: new Date(),
            tokenLength: auth.Token.length,
            signLength: auth.Sign.length
          });
          
          console.log(`[AFIP] Token renovado exitosamente para CUIT ${config.cuit}`);
          
          // Pequeña pausa entre renovaciones para no sobrecargar AFIP
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } else if (tokenExistente) {
          const hoursUntilExpiry = (tokenExistente.expirationTime.getTime() - now.getTime()) / (1000 * 60 * 60);
          console.log(`[AFIP] Token para CUIT ${config.cuit} sigue vigente (expira en ${hoursUntilExpiry.toFixed(1)} horas)`);
          
          details.push({
            cuit: config.cuit,
            status: 'vigente',
            sucursal: config.sucursalId,
            expira: tokenExistente.expirationTime,
            horasRestantes: Math.round(hoursUntilExpiry)
          });
        }
      } catch (error) {
        console.error(`[AFIP] Error renovando token para CUIT ${config.cuit}:`, error);
        errors++;
        
        details.push({
          cuit: config.cuit,
          status: 'error',
          sucursal: config.sucursalId,
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
    
    console.log(`[AFIP] Renovación completada. Renovados: ${renewed}, Errores: ${errors}`);
    
    return result;
  } catch (error) {
    console.error('[AFIP] Error general en renovación de tokens:', error);
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

// También exportar la función de verificación de estado
export async function checkAfipTokensStatus(): Promise<{
  total: number;
  valid: number;
  expired: number;
  tokens: any[];
}> {
  try {
    // Buscar todos los tokens disponibles
    const tokens = await prisma.tokenAFIP.findMany();
    
    const now = new Date();
    const validTokens = tokens.filter(token => token.expirationTime > now);
    
    return {
      total: tokens.length,
      valid: validTokens.length,
      expired: tokens.length - validTokens.length,
      tokens: tokens.map(token => ({
        cuit: token.cuit,
        valid: token.expirationTime > now,
        expiresIn: Math.round((token.expirationTime.getTime() - now.getTime()) / (1000 * 60)), // minutos
        createdAt: token.createdAt
      }))
    };
  } catch (error) {
    console.error('[AFIP] Error al verificar estado de tokens:', error);
    throw error;
  }
}