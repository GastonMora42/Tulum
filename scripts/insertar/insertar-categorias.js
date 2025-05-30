// scripts/insertar-categorias.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Categorías basadas en el Excel (las que están en gris)
const categorias = [
  { nombre: 'Difusores' },
  { nombre: 'Velas Aromáticas' },
  { nombre: 'Aceites Esenciales' },
  { nombre: 'Sahumerios' },
  { nombre: 'Inciensos' },
  { nombre: 'Quemadores' },
  { nombre: 'Sets Aromáticos' },
  { nombre: 'Aceites Vegetales' },
  { nombre: 'Cosméticos Naturales' },
  { nombre: 'Sales de Baño' },
  // Agregar más categorías según aparezcan en tu Excel
];

async function insertarCategorias() {
  console.log('🏷️ Iniciando inserción de categorías...');
  
  try {
    let insertadas = 0;
    let omitidas = 0;
    
    for (const categoriaData of categorias) {
      try {
        // Verificar si ya existe
        const existente = await prisma.categoria.findUnique({
          where: { nombre: categoriaData.nombre }
        });
        
        if (existente) {
          console.log(`⏭️ Categoría "${categoriaData.nombre}" ya existe, omitiendo...`);
          omitidas++;
          continue;
        }
        
        // Crear nueva categoría
        const categoria = await prisma.categoria.create({
          data: categoriaData
        });
        
        console.log(`✅ Categoría creada: ${categoria.nombre} (ID: ${categoria.id})`);
        insertadas++;
        
      } catch (error) {
        console.error(`❌ Error al crear categoría "${categoriaData.nombre}":`, error.message);
      }
    }
    
    console.log(`\n📊 Resumen de categorías:`);
    console.log(`   ✅ Insertadas: ${insertadas}`);
    console.log(`   ⏭️ Omitidas: ${omitidas}`);
    console.log(`   📝 Total procesadas: ${categorias.length}`);
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Función para listar categorías existentes
async function listarCategorias() {
  try {
    const categorias = await prisma.categoria.findMany({
      orderBy: { nombre: 'asc' }
    });
    
    console.log('\n📋 Categorías en la base de datos:');
    categorias.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.nombre} (ID: ${cat.id})`);
    });
    
    return categorias;
  } catch (error) {
    console.error('❌ Error al listar categorías:', error);
    return [];
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  insertarCategorias()
    .then(() => listarCategorias())
    .then(() => {
      console.log('\n🎉 Proceso de categorías completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { insertarCategorias, listarCategorias };