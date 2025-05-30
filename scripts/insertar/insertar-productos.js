// scripts/insertar-productos.js
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

// Productos basados en el Excel - AJUSTAR SEGÚN TU EXCEL
const productos = [
  // Difusores
  {
    nombre: 'Difusor de Bambú Pequeño',
    descripcion: 'Difusor aromático de bambú natural, tamaño pequeño',
    precio: 450.00,
    codigoBarras: '', // Se generará automáticamente
    categoriaId: '', // Se asignará automáticamente
    categoriaNombre: 'Difusores',
    stockMinimo: 5,
    activo: true
  },
  {
    nombre: 'Difusor de Bambú Grande',
    descripcion: 'Difusor aromático de bambú natural, tamaño grande',
    precio: 650.00,
    categoriaId: '',
    categoriaNombre: 'Difusores',
    stockMinimo: 3,
    activo: true
  },
  
  // Velas Aromáticas
  {
    nombre: 'Vela Aromática Lavanda',
    descripcion: 'Vela de cera de soja con esencia de lavanda',
    precio: 280.00,
    categoriaId: '',
    categoriaNombre: 'Velas Aromáticas',
    stockMinimo: 10,
    activo: true
  },
  {
    nombre: 'Vela Aromática Eucalipto',
    descripcion: 'Vela de cera de soja con esencia de eucalipto',
    precio: 280.00,
    categoriaId: '',
    categoriaNombre: 'Velas Aromáticas',
    stockMinimo: 10,
    activo: true
  },
  
  // Aceites Esenciales
  {
    nombre: 'Aceite Esencial Limón 10ml',
    descripcion: 'Aceite esencial puro de limón, frasco de 10ml',
    precio: 350.00,
    categoriaId: '',
    categoriaNombre: 'Aceites Esenciales',
    stockMinimo: 8,
    activo: true
  },
  {
    nombre: 'Aceite Esencial Menta 10ml',
    descripcion: 'Aceite esencial puro de menta, frasco de 10ml',
    precio: 380.00,
    categoriaId: '',
    categoriaNombre: 'Aceites Esenciales',
    stockMinimo: 8,
    activo: true
  },
  
  // Agregar más productos según tu Excel...
];

// Función para generar código de barras simple
function generarCodigoBarras() {
  return '77' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
}

async function insertarProductos() {
  console.log('📦 Iniciando inserción de productos...');
  
  try {
    // Primero obtener todas las categorías
    const categorias = await prisma.categoria.findMany();
    const categoriaMap = new Map();
    categorias.forEach(cat => categoriaMap.set(cat.nombre, cat.id));
    
    console.log(`📋 Categorías disponibles: ${categorias.map(c => c.nombre).join(', ')}`);
    
    let insertados = 0;
    let omitidos = 0;
    let errores = 0;
    
    for (const productoData of productos) {
      try {
        // Buscar el ID de la categoría
        const categoriaId = categoriaMap.get(productoData.categoriaNombre);
        
        if (!categoriaId) {
          console.error(`❌ Categoría "${productoData.categoriaNombre}" no encontrada para producto "${productoData.nombre}"`);
          errores++;
          continue;
        }
        
        // Verificar si ya existe un producto con el mismo nombre
        const existente = await prisma.producto.findFirst({
          where: { nombre: productoData.nombre }
        });
        
        if (existente) {
          console.log(`⏭️ Producto "${productoData.nombre}" ya existe, omitiendo...`);
          omitidos++;
          continue;
        }
        
        // Generar código de barras si no existe
        const codigoBarras = productoData.codigoBarras || generarCodigoBarras();
        
        // Verificar que el código de barras sea único
        const codigoExistente = await prisma.producto.findFirst({
          where: { codigoBarras }
        });
        
        if (codigoExistente) {
          console.warn(`⚠️ Código de barras ${codigoBarras} ya existe, generando nuevo...`);
          productoData.codigoBarras = generarCodigoBarras();
        }
        
        // Preparar datos del producto
        const { categoriaNombre, ...productDataClean } = productoData;
        const productToCreate = {
          ...productDataClean,
          categoriaId,
          codigoBarras: productoData.codigoBarras || codigoBarras
        };
        
        // Crear producto
        const producto = await prisma.producto.create({
          data: productToCreate,
          include: {
            categoria: true
          }
        });
        
        console.log(`✅ Producto creado: ${producto.nombre} - ${producto.categoria.nombre} - $${producto.precio} (Código: ${producto.codigoBarras})`);
        insertados++;
        
      } catch (error) {
        console.error(`❌ Error al crear producto "${productoData.nombre}":`, error.message);
        errores++;
      }
    }
    
    console.log(`\n📊 Resumen de productos:`);
    console.log(`   ✅ Insertados: ${insertados}`);
    console.log(`   ⏭️ Omitidos: ${omitidos}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log(`   📝 Total procesados: ${productos.length}`);
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Función para listar productos por categoría
async function listarProductos() {
  try {
    const productos = await prisma.producto.findMany({
      include: { categoria: true },
      orderBy: [
        { categoria: { nombre: 'asc' } },
        { nombre: 'asc' }
      ]
    });
    
    console.log('\n📋 Productos en la base de datos:');
    
    const productosAgrupadosPorCategoria = productos.reduce((acc, producto) => {
      const categoriaNombre = producto.categoria.nombre;
      if (!acc[categoriaNombre]) {
        acc[categoriaNombre] = [];
      }
      acc[categoriaNombre].push(producto);
      return acc;
    }, {});
    
    Object.entries(productosAgrupadosPorCategoria).forEach(([categoria, productos]) => {
      console.log(`\n   📂 ${categoria}:`);
      productos.forEach((producto, index) => {
        console.log(`      ${index + 1}. ${producto.nombre} - $${producto.precio} (${producto.codigoBarras})`);
      });
    });
    
    return productos;
  } catch (error) {
    console.error('❌ Error al listar productos:', error);
    return [];
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  insertarProductos()
    .then(() => listarProductos())
    .then(() => {
      console.log('\n🎉 Proceso de productos completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { insertarProductos, listarProductos };