// scripts/insertar-recetas.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Datos de recetas basados en el Excel proporcionado
const recetasData = [
  // HOME SPRAYS
  {
    categoria: 'home spray',
    tipo: 'Home Spray',
    aromas: ['calm', 'live', 'quintana roo', 'ser', 'caribean', 'relax', 'sweet', 'harmony', 'love', 'puro'],
    ingredientes: [
      { nombre: 'Perfumina', cantidad: 0.238, unidad: 'litro' },
      { nombre: 'Envase plástico Lyon 250 ámbar', cantidad: 1, unidad: 'unidad' },
      { nombre: 'Tapa spray enfundada plata brillo', cantidad: 1, unidad: 'unidad' },
      { nombre: 'Etiqueta pote 250', cantidad: 1, unidad: 'unidad' }
    ],
    rendimiento: 1,
    rubro: 'fraccionado'
  },
  
  // FRAGANCIAS TEXTILES
  {
    categoria: 'fragancia textil',
    tipo: 'Fragancia Textil',
    aromas: ['cher', 'wana', 'coni', 'tomi', 'millon', 'akia', 'cuero', 'kosiuk', 'crombie', 'yapa'],
    ingredientes: [
      { nombre: 'Perfumina', cantidad: 0.238, unidad: 'litro' },
      { nombre: 'Envase plástico Lyon 250 ámbar', cantidad: 1, unidad: 'unidad' },
      { nombre: 'Tapa gatillo negro', cantidad: 1, unidad: 'unidad' },
      { nombre: 'Etiqueta pote 250', cantidad: 1, unidad: 'unidad' }
    ],
    rendimiento: 1,
    rubro: 'fraccionado'
  },
  
  // ESENCIAS HUMIDIFICADOR
  {
    categoria: 'esencia humidificador',
    tipo: 'Esencia Humidificador',
    aromas: [
      'AKITA', 'AMSTERDAM', 'APHRODITA', 'BERGAMOTA', 'CALIFORNIA', 'BELICE', 'CANCUN', 'CARIBEAN',
      'CHANDAL', 'CHICLE', 'DELICATEZA', 'EUCALIPTO', 'GROSEILLE', 'GINGERMINJ', 'KANNAUJ', 'LAVANDA',
      'MADRE SELVA', 'LEMONGRASS', 'LOTUS FRESH', 'MALASIA', 'MANGO MARACUYA', 'MONASTRELL',
      'NARANJA PIMIENTA', 'ORANGE', 'ORQUIDEA NEGRA', 'PARADISE', 'PITANGA', 'POMELO BLUEBERRY',
      'SAI BABA', 'TAHITI', 'GREEN TEA', 'TE VERDE Y JENGIBRE', 'ULTRA VIOLET', 'UVA Y FRUTOS ROJOS',
      'VAINICOCO', 'VAINILLA CEDRO', 'VAINILLA CARAMELO'
    ],
    ingredientes: [
      { nombre: 'Esencia', cantidad: 0.130, unidad: 'litro' },
      { nombre: 'Envase plástico Lyon 125 ámbar', cantidad: 1, unidad: 'unidad' },
      { nombre: 'Tapa free top negra', cantidad: 1, unidad: 'unidad' },
      { nombre: 'Etiqueta pote 125', cantidad: 1, unidad: 'unidad' }
    ],
    rendimiento: 1,
    rubro: 'preparado y fraccionado',
    notas: 'Preparado: esencia pura x 1 litro + agua x 8 litros = total 9 litros'
  },
  
  // JABONES LÍQUIDOS
  {
    categoria: 'jabon liquido',
    tipo: 'Jabón Líquido',
    aromas: ['ALOE', 'CANCUN', 'CHANDAL', 'IBISCUS', 'MANGO Y MARACUYA', 'PARADISE', 'VAINICOCO'],
    ingredientes: [
      { nombre: 'Jabón líquido', cantidad: 0.20, unidad: 'litro' },
      { nombre: 'Esencia', cantidad: 0.025, unidad: 'litro' },
      { nombre: 'Envase plástico Lyon 250 ámbar', cantidad: 1, unidad: 'unidad' },
      { nombre: 'Cremera enfundada plata brillo pico negro', cantidad: 1, unidad: 'unidad' },
      { nombre: 'Etiqueta pote 250', cantidad: 1, unidad: 'unidad' }
    ],
    rendimiento: 1,
    rubro: 'preparado y fraccionado',
    notas: 'Preparado: jabón neutro x 5 litros + esencia aroma 25grs = total 5 litros'
  },
  
  // DIFUSORES
  {
    categoria: 'difusor',
    tipo: 'Difusor',
    aromas: [
      'ALMENDRAS', 'BAMBU', 'BERGAMOTA', 'CALOR DE HOGAR', 'CITRONELLA', 'FLORES BLANCAS',
      'FRUTOS ROJOS', 'GARDENIA', 'JAZMIN', 'LAVANDA Y ROMERO', 'LEMONGRASS', 'LIMON Y JENGIBRE',
      'MADERAS DEL ORIENTE', 'MANGO', 'MANGO Y MARACUYA', 'NAGCHAMPA', 'NARANJA CANELA',
      'NARANJA Y JENGIBRE', 'NARANJA Y PIMIENTA', 'ORANGE', 'PALO SANTO', 'PERAS Y FLORES',
      'ROSAS', 'SAI BABA', 'SANDALO', 'TE VERDE', 'TILO', 'VAINICOCO', 'VAINILLA', 'VERBENA', 'WANAMA'
    ],
    ingredientes: [
      { nombre: 'Líquido para difusor', cantidad: 0.222, unidad: 'litro' },
      { nombre: 'Envase plástico Lyon 250 ámbar', cantidad: 1, unidad: 'unidad' },
      { nombre: 'Tapa difusor aluminio cobre', cantidad: 1, unidad: 'unidad' },
      { nombre: 'Etiqueta pote 250', cantidad: 1, unidad: 'unidad' },
      { nombre: 'Varillas de rattan para difusores', cantidad: 6, unidad: 'unidad' },
      { nombre: 'Caja para difusores', cantidad: 1, unidad: 'unidad' },
      { nombre: 'Etiqueta caja difusor', cantidad: 1, unidad: 'unidad' }
    ],
    rendimiento: 1,
    rubro: 'fraccionado'
  },
  
  // SALES DE BAÑO
  {
    categoria: 'sal de baño',
    tipo: 'Sales de Baño',
    aromas: ['VAINICOCO', 'EUCALIPTO', 'FRUTOS ROJOS', 'LAVANDA', 'MARINA', 'ROSAS', 'TILO', 'VAINILLA'],
    ingredientes: [
      { nombre: 'Sal de baño', cantidad: 0.125, unidad: 'kilogramo' },
      { nombre: 'Pote pack envase plástico transparente PET Oslo 130cm3', cantidad: 1, unidad: 'unidad' },
      { nombre: 'Tapa ciega oro', cantidad: 1, unidad: 'unidad' },
      { nombre: 'Etiqueta envase sales', cantidad: 1, unidad: 'unidad' }
    ],
    rendimiento: 1,
    rubro: 'fraccionado'
  },
  
  // ESPUMAS DE BAÑO
  {
    categoria: 'espuma de baño',
    tipo: 'Espuma de Baño',
    aromas: ['ALMENDRAS', 'EUCALIPTO', 'FLORAL', 'FRUTAL', 'FRUTOS ROJOS', 'LAVANDA', 'ROSA MOSQUETA', 'ROSAS', 'TILO', 'VAINICOCO'],
    ingredientes: [
      { nombre: 'Espuma de baño', cantidad: 0.20, unidad: 'litro' },
      { nombre: 'Envase plástico Sevilla 200 ámbar', cantidad: 1, unidad: 'unidad' },
      { nombre: 'Tapa ciega oro', cantidad: 1, unidad: 'unidad' },
      { nombre: 'Etiqueta pote 125', cantidad: 1, unidad: 'unidad' }
    ],
    rendimiento: 1,
    rubro: 'fraccionado'
  }
];

async function obtenerMapeoInsumos() {
  console.log('🗺️ Creando mapeo de insumos...');
  
  const insumos = await prisma.insumo.findMany({
    where: { activo: true }
  });
  
  const mapeo = new Map();
  insumos.forEach(insumo => {
    mapeo.set(insumo.nombre.toLowerCase(), insumo);
  });
  
  console.log(`   Mapeados ${mapeo.size} insumos`);
  return mapeo;
}

async function obtenerMapeoProductos() {
  console.log('🗺️ Creando mapeo de productos...');
  
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    include: { categoria: true }
  });
  
  const mapeo = new Map();
  productos.forEach(producto => {
    // Crear claves de búsqueda flexibles
    const claves = [
      producto.nombre.toLowerCase(),
      `${producto.categoria.nombre.toLowerCase()} ${producto.nombre.toLowerCase()}`,
      producto.nombre.toLowerCase().replace(/[^a-z0-9]/g, ''),
    ];
    
    claves.forEach(clave => {
      mapeo.set(clave, producto);
    });
  });
  
  console.log(`   Mapeados ${productos.length} productos con ${mapeo.size} claves de búsqueda`);
  return mapeo;
}

function buscarInsumo(nombreInsumo, mapeoInsumos) {
  // Buscar exacto primero
  let insumo = mapeoInsumos.get(nombreInsumo.toLowerCase());
  
  if (!insumo) {
    // Buscar por coincidencia parcial
    for (const [key, value] of mapeoInsumos.entries()) {
      if (key.includes(nombreInsumo.toLowerCase()) || nombreInsumo.toLowerCase().includes(key)) {
        insumo = value;
        break;
      }
    }
  }
  
  return insumo;
}

function buscarProducto(tipoProducto, aroma, mapeoProductos) {
  const posiblesNombres = [
    `${tipoProducto.toLowerCase()} ${aroma.toLowerCase()}`,
    `${aroma.toLowerCase()} ${tipoProducto.toLowerCase()}`,
    `${tipoProducto.toLowerCase()}`,
    aroma.toLowerCase()
  ];
  
  for (const nombre of posiblesNombres) {
    const producto = mapeoProductos.get(nombre);
    if (producto) {
      return producto;
    }
  }
  
  return null;
}

async function insertarRecetas() {
  console.log('📋 === INSERTANDO RECETAS ===\n');
  
  try {
    const mapeoInsumos = await obtenerMapeoInsumos();
    const mapeoProductos = await obtenerMapeoProductos();
    
    let recetasCreadas = 0;
    let recetasOmitidas = 0;
    let errores = 0;
    
    for (const recetaData of recetasData) {
      console.log(`\n🔄 Procesando ${recetaData.tipo}...`);
      
      for (const aroma of recetaData.aromas) {
        try {
          const nombreReceta = `${recetaData.tipo} ${aroma}`;
          
          // Verificar si ya existe
          const existente = await prisma.receta.findFirst({
            where: { nombre: nombreReceta }
          });
          
          if (existente) {
            console.log(`   ⏭️ Receta "${nombreReceta}" ya existe, omitiendo...`);
            recetasOmitidas++;
            continue;
          }
          
          // Verificar ingredientes
          const ingredientesValidos = [];
          let ingredientesFaltantes = [];
          
          for (const ingrediente of recetaData.ingredientes) {
            const insumo = buscarInsumo(ingrediente.nombre, mapeoInsumos);
            if (insumo) {
              ingredientesValidos.push({
                insumo,
                cantidad: ingrediente.cantidad
              });
            } else {
              ingredientesFaltantes.push(ingrediente.nombre);
            }
          }
          
          if (ingredientesFaltantes.length > 0) {
            console.log(`   ⚠️ Ingredientes faltantes para "${nombreReceta}": ${ingredientesFaltantes.join(', ')}`);
          }
          
          if (ingredientesValidos.length === 0) {
            console.log(`   ❌ No se encontraron ingredientes válidos para "${nombreReceta}"`);
            errores++;
            continue;
          }
          
          // Crear receta en transacción
          await prisma.$transaction(async (tx) => {
            // 1. Crear receta
            const receta = await tx.receta.create({
              data: {
                nombre: nombreReceta,
                descripcion: `${recetaData.tipo} con aroma ${aroma}${recetaData.notas ? '. ' + recetaData.notas : ''}`,
                rendimiento: recetaData.rendimiento
              }
            });
            
            // 2. Crear items de receta
            for (const ingrediente of ingredientesValidos) {
              await tx.recetaItem.create({
                data: {
                  recetaId: receta.id,
                  insumoId: ingrediente.insumo.id,
                  cantidad: ingrediente.cantidad
                }
              });
            }
            
            // 3. Buscar y asociar producto si existe
            const producto = buscarProducto(recetaData.tipo, aroma, mapeoProductos);
            if (producto) {
              await tx.productoReceta.create({
                data: {
                  recetaId: receta.id,
                  productoId: producto.id
                }
              });
              console.log(`   ✅ Receta "${nombreReceta}" creada y asociada al producto "${producto.nombre}"`);
            } else {
              console.log(`   ✅ Receta "${nombreReceta}" creada (sin producto asociado)`);
            }
          });
          
          recetasCreadas++;
          
        } catch (error) {
          console.error(`   ❌ Error creando receta "${recetaData.tipo} ${aroma}":`, error.message);
          errores++;
        }
      }
    }
    
    console.log(`\n📊 Resumen de recetas:`);
    console.log(`   ✅ Creadas: ${recetasCreadas}`);
    console.log(`   ⏭️ Omitidas: ${recetasOmitidas}`);
    console.log(`   ❌ Errores: ${errores}`);
    
    return { recetasCreadas, recetasOmitidas, errores };
    
  } catch (error) {
    console.error('❌ Error general:', error);
    throw error;
  }
}

async function listarRecetas() {
  try {
    const recetas = await prisma.receta.findMany({
      include: {
        items: { include: { insumo: true } },
        productoRecetas: { include: { producto: true } }
      },
      orderBy: { nombre: 'asc' }
    });
    
    console.log('\n📋 Recetas en la base de datos:');
    
    const recetasPorTipo = recetas.reduce((acc, receta) => {
      const tipo = receta.nombre.split(' ')[0] + ' ' + receta.nombre.split(' ')[1];
      if (!acc[tipo]) {
        acc[tipo] = [];
      }
      acc[tipo].push(receta);
      return acc;
    }, {});
    
    Object.entries(recetasPorTipo).forEach(([tipo, recetas]) => {
      console.log(`\n   📂 ${tipo}:`);
      recetas.forEach((receta, index) => {
        const productosAsociados = receta.productoRecetas.length;
        const ingredientes = receta.items.length;
        console.log(`      ${index + 1}. ${receta.nombre} (${ingredientes} ingredientes, ${productosAsociados} productos)`);
      });
    });
    
    return recetas;
  } catch (error) {
    console.error('❌ Error al listar recetas:', error);
    return [];
  }
}

async function insertarRecetasCompleto() {
  console.log('🔄 === INSERCIÓN COMPLETA DE RECETAS ===\n');
  
  try {
    // 1. Insertar recetas
    const resultado = await insertarRecetas();
    
    // 2. Mostrar listado final
    console.log('\n📋 Listado final de recetas:');
    await listarRecetas();
    
    console.log('\n🎉 === INSERCIÓN COMPLETADA ===');
    console.log('✅ Recetas insertadas correctamente');
    
    return resultado;
    
  } catch (error) {
    console.error('❌ Error durante la inserción:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  insertarRecetasCompleto()
    .then(() => {
      console.log('\n🎉 Proceso de inserción de recetas completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { 
  insertarRecetasCompleto,
  insertarRecetas, 
  listarRecetas
};