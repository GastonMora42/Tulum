// src/server/jobs/renewAfipTokenJob.ts
import { AfipSoapClient } from '@/lib/afip/afipSoapClient';
import prisma from '@/server/db/client';

/**
 * Job para renovar tokens de AFIP automáticamente
 * Debe ejecutarse periódicamente (cada 6 horas)
 */
export async function renewAfipTokens(): Promise<{
  success: boolean;
  renewed: number;
  errors: number;
}> {
  console.log('[AFIP] Iniciando renovación automática de tokens AFIP');
  
  try {
    // Obtener todas las configuraciones activas
    const configuraciones = await prisma.configuracionAFIP.findMany({
      where: { activo: true }
    });
    
    console.log(`[AFIP] Encontradas ${configuraciones.length} configuraciones activas`);
    
    // Iniciar contador de resultados
    let renewed = 0;
    let errors = 0;
    
    // Procesar cada configuración
    for (const config of configuraciones) {
      try {
        console.log(`[AFIP] Procesando CUIT ${config.cuit}`);
        
        // Buscar token existente
        const tokenExistente = await prisma.tokenAFIP.findUnique({
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
          await client.getAuth();
          
          renewed++;
          console.log(`[AFIP] Token renovado exitosamente para CUIT ${config.cuit}`);
        } else {
          console.log(`[AFIP] Token para CUIT ${config.cuit} sigue vigente (expira: ${tokenExistente.expirationTime.toISOString()})`);
        }
      } catch (error) {
        console.error(`[AFIP] Error renovando token para CUIT ${config.cuit}:`, error);
        errors++;
      }
    }
    
    console.log(`[AFIP] Renovación completada. Renovados: ${renewed}, Errores: ${errors}`);
    
    return {
      success: true,
      renewed,
      errors
    };
  } catch (error) {
    console.error('[AFIP] Error general en renovación de tokens:', error);
    return {
      success: false,
      renewed: 0,
      errors: 1
    };
  }
}

// Para ejecutar manualmente este job en desarrollo:
if (process.env.NODE_ENV === 'development' && process.env.RUN_TOKEN_JOB === 'true') {
  renewAfipTokens()
    .then(result => console.log('[AFIP] Resultado de renovación manual:', result))
    .catch(error => console.error('[AFIP] Error en renovación manual:', error));
}