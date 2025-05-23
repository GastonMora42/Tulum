import prisma from "@/server/db/client";

// src/lib/utils/facturationLogger.ts
export class FacturationLogger {
    private sessionId: string;
    private startTime: Date;
    private logs: string[] = [];
  
    constructor(sessionId: string) {
      this.sessionId = sessionId;
      this.startTime = new Date();
    }
  
    log(message: string, level: 'INFO' | 'ERROR' | 'WARN' | 'SUCCESS' = 'INFO', data?: any) {
      const timestamp = new Date().toISOString();
      const elapsed = Date.now() - this.startTime.getTime();
      
      const logEntry = {
        timestamp,
        sessionId: this.sessionId,
        elapsed: `+${elapsed}ms`,
        level,
        message,
        data: data ? JSON.stringify(data) : undefined
      };
  
      // En producción, solo loguear errores y éxitos
      if (process.env.NODE_ENV === 'production' && !['ERROR', 'SUCCESS'].includes(level)) {
        return;
      }
  
      this.logs.push(JSON.stringify(logEntry));
      
      // Console log solo en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${level}][${this.sessionId}] ${message}`, data || '');
      }
    }
  
    async saveToDatabase(facturaId: string) {
      try {
        await prisma.facturaElectronica.update({
          where: { id: facturaId },
          data: {
            logs: this.logs.join('\n').substring(0, 10000) // Limitar tamaño
          }
        });
      } catch (error) {
        console.error('Error guardando logs:', error);
      }
    }
  
    getCompactLogs(): string {
      return this.logs
        .filter(log => log.includes('"level":"ERROR"') || log.includes('"level":"SUCCESS"'))
        .join('\n');
    }
  }