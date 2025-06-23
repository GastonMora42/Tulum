// scripts/insertar/carga-humidificadores-2025.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Datos de humidificadores desde la planilla
const humidificadoresData = `
HUMIS CON FILTRO	CARBON MADERA CLARA-WM074 MC	6	6	6	6	1	49000
HUMIS CON FILTRO	CARBON MADERA OSCURA-WM074MO	6	6	6	6	1	49000
HUMIS CON FILTRO	FLOR MADERA OSCURA-WM035MO	6	6	6	6	1	45900
HUMIS CON FILTRO	FLOR MADERA CLARA -WM035MC	6	6	6	6	1	45900
HUMIS CON FILTRO	FLORERO CHICO CON FILTRO-V01	6	6	6	6	1	42500
HUMIS GRANDES	BARCO-WMV75	3	3	3	3	1	149000
HUMIS GRANDES	DIFUSOR DE AROMA MADERA OSCURA-WM016BMO	3	3	3	3	1	95500
HUMIS GRANDES	DIFUSOR DE AROMA MADERA CLARA-WM016BMC	3	3	3	3	1	95500
HUMIS GRANDES	MEDUSA -WMV80	3	3	3	3	1	149000
HUMIS GRANDES	DINAMICO CON RELOJ-WM285	3	3	3	3	1	195000
HUMIS GRANDES	FOGATA-WMPW01	3	3	3	3	1	95500
HUMIS GRANDES	GRANO DE MADERA OSCURA-WM020MO	3	3	3	3	1	95500
HUMIS GRANDES	GRANO DE MADERA CLARA-WM020MC	3	3	3	3	1	95500
HUMIS GRANDES	LLAMA CON RELOJ LED -WM174	3	3	3	3	1	139900
HUMIS GRANDES	LLAMA DE CHIMENEA NEGRO-WM199BLACK	3	3	3	3	1	89900
HUMIS GRANDES	LLAMA DE CHIMENEA BLANCO-WM199WHITE	3	3	3	3	1	89900
HUMIS GRANDES	PIEDRA DE SAL Y LLAMA-WM282	3	3	3	3	1	149000
HUMIS GRANDES	TIPO CEBOLLA MADERA OSCURA-WM021MO	3	3	3	3	1	45900
HUMIS GRANDES	TIPO CEBOLLA MADERA CLARA-WM021MC	3	3	3	3	1	45900
HUMIS GRANDES	TIPO JARRON MADERA CLARA-WM029MC	3	3	3	3	1	95500
HUMIS GRANDES	TIPO JARRON MADERA OSCURA-WM029MO	3	3	3	3	1	95500
HUMIS GRANDES	TRENCITO NEGRO-WM178BLACK	3	3	3	3	1	149000
HUMIS GRANDES	VOLCAN MEDUSA MADERA CLARA-WM158MC	3	3	3	3	1	180000
HUMIS GRANDES	VOLCAN MEDUSA BLANCO-WM158WHITE	3	3	3	3	1	180000
HUMIS GRANDES	VOLCAN Y LLAMA BLANCO-WM163WHITE	3	3	3	3	1	120000
HUMIS GRANDES	VOLCAN Y LLAMA DOBLE LUZ-WM161	3	3	3	3	1	110000
HUMIS GRANDES	VOLCAN Y LLAMA NEGRO-WM163BLACK	3	3	3	3	1	120000
HUMIS MEDIANOS	ABERTURA-K01	4	4	4	4	1	74500
HUMIS MEDIANOS	AROMA VOLCAN LLAMA NEGRO-WMV33CBLACK	4	4	4	4	1	89000
HUMIS MEDIANOS	AROMA VOLCAN LLAMA BLANCO-WMV33CWHITE	4	4	4	4	1	89000
HUMIS MEDIANOS	BASE MADERA 300-K05	4	4	4	4	1	74500
HUMIS MEDIANOS	BOSQUE MADERA CLARA-WM168	4	4	4	4	1	95500
HUMIS MEDIANOS	CON LLAMA OVAL BLANCO-WM173WHITE	4	4	4	4	1	69000
HUMIS MEDIANOS	CON LLAMA OVAL MADERA-WM173WOOD	4	4	4	4	1	69000
HUMIS MEDIANOS	CON LLAMA OVAL NEGRO-WM173 BLACK	4	4	4	4	1	69000
HUMIS MEDIANOS	EFECTO LLAMA BLANCO-WM165	4	4	4	4	1	89000
HUMIS MEDIANOS	FLORERO CHICO-K04	4	4	4	4	1	74500
HUMIS MEDIANOS	LLAMA BLANCO-WM190WHITE	4	4	4	4	1	79000
HUMIS MEDIANOS	LLAMA NEGRO-WM190BLACK	4	4	4	4	1	79000
HUMIS MEDIANOS	LLAMA LARGA BLANCO-WM191WHITE	4	4	4	4	1	120000
HUMIS MEDIANOS	LLAMA LARGA NEGRO-WM191BLACK	4	4	4	4	1	120000
HUMIS MEDIANOS	PIEDRA DE SAL Y LLAMA BLANCO-WM175WHITE	4	4	4	4	1	120000
HUMIS MEDIANOS	PLANETA AGRIETADO BLANCO-WM196WHITE	4	4	4	4	1	95500
HUMIS MEDIANOS	PLANETA AGRIETADO NEGRO-WM196BLACK	4	4	4	4	1	95500
HUMIS MEDIANOS	REDONDO SIN FILTRO-K02	4	4	4	4	1	74500
HUMIS MEDIANOS	ROCA DE SAL Y LLAMA BLANCO-WM159WHITE	4	4	4	4	1	89000
HUMIS MEDIANOS	ROCA DE SAL Y LLAMA NEGRO-WM159BLACK	4	4	4	4	1	89000
HUMIS MEDIANOS	ROCAS DE CRISTAL-WM0630C	4	4	4	4	1	75000
HUMIS MEDIANOS	TRANSPARENTE ARRIBA-K03	4	4	4	4	1	74500
HUMIS MEDIANOS	VOLCAN REDONDO BLANCO-WM157WHITE	4	4	4	4	1	89000
HUMIS MEDIANOS	VOLCAN REDONDO NEGRO-WM157BLACK	4	4	4	4	1	89000
`.trim();

// Función para generar código de barras EAN-13 para humidificadores
function generarCodigoBarrasHumis(secuencia) {
  const paisArg = '779';
  const empresa = '3000'; // Código específico para humidificadores
  const producto = secuencia.toString().padStart(5, '0');
  
  const base = paisArg + empresa + producto;
  
  let suma = 0;
  for (let i = 0; i < 12; i++) {
    const digito = parseInt(base[i]);
    suma += (i % 2 === 0) ? digito : digito * 3;
  }
  
  const digitoVerificador = (10 - (suma % 10)) % 10;
  return base + digitoVerificador;
}

// Función para procesar línea de humidificador
function procesarLineaHumidificador(linea, indice) {
  const partes = linea.split('\t').filter(p => p.trim());
  
  if (partes.length < 8) {
    console.warn(`Línea ${indice + 1} incompleta:`, linea);
    return null;
  }
  
  const categoria = partes[0].trim();
  const nombre = partes[1].trim();
  const shoppingPatagonia = parseInt(partes[2]) || 0;
  const altoCamahue = parseInt(partes[3]) || 0;
  const mendozaShopping = parseInt(partes[4]) || 0;
  const palmares = parseInt(partes[5]) || 0;
  const stockMinimo = parseInt(partes[6]) || 1;
  const precio = parseFloat(partes[7]) || 0;
  
  return {
    categoria,
    nombre: `HUMIDIFICADOR ${nombre}`,
    precio,
    stockMinimo,
    stockMaximoPorSucursal: {
      'Shopping patagonia - bariloche': shoppingPatagonia,
      'ALTO COMAHUE': altoCamahue,
      'Sucursal Mendoza': mendozaShopping,
      'Sucursal Mendoza PALMARES': palmares
    }
  };
}

// Función para crear categorías de humidificadores
async function crearCategoriasHumidificadores() {
  console.log('📂 Creando categorías de humidificadores...');
  
  const categorias = [
    'Humidificadores con Filtro',
    'Humidificadores Grandes', 
    'Humidificadores Medianos'
  ];
  
  const categoriaMap = new Map();
  
  for (const nombreCategoria of categorias) {
    try {
      let categoria = await prisma.categoria.findUnique({
        where: { nombre: nombreCategoria }
      });
      
      if (!categoria) {
        categoria = await prisma.categoria.create({
          data: { 
            nombre: nombreCategoria,
            imagen: `/images/categorias/humidificadores.webp` // Imagen genérica
          }
        });
        console.log(`   ✅ Categoría creada: ${nombreCategoria}`);
      } else {
        console.log(`   ✅ Categoría encontrada: ${nombreCategoria}`);
      }
      
      categoriaMap.set(nombreCategoria, categoria.id);
    } catch (error) {
      console.error(`   ❌ Error con categoría ${nombreCategoria}:`, error.message);
    }
  }
  
  return categoriaMap;
}

// Mapeo de categorías
const categoriasMapping = {
  'HUMIS CON FILTRO': 'Humidificadores con Filtro',
  'HUMIS GRANDES': 'Humidificadores Grandes',
  'HUMIS MEDIANOS': 'Humidificadores Medianos'
};

// Función para obtener usuario admin
async function obtenerUsuarioAdmin() {
  const adminUser = await prisma.user.findFirst({
    where: { roleId: 'role-admin' }
  });
  
  if (!adminUser) {
    throw new Error('No se encontró usuario admin');
  }
  
  return adminUser.id;
}

// Función principal
async function cargarHumidificadores() {
  console.log('🌊 === CARGA DE HUMIDIFICADORES 2025 ===\n');
  
  try {
    const adminUserId = await obtenerUsuarioAdmin();
    console.log(`✅ Usuario admin encontrado: ${adminUserId}`);
    
    // 1. Procesar datos
    console.log('\n📋 Procesando datos de humidificadores...');
    const lineas = humidificadoresData.split('\n').filter(l => l.trim());
    const humidificadoresProcessed = [];
    
    for (let i = 0; i < lineas.length; i++) {
      const humidificador = procesarLineaHumidificador(lineas[i], i);
      if (humidificador) {
        humidificadoresProcessed.push(humidificador);
      }
    }
    
    console.log(`   ✅ ${humidificadoresProcessed.length} humidificadores procesados`);
    
    // 2. Crear/obtener categorías
    const categoriaMap = await crearCategoriasHumidificadores();
    
    // 3. Obtener sucursales
    console.log('\n🏢 Obteniendo sucursales...');
    const sucursales = await prisma.ubicacion.findMany({
      where: { tipo: 'sucursal' }
    });
    const sucursalMap = new Map();
    
    sucursales.forEach(suc => {
      sucursalMap.set(suc.nombre, suc.id);
    });
    
    console.log(`   ✅ ${sucursales.length} sucursales encontradas`);
    
    // 4. Crear humidificadores
    console.log('\n🌊 Creando humidificadores...');
    
    let creados = 0;
    let errores = 0;
    const humidificadoresCreados = [];
    
    for (let i = 0; i < humidificadoresProcessed.length; i++) {
      const item = humidificadoresProcessed[i];
      
      try {
        // Obtener categoría
        const categoriaNombre = categoriasMapping[item.categoria] || item.categoria;
        const categoriaId = categoriaMap.get(categoriaNombre);
        
        if (!categoriaId) {
          throw new Error(`Categoría "${categoriaNombre}" no encontrada`);
        }
        
        // Generar código de barras único
        const codigoBarras = generarCodigoBarrasHumis(i + 1);
        
        // Crear humidificador
        const humidificador = await prisma.producto.create({
          data: {
            nombre: item.nombre,
            descripcion: `${item.categoria} - Modelo: ${item.nombre.replace('HUMIDIFICADOR ', '')}`,
            precio: item.precio,
            codigoBarras: codigoBarras,
            categoriaId: categoriaId,
            stockMinimo: item.stockMinimo,
            activo: true
          }
        });
        
        humidificadoresCreados.push({
          ...humidificador,
          stockMaximoPorSucursal: item.stockMaximoPorSucursal
        });
        
        creados++;
        
        if (creados % 20 === 0) {
          console.log(`   🌊 ${creados} humidificadores creados...`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error con "${item.nombre}": ${error.message}`);
        errores++;
      }
    }
    
    console.log(`   ✅ ${creados} humidificadores creados, ${errores} errores`);
    
    // 5. Configurar stock por sucursal
    console.log('\n⚙️ Configurando stock de humidificadores...');
    
    let configsCreadas = 0;
    
    for (const humidificador of humidificadoresCreados) {
      for (const [nombreSucursal, stockMaximo] of Object.entries(humidificador.stockMaximoPorSucursal)) {
        const sucursalId = sucursalMap.get(nombreSucursal);
        
        if (!sucursalId) {
          console.warn(`   ⚠️ Sucursal "${nombreSucursal}" no encontrada`);
          continue;
        }
        
        try {
          await prisma.stockConfigSucursal.create({
            data: {
              productoId: humidificador.id,
              sucursalId: sucursalId,
              stockMaximo: stockMaximo,
              stockMinimo: humidificador.stockMinimo,
              puntoReposicion: Math.ceil(stockMaximo * 0.4), // 40% para humidificadores
              creadoPor: adminUserId,
              activo: true
            }
          });
          
          configsCreadas++;
          
        } catch (error) {
          console.error(`   ❌ Error config ${humidificador.nombre} - ${nombreSucursal}: ${error.message}`);
        }
      }
    }
    
    console.log(`   ✅ ${configsCreadas} configuraciones de stock creadas`);
    
    // 6. Resumen por categoría
    console.log('\n📊 Resumen por categoría:');
    const resumenCategorias = {};
    
    for (const item of humidificadoresProcessed) {
      const cat = categoriasMapping[item.categoria] || item.categoria;
      if (!resumenCategorias[cat]) {
        resumenCategorias[cat] = 0;
      }
      resumenCategorias[cat]++;
    }
    
    for (const [categoria, cantidad] of Object.entries(resumenCategorias)) {
      console.log(`   🏷️ ${categoria}: ${cantidad} productos`);
    }
    
    // 7. Verificación final
    console.log('\n🔍 Muestra de humidificadores creados:');
    const muestra = await prisma.producto.findMany({
      take: 3,
      where: {
        nombre: { startsWith: 'HUMIDIFICADOR' }
      },
      include: { 
        categoria: true,
        stockConfigs: true
      },
      orderBy: { nombre: 'asc' }
    });
    
    muestra.forEach(producto => {
      console.log(`   🌊 ${producto.nombre} - ${producto.categoria.nombre} - $${producto.precio}`);
      console.log(`      Código: ${producto.codigoBarras}, Configs: ${producto.stockConfigs.length}`);
    });
    
    console.log('\n🎉 === HUMIDIFICADORES CARGADOS EXITOSAMENTE ===');
    
    return {
      humidificadoresCreados: creados,
      errores,
      configuracionesStock: configsCreadas,
      categorias: Object.keys(resumenCategorias).length
    };
    
  } catch (error) {
    console.error('\n💥 === ERROR EN LA CARGA ===');
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  cargarHumidificadores()
    .then((resultado) => {
      console.log(`\n🏁 Carga completada: ${resultado.humidificadoresCreados} humidificadores`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error fatal:', error.message);
      process.exit(1);
    });
}

module.exports = { cargarHumidificadores };