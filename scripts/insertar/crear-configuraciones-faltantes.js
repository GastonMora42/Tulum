// scripts/insertar/crear-configuraciones-faltantes.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function crearConfiguracionesFaltantes() {
  console.log('🔧 === CREANDO CONFIGURACIONES DE STOCK FALTANTES ===\n');
  
  try {
    // 1. Obtener usuario admin
    const adminUser = await prisma.user.findFirst({
      where: { roleId: 'role-admin' }
    });
    
    if (!adminUser) {
      throw new Error('No se encontró usuario admin');
    }
    
    // 2. Obtener todas las sucursales activas
    const sucursales = await prisma.ubicacion.findMany({
      where: { 
        tipo: 'sucursal',
        activo: true 
      }
    });
    
    console.log(`🏢 Sucursales encontradas: ${sucursales.length}`);
    sucursales.forEach(s => console.log(`   - ${s.nombre}`));
    
    // 3. Obtener productos activos sin configuración
    const productosActivos = await prisma.producto.findMany({
      where: { activo: true }
    });
    
    console.log(`📦 Productos activos: ${productosActivos.length}`);
    
    // 4. Obtener configuraciones existentes
    const configuracionesExistentes = await prisma.stockConfigSucursal.findMany({
      select: {
        productoId: true,
        sucursalId: true
      }
    });
    
    // Crear un Set para búsqueda rápida
    const configExistenteSet = new Set(
      configuracionesExistentes.map(c => `${c.productoId}-${c.sucursalId}`)
    );
    
    console.log(`⚙️ Configuraciones existentes: ${configuracionesExistentes.length}`);
    
    // 5. Encontrar configuraciones faltantes
    const configuracionesFaltantes = [];
    
    for (const producto of productosActivos) {
      for (const sucursal of sucursales) {
        const key = `${producto.id}-${sucursal.id}`;
        
        if (!configExistenteSet.has(key)) {
          configuracionesFaltantes.push({
            producto,
            sucursal
          });
        }
      }
    }
    
    console.log(`❌ Configuraciones faltantes: ${configuracionesFaltantes.length}`);
    
    if (configuracionesFaltantes.length === 0) {
      console.log('✅ No hay configuraciones faltantes. Todos los productos están configurados.');
      return;
    }
    
    // 6. Crear configuraciones faltantes
    console.log('\n🛠️ Creando configuraciones faltantes...');
    
    let creadas = 0;
    let errores = 0;
    
    for (const { producto, sucursal } of configuracionesFaltantes) {
      try {
        // Configuración inteligente basada en el stockMinimo del producto
        const stockMinimo = producto.stockMinimo || 1;
        const stockMaximo = Math.max(stockMinimo * 5, 10);
        const puntoReposicion = Math.ceil(stockMaximo * 0.3);
        
        await prisma.stockConfigSucursal.create({
          data: {
            productoId: producto.id,
            sucursalId: sucursal.id,
            stockMaximo,
            stockMinimo,
            puntoReposicion,
            creadoPor: adminUser.id,
            activo: true
          }
        });
        
        creadas++;
        
        if (creadas % 50 === 0) {
          console.log(`   ✅ ${creadas} configuraciones creadas...`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error con ${producto.nombre} - ${sucursal.nombre}:`, error.message);
        errores++;
      }
    }
    
    // 7. Mostrar resumen
    console.log('\n📊 === RESUMEN ===');
    console.log(`✅ Configuraciones creadas: ${creadas}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📦 Productos procesados: ${productosActivos.length}`);
    console.log(`🏢 Sucursales procesadas: ${sucursales.length}`);
    
    // 8. Verificar algunos productos que ahora deberían aparecer
    console.log('\n🔍 Verificación final - Productos que ahora aparecerán en stock-sucursales:');
    
    const productosConConfiguracion = await prisma.producto.findMany({
      where: {
        activo: true,
        stockConfigs: {
          some: {
            activo: true
          }
        }
      },
      include: {
        _count: {
          select: {
            stockConfigs: true
          }
        }
      },
      take: 10
    });
    
    productosConConfiguracion.forEach(producto => {
      console.log(`   📦 ${producto.nombre} (${producto._count.stockConfigs} sucursales configuradas)`);
    });
    
    return {
      configuracionesCreadas: creadas,
      errores,
      productosActivos: productosActivos.length,
      sucursales: sucursales.length
    };
    
  } catch (error) {
    console.error('💥 Error general:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función para mostrar ayuda
function mostrarAyuda() {
  console.log(`
📚 Script para Crear Configuraciones de Stock Faltantes

🎯 Propósito:
   Crear configuraciones de stock (StockConfigSucursal) para productos
   que fueron creados manualmente y no aparecen en stock-sucursales.

🔧 Uso:
   node scripts/insertar/crear-configuraciones-faltantes.js

📋 Qué hace:
   ✅ Busca productos activos sin configuración de stock
   ✅ Crea configuraciones inteligentes para todas las sucursales
   ✅ Usa valores por defecto basados en stockMinimo del producto
   ✅ Permite que los productos aparezcan en stock-sucursales

💡 Configuración automática:
   - Stock Mínimo: valor del producto (o 1 si no tiene)
   - Stock Máximo: 5 veces el mínimo (mínimo 10)
   - Punto Reposición: 30% del máximo

🔒 Requisitos:
   - Usuario admin configurado
   - Sucursales activas en el sistema
   - Productos activos sin configuración
`);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--ayuda') || args.includes('--help')) {
    mostrarAyuda();
    process.exit(0);
  }
  
  console.log('🚀 Iniciando creación de configuraciones faltantes...\n');
  
  crearConfiguracionesFaltantes()
    .then((resultado) => {
      console.log('\n🎉 === PROCESO COMPLETADO EXITOSAMENTE ===');
      console.log(`⚙️ ${resultado.configuracionesCreadas} configuraciones creadas`);
      console.log('📍 Los productos ahora aparecerán en stock-sucursales');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 === ERROR EN EL PROCESO ===');
      console.error(error.message);
      process.exit(1);
    });
}

module.exports = { crearConfiguracionesFaltantes };