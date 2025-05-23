// scripts/monitor-facturacion.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class FacturacionMonitor {
  constructor() {
    this.isRunning = false;
    this.stats = {
      procesadas: 0,
      exitosas: 0,
      errores: 0,
      ultimaActividad: null
    };
  }

  async start() {
    this.isRunning = true;
    console.log('🔍 Monitor de facturación iniciado...');
    
    // Monitoreo cada 30 segundos
    this.interval = setInterval(() => {
      this.checkFacturacionStatus();
    }, 30000);
    
    // Reporte cada 5 minutos
    this.reportInterval = setInterval(() => {
      this.generateReport();
    }, 5 * 60 * 1000);
  }

  async checkFacturacionStatus() {
    try {
      // Facturas de los últimos 10 minutos
      const since = new Date(Date.now() - 10 * 60 * 1000);
      
      const recentFacturas = await prisma.facturaElectronica.findMany({
        where: {
          updatedAt: { gte: since }
        },
        select: {
          id: true,
          estado: true,
          updatedAt: true,
          error: true,
          cae: true,
          venta: {
            select: { total: true }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      if (recentFacturas.length > 0) {
        this.stats.ultimaActividad = new Date();
        
        // Detectar problemas
        const problemas = recentFacturas.filter(f => 
          f.estado === 'error' || 
          (f.estado === 'completada' && !f.cae)
        );

        if (problemas.length > 0) {
          console.log(`⚠️ ${problemas.length} facturas con problemas detectadas:`);
          problemas.forEach(p => {
            console.log(`   - ${p.id.substring(0, 8)}... Estado: ${p.estado}, CAE: ${p.cae || 'NO'}`);
            if (p.error) {
              console.log(`     Error: ${p.error.substring(0, 100)}...`);
            }
          });
        }

        // Estadísticas rápidas
        const exitosas = recentFacturas.filter(f => f.estado === 'completada' && f.cae).length;
        const procesando = recentFacturas.filter(f => f.estado === 'procesando').length;
        
        if (procesando > 5) {
          console.log(`⚠️ ${procesando} facturas en estado 'procesando' por mucho tiempo`);
        }

        this.stats.procesadas += recentFacturas.length;
        this.stats.exitosas += exitosas;
        this.stats.errores += problemas.length;
      }
    } catch (error) {
      console.error('❌ Error en monitoreo:', error);
    }
  }

  async generateReport() {
    console.log('\n📊 === REPORTE DE FACTURACIÓN ===');
    console.log(`🕒 ${new Date().toISOString()}`);
    console.log(`📈 Procesadas últimos 5min: ${this.stats.procesadas}`);
    console.log(`✅ Exitosas: ${this.stats.exitosas}`);
    console.log(`❌ Errores: ${this.stats.errores}`);
    console.log(`🔄 Última actividad: ${this.stats.ultimaActividad || 'Ninguna'}`);
    
    // Reset stats
    this.stats = { procesadas: 0, exitosas: 0, errores: 0, ultimaActividad: this.stats.ultimaActividad };
    
    // Reporte detallado de problemas actuales
    const problemasActuales = await prisma.facturaElectronica.findMany({
      where: {
        OR: [
          { estado: 'error' },
          { estado: 'procesando', updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } },
          { AND: [{ estado: 'completada' }, { cae: null }] }
        ]
      },
      select: {
        id: true,
        estado: true,
        error: true,
        updatedAt: true,
        venta: { select: { total: true } }
      },
      take: 10
    });

    if (problemasActuales.length > 0) {
      console.log(`\n⚠️ Problemas actuales (${problemasActuales.length}):`);
      problemasActuales.forEach(p => {
        const tiempo = Math.round((Date.now() - p.updatedAt.getTime()) / 1000 / 60);
        console.log(`   ${p.id.substring(0, 8)}... ${p.estado} (${tiempo}min) $${p.venta?.total}`);
      });
    }
    
    console.log('=====================================\n');
  }

  stop() {
    this.isRunning = false;
    if (this.interval) clearInterval(this.interval);
    if (this.reportInterval) clearInterval(this.reportInterval);
    console.log('🛑 Monitor detenido');
  }
}

// Ejecutar monitor
const monitor = new FacturacionMonitor();
monitor.start();

// Manejo de señales para parar limpiamente
process.on('SIGINT', () => {
  monitor.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  monitor.stop();
  process.exit(0);
});