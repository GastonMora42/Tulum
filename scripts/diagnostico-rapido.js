// scripts/diagnostico-rapido.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnosticoRapido() {
  console.log('🏥 === DIAGNÓSTICO RÁPIDO FACTURACIÓN ===\n');
  
  try {
    // 1. Estado general
    const stats = await prisma.facturaElectronica.groupBy({
      by: ['estado'],
      _count: { estado: true },
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Últimas 24h
      }
    });

    console.log('📊 Estados últimas 24h:');
    stats.forEach(s => {
      const emoji = s.estado === 'completada' ? '✅' : s.estado === 'error' ? '❌' : '⏳';
      console.log(`   ${emoji} ${s.estado}: ${s._count.estado}`);
    });

    // 2. Facturas problemáticas
    const problemas = await prisma.facturaElectronica.findMany({
      where: {
        OR: [
          { estado: 'error' },
          { AND: [{ estado: 'completada' }, { cae: null }] },
          { estado: 'procesando', updatedAt: { lt: new Date(Date.now() - 10 * 60 * 1000) } }
        ]
      },
      select: {
        id: true,
        estado: true,
        error: true,
        createdAt: true,
        venta: { select: { total: true, clienteNombre: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    if (problemas.length > 0) {
      console.log(`\n⚠️ Problemas detectados (${problemas.length}):`);
      problemas.forEach(p => {
        const tiempo = Math.round((Date.now() - p.createdAt.getTime()) / 1000 / 60);
        console.log(`   ${p.id.substring(0, 8)}... ${p.estado} (${tiempo}min) $${p.venta?.total} - ${p.venta?.clienteNombre || 'CF'}`);
        if (p.error) {
          console.log(`     💬 ${p.error.substring(0, 80)}...`);
        }
      });
    } else {
      console.log('\n✅ No se detectaron problemas recientes');
    }

    // 3. Configuraciones AFIP
    const configs = await prisma.configuracionAFIP.findMany({
      where: { activo: true },
      include: { sucursal: { select: { nombre: true } } }
    });

    console.log(`\n🔧 Configuraciones AFIP activas (${configs.length}):`);
    configs.forEach(c => {
      console.log(`   ✅ ${c.sucursal.nombre}: CUIT ${c.cuit}, PV ${c.puntoVenta}`);
    });

    // 4. Rendimiento últimas horas
    const ultimasHoras = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('hour', "createdAt") as hora,
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'completada' THEN 1 END) as completadas,
        COUNT(CASE WHEN estado = 'error' THEN 1 END) as errores
      FROM "FacturaElectronica" 
      WHERE "createdAt" >= NOW() - INTERVAL '6 hours'
      GROUP BY DATE_TRUNC('hour', "createdAt")
      ORDER BY hora DESC
    `;

    if (Array.isArray(ultimasHoras) && ultimasHoras.length > 0) {
      console.log('\n📈 Rendimiento últimas horas:');
      ultimasHoras.forEach((h) => {
        const hora = new Date(h.hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        const tasa = h.total > 0 ? Math.round((h.completadas / h.total) * 100) : 0;
        console.log(`   ${hora}: ${h.completadas}/${h.total} (${tasa}%) ${h.errores > 0 ? `❌${h.errores}` : ''}`);
      });
    }

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnosticoRapido();