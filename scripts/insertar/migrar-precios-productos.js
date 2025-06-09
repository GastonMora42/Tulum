// scripts/insertar/migrar-precios-productos.js - PRECIOS REALES
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Precios por categoría (en pesos argentinos)
const preciosPorCategoria = {
  'Aceites Corporales': {
    precio: 8500,
    variaciones: {
      'Rosa Mosqueta': 9500,
      'Ricino': 7500,
      'Coco': 6900
    }
  },
  'Aguas Aromáticas': {
    precio: 9500,
    variaciones: {}
  },
  'Bombas de Baño': {
    precio: 8500,
    variaciones: {}
  },
  'Difusores para Auto': {
    precio: 8900,
    variaciones: {}
  },
  'Difusores de Hogar': {
    precio: 25900,
    variaciones: {}
  },
  'Esencias para Hornillo': {
    precio: 9500,
    variaciones: {}
  },
  'Esencias para Humidificador': {
    precio: 14500,
    variaciones: {}
  },
  'Espumas de Baño': {
    precio: 13900,
    variaciones: {}
  },
  'Fragancias Textiles': {
    precio: 15900,
    variaciones: {}
  },
  'Home Sprays': {
    precio: 16900,
    variaciones: {}
  },
  'Jabones': {
    precio: 14500, // Jabones líquidos
    variaciones: {
      'Sólido': 4900, // Jabones sólidos
      'Líquido': 14500
    }
  },
  'Sales de Baño': {
    precio: 9500,
    variaciones: {}
  },
  'Velas de Soja': {
    precio: 25000, // Precio base
    variaciones: {
      'Eco Sin Tapa': 20500,
      'Eco Con Tapa': 23500,
      'Ursula Sin Tapa': 23500,
      'Ursula Vidrio Con Tapa': 25500,
      'Cerámicas': 29500,
      'Caramelera': 45000,
      'Catedral Grande': 39000,
      'Redonda Grande': 39000,
      'Relieve': 39000,
      'Rombos': 39000,
      'Acanalada': 49000,
      'Geoglífica': 49000,
      'Triangulo Grande': 79000,
      'Ursula Color Con Tapa': 39000,
      'Bombe Con Frase': 26500
    }
  },
  'Humidificadores con Filtro': {
    precio: 35000, // Precio estimado
    variaciones: {
      'Básico': 25000,
      'Pro': 45000,
      'Velador Luna': 38000,
      'Planeta': 42000
    }
  },
  'Humidificadores Grandes': {
    precio: 55000, // Precio estimado
    variaciones: {
      'Con Bluetooth': 75000,
      'Reloj/Alarma': 65000,
      'Volcán': 48000,
      'Fogata Grande': 52000,
      'y Lámpara de Sal': 68000
    }
  },
  'Humidificadores Medianos': {
    precio: 28000, // Precio estimado
    variaciones: {
      '125ML': 22000,
      '300ML Pro': 32000,
      'Aroma Difuser': 30000,
      'Mini Fuego': 25000,
      'Mood': 26000
    }
  },
  'Accesorios': {
    precio: 5000, // Precio estimado
    variaciones: {
      'Adaptador Para Humi': 8500,
      'Apaga Velas': 4500,
      'Filtro Humidificador': 2500
    }
  }
};

// Función para determinar precio de un producto
function determinarPrecio(producto, categoria) {
  const configCategoria = preciosPorCategoria[categoria.nombre];
  
  if (!configCategoria) {
    console.warn(`⚠️ No hay configuración de precio para categoría: ${categoria.nombre}`);
    return 15000; // Precio por defecto
  }
  
  // Buscar variaciones específicas
  for (const [clave, precio] of Object.entries(configCategoria.variaciones)) {
    if (producto.nombre.toLowerCase().includes(clave.toLowerCase())) {
      return precio;
    }
  }
  
  // Si es jabón, determinar si es líquido o sólido
  if (categoria.nombre === 'Jabones') {
    if (producto.nombre.toLowerCase().includes('sólido')) {
      return configCategoria.variaciones['Sólido'] || 4900;
    } else {
      return configCategoria.variaciones['Líquido'] || 14500;
    }
  }
  
  // Precio base de la categoría
  return configCategoria.precio;
}

// Función para actualizar precios
async function actualizarPrecios() {
  console.log('💰 === ACTUALIZACIÓN DE PRECIOS ===\n');
  
  try {
    // Obtener todos los productos activos con sus categorías
    const productos = await prisma.producto.findMany({
      where: { activo: true },
      include: { categoria: true },
      orderBy: [
        { categoria: { nombre: 'asc' } },
        { nombre: 'asc' }
      ]
    });
    
    console.log(`📋 Encontrados ${productos.length} productos activos\n`);
    
    let actualizados = 0;
    let errores = 0;
    const resumenCambios = new Map();
    
    // Procesar cada producto
    for (const producto of productos) {
      try {
        const precioNuevo = determinarPrecio(producto, producto.categoria);
        const precioAnterior = producto.precio;
        
        // Solo actualizar si el precio cambió
        if (precioNuevo !== precioAnterior) {
          await prisma.producto.update({
            where: { id: producto.id },
            data: { precio: precioNuevo }
          });
          
          // Registrar cambio
          const categoria = producto.categoria.nombre;
          if (!resumenCambios.has(categoria)) {
            resumenCambios.set(categoria, []);
          }
          
          resumenCambios.get(categoria).push({
            nombre: producto.nombre,
            precioAnterior,
            precioNuevo,
            diferencia: precioNuevo - precioAnterior
          });
          
          console.log(`   ✅ ${producto.nombre}: $${precioAnterior} → $${precioNuevo}`);
          actualizados++;
        } else {
          console.log(`   ⏭️ ${producto.nombre}: Sin cambios ($${precioAnterior})`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error actualizando ${producto.nombre}:`, error.message);
        errores++;
      }
    }
    
    // Mostrar resumen
    console.log(`\n📊 === RESUMEN DE ACTUALIZACIÓN ===`);
    console.log(`✅ Productos actualizados: ${actualizados}`);
    console.log(`⏭️ Sin cambios: ${productos.length - actualizados - errores}`);
    console.log(`❌ Errores: ${errores}`);
    
    // Mostrar cambios por categoría
    if (resumenCambios.size > 0) {
      console.log(`\n💸 === CAMBIOS POR CATEGORÍA ===`);
      
      for (const [categoria, cambios] of resumenCambios.entries()) {
        console.log(`\n📂 ${categoria}:`);
        
        const aumentos = cambios.filter(c => c.diferencia > 0);
        const disminuciones = cambios.filter(c => c.diferencia < 0);
        
        if (aumentos.length > 0) {
          console.log(`   📈 Aumentos (${aumentos.length}):`);
          aumentos.forEach(c => {
            console.log(`      ${c.nombre}: +$${c.diferencia}`);
          });
        }
        
        if (disminuciones.length > 0) {
          console.log(`   📉 Disminuciones (${disminuciones.length}):`);
          disminuciones.forEach(c => {
            console.log(`      ${c.nombre}: $${c.diferencia}`);
          });
        }
      }
    }
    
    // Estadísticas finales por categoría
    console.log(`\n📈 === PRECIOS FINALES POR CATEGORÍA ===`);
    
    const estadisticasPrecios = await prisma.categoria.findMany({
      include: {
        productos: {
          where: { activo: true },
          select: { precio: true, nombre: true }
        }
      },
      orderBy: { nombre: 'asc' }
    });
    
    estadisticasPrecios.forEach(categoria => {
      if (categoria.productos.length > 0) {
        const precios = categoria.productos.map(p => p.precio);
        const precioMin = Math.min(...precios);
        const precioMax = Math.max(...precios);
        const precioPromedio = Math.round(precios.reduce((a, b) => a + b, 0) / precios.length);
        
        console.log(`   📦 ${categoria.nombre}:`);
        console.log(`      Productos: ${categoria.productos.length}`);
        console.log(`      Rango: $${precioMin} - $${precioMax}`);
        console.log(`      Promedio: $${precioPromedio}`);
        
        // Mostrar algunos ejemplos
        const ejemplos = categoria.productos.slice(0, 2);
        ejemplos.forEach(producto => {
          console.log(`      ej: ${producto.nombre} ($${producto.precio})`);
        });
      }
    });
    
    return {
      actualizados,
      errores,
      totalProcesados: productos.length,
      cambiosPorCategoria: resumenCambios
    };
    
  } catch (error) {
    console.error('❌ Error general:', error);
    throw error;
  }
}

// Función para verificar precios actuales
async function verificarPreciosActuales() {
  console.log('🔍 === VERIFICACIÓN DE PRECIOS ACTUALES ===\n');
  
  try {
    const estadisticas = await prisma.categoria.findMany({
      include: {
        productos: {
          where: { activo: true },
          select: { 
            nombre: true, 
            precio: true,
            codigoBarras: true
          },
          orderBy: { precio: 'desc' }
        },
        _count: {
          select: { productos: { where: { activo: true } } }
        }
      },
      orderBy: { nombre: 'asc' }
    });
    
    estadisticas.forEach(categoria => {
      if (categoria._count.productos > 0) {
        const productos = categoria.productos;
        const precios = productos.map(p => p.precio);
        const precioMin = Math.min(...precios);
        const precioMax = Math.max(...precios);
        
        console.log(`📂 ${categoria.nombre} (${categoria._count.productos} productos):`);
        console.log(`   💰 Rango: $${precioMin} - $${precioMax}`);
        
        // Mostrar producto más caro y más barato
        const masCaro = productos.find(p => p.precio === precioMax);
        const masBarato = productos.find(p => p.precio === precioMin);
        
        if (masCaro && masBarato && precioMax !== precioMin) {
          console.log(`   🔝 Más caro: ${masCaro.nombre} ($${masCaro.precio})`);
          console.log(`   🔻 Más barato: ${masBarato.nombre} ($${masBarato.precio})`);
        } else if (masCaro) {
          console.log(`   💎 Precio único: ${masCaro.nombre} ($${masCaro.precio})`);
        }
        
        console.log(''); // Línea en blanco
      }
    });
    
    // Estadísticas generales
    const totalProductos = await prisma.producto.count({ where: { activo: true } });
    const precioPromedio = await prisma.producto.aggregate({
      where: { activo: true },
      _avg: { precio: true },
      _min: { precio: true },
      _max: { precio: true }
    });
    
    console.log('📊 === ESTADÍSTICAS GENERALES ===');
    console.log(`📦 Total productos activos: ${totalProductos}`);
    console.log(`💰 Precio promedio: $${Math.round(precioPromedio._avg.precio || 0)}`);
    console.log(`🔻 Precio mínimo: $${precioPromedio._min.precio || 0}`);
    console.log(`🔝 Precio máximo: $${precioPromedio._max.precio || 0}`);
    
  } catch (error) {
    console.error('❌ Error verificando precios:', error);
    throw error;
  }
}

// Función principal
async function migrarPrecios(comando = null) {
  try {
    switch (comando) {
      case '--verificar':
        await verificarPreciosActuales();
        break;
        
      case '--actualizar':
        await actualizarPrecios();
        break;
        
      default:
        console.log('💰 === MIGRACIÓN DE PRECIOS ===\n');
        console.log('🔍 Verificando precios actuales...\n');
        await verificarPreciosActuales();
        
        console.log('\n🔄 Actualizando precios...\n');
        await actualizarPrecios();
    }
    
    console.log('\n✅ Migración de precios completada');
    
  } catch (error) {
    console.error('❌ Error en migración de precios:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función para generar reporte de precios
async function generarReportePrecios() {
  console.log('📊 Generando reporte de precios...');
  
  try {
    const productos = await prisma.producto.findMany({
      where: { activo: true },
      include: { categoria: true },
      orderBy: [
        { categoria: { nombre: 'asc' } },
        { precio: 'desc' }
      ]
    });
    
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `reporte-precios-${fecha}.csv`;
    
    const csvContent = [
      'Categoría,Producto,Precio,Código de Barras',
      ...productos.map(p => 
        `"${p.categoria.nombre}","${p.nombre}",${p.precio},"${p.codigoBarras || ''}"`
      )
    ].join('\n');
    
    const fs = require('fs').promises;
    await fs.writeFile(nombreArchivo, csvContent);
    
    console.log(`✅ Reporte generado: ${nombreArchivo}`);
    
  } catch (error) {
    console.error('❌ Error generando reporte:', error);
  }
}

// Mostrar ayuda
function mostrarAyuda() {
  console.log(`
📚 Uso: node scripts/insertar/migrar-precios-productos.js [comando]

🔧 Comandos:
   --verificar    Solo verificar precios actuales
   --actualizar   Solo actualizar precios
   --reporte      Generar reporte CSV de precios
   --ayuda        Mostrar esta ayuda

📖 Ejemplos:
   # Verificar y actualizar (completo)
   node scripts/insertar/migrar-precios-productos.js
   
   # Solo verificar precios actuales
   node scripts/insertar/migrar-precios-productos.js --verificar
   
   # Solo actualizar precios
   node scripts/insertar/migrar-precios-productos.js --actualizar

💰 Precios configurados:
   - Aceites corporales: $6,900 - $9,500
   - Difusores hogar: $25,900
   - Difusores auto: $8,900
   - Esencias humidificador: $14,500
   - Velas de soja: $20,500 - $79,000
   - Jabones líquidos: $14,500
   - Jabones sólidos: $4,900
   - Y más...
`);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const args = process.argv.slice(2);
  const comando = args[0];
  
  if (comando === '--ayuda' || comando === '--help') {
    mostrarAyuda();
    process.exit(0);
  }
  
  if (comando === '--reporte') {
    generarReportePrecios()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    migrarPrecios(comando)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

module.exports = { 
  migrarPrecios,
  verificarPreciosActuales,
  actualizarPrecios,
  preciosPorCategoria
};