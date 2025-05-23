// src/config/debug.ts
export const DEBUG_FACTURACION = {
    enabled: process.env.NODE_ENV !== 'production' || process.env.FORCE_DEBUG === 'true',
    logLevel: process.env.FACTURACION_LOG_LEVEL || 'INFO',
    saveToDatabase: true,
    maxLogSize: 50000, // caracteres
    
    // Configuración específica por ambiente
    production: {
      logOnlyErrors: true,
      sensitiveDataMask: true,
      alertOnErrors: true
    },
    
    development: {
      logEverything: true,
      prettyPrint: true,
      saveRawResponses: true
    }
  };