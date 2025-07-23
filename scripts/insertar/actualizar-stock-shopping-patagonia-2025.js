// scripts/insertar/actualizar-stock-shopping-patagonia-2025.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🔥 DATOS ACTUALIZADOS DE STOCK PARA SHOPPING PATAGONIA - BARILOCHE
const stockActualizadoData = `
DIFUSORES DE AUTO	DIFUSOR DE AUTO   	86
DIFUSORES DE AUTO	REC. DIFU. AUTO AUTO NUEVO 	0
DIFUSORES DE AUTO	REC. DIFU. AUTO BAMBU  	0
DIFUSORES DE AUTO	REC. DIFU. AUTO FLORES BLANCAS 	1
DIFUSORES DE AUTO	REC. DIFU. AUTO FRUTOS ROJOS 	0
DIFUSORES DE AUTO	REC. DIFU. AUTO LEMON GRASS 	3
DIFUSORES DE AUTO	REC. DIFU. AUTO LIMON Y JENGIBRE	4
DIFUSORES DE AUTO	REC. DIFU. AUTO MANGO  	3
DIFUSORES DE AUTO	REC. DIFU. AUTO NARANJA Y CANELA	12
DIFUSORES DE AUTO	REC. DIFU. AUTO NARANJA Y JENGIBRE	7
DIFUSORES DE AUTO	REC. DIFU. AUTO NARANJA Y PIMIENTA	2
DIFUSORES DE AUTO	REC. DIFU. AUTO PERAS Y FLORES	0
DIFUSORES DE AUTO	REC. DIFU. AUTO ROSAS  	5
DIFUSORES DE AUTO	REC. DIFU. AUTO SANDALO  	5
DIFUSORES DE AUTO	REC. DIFU. AUTO TE VERDE 	0
DIFUSORES DE AUTO	REC. DIFU. AUTO VAINICOCO  	2
DIFUSORES DE AUTO	REC. DIFU. AUTO VAINILLA  	0
DIFUSORES DE AUTO	REC.DIFU. AUTO LAVANDA   	5
DIFUSORES DE HOGAR	DIFUSOR ALMENDRAS  	9
DIFUSORES DE HOGAR	DIFUSOR BAMBU  	8
DIFUSORES DE HOGAR	DIFUSOR BERGAMOTA  	8
DIFUSORES DE HOGAR	DIFUSOR CALOR DE HOGAR	13
DIFUSORES DE HOGAR	DIFUSOR CITRONELLA  	5
DIFUSORES DE HOGAR	DIFUSOR FLORES BLANCAS 	11
DIFUSORES DE HOGAR	DIFUSOR FRUTOS ROJOS 	9
DIFUSORES DE HOGAR	DIFUSOR GARDENIA  	3
DIFUSORES DE HOGAR	DIFUSOR JAZMIN  	11
DIFUSORES DE HOGAR	DIFUSOR LAVANDA Y ROMERO	9
DIFUSORES DE HOGAR	DIFUSOR LEMONGRASS  	10
DIFUSORES DE HOGAR	DIFUSOR LIMON Y JENGIBRE	7
DIFUSORES DE HOGAR	DIFUSOR MADERAS DEL ORIENTE	13
DIFUSORES DE HOGAR	DIFUSOR MANGO  	20
DIFUSORES DE HOGAR	DIFUSOR MANGO Y MARACUYA	12
DIFUSORES DE HOGAR	DIFUSOR NAGCHAMPA  	12
DIFUSORES DE HOGAR	DIFUSOR NARANJA CANELA 	10
DIFUSORES DE HOGAR	DIFUSOR NARANJA Y JENGIBRE	9
DIFUSORES DE HOGAR	DIFUSOR NARANJA Y PIMIENTA	12
DIFUSORES DE HOGAR	DIFUSOR ORANGE  	11
DIFUSORES DE HOGAR	DIFUSOR PALO SANTO 	12
DIFUSORES DE HOGAR	DIFUSOR PERAS Y FLORES	10
DIFUSORES DE HOGAR	DIFUSOR ROSAS  	11
DIFUSORES DE HOGAR	DIFUSOR SAI BABA 	11
DIFUSORES DE HOGAR	DIFUSOR SANDALO  	4
DIFUSORES DE HOGAR	DIFUSOR TE VERDE 	7
DIFUSORES DE HOGAR	DIFUSOR TILO  	2
DIFUSORES DE HOGAR	DIFUSOR VAINICOCO  	0
DIFUSORES DE HOGAR	DIFUSOR VAINILLA  	10
DIFUSORES DE HOGAR	DIFUSOR VERBENA  	5
DIFUSORES DE HOGAR	DIFUSOR WANAMA  	7
ESENCIAS HUMIDIFICADORES	ES.HUMI.AKITA     	12
ESENCIAS HUMIDIFICADORES	ES.HUMI.AMSTERDAM     	14
ESENCIAS HUMIDIFICADORES	ES.HUMI.APHRODITA     	6
ESENCIAS HUMIDIFICADORES	ES.HUMI.BELICE     	6
ESENCIAS HUMIDIFICADORES	ES.HUMI.BERGAMOTA     	10
ESENCIAS HUMIDIFICADORES	ES.HUMI. CALIDO ATARDECER	3
ESENCIAS HUMIDIFICADORES	ES.HUMI.CALIFORNIA     	12
ESENCIAS HUMIDIFICADORES	ES.HUMI.CANCUN     	10
ESENCIAS HUMIDIFICADORES	ES.HUMI.CARIBEAN     	10
ESENCIAS HUMIDIFICADORES	ES.HUMI.CHANDAL     	5
ESENCIAS HUMIDIFICADORES	ES.HUMI.CHICLE     	10
ESENCIAS HUMIDIFICADORES	ES.HUMI.DELICATEZA     	2
ESENCIAS HUMIDIFICADORES	ES.HUMI.EUCALIPTO     	2
ESENCIAS HUMIDIFICADORES	ES.HUMI.GINGER     	0
ESENCIAS HUMIDIFICADORES	ES.HUMI.GREEN TEA    	7
ESENCIAS HUMIDIFICADORES	ES.HUMI.GROSEILLE     	5
ESENCIAS HUMIDIFICADORES	ES.HUMI.KANNAUJ     	3
ESENCIAS HUMIDIFICADORES	ES.HUMI.LAVANDA     	4
ESENCIAS HUMIDIFICADORES	ES.HUMI.LEMON     	11
ESENCIAS HUMIDIFICADORES	ES.HUMI.LOTUS FRESH    	0
ESENCIAS HUMIDIFICADORES	ES.HUMI.MADRE SELVA    	7
ESENCIAS HUMIDIFICADORES	ES.HUMI.MALASIA     	3
ESENCIAS HUMIDIFICADORES	ES.HUMI.MANGO Y MARACUYA   	11
ESENCIAS HUMIDIFICADORES	ES.HUMI. MISS YOU	10
ESENCIAS HUMIDIFICADORES	ES.HUMI.MONASTRELL     	6
ESENCIAS HUMIDIFICADORES	ES.HUMI.NARANJA Y PIMIENTA   	1
ESENCIAS HUMIDIFICADORES	ES.HUMI.ORANGE     	7
ESENCIAS HUMIDIFICADORES	ES.HUMI.ORQUIDEA NEGRA    	4
ESENCIAS HUMIDIFICADORES	ES.HUMI.PARADISE     	6
ESENCIAS HUMIDIFICADORES	ES.HUMI.PITANGA     	7
ESENCIAS HUMIDIFICADORES	ES.HUMI.POMELO BLUEBERRY    	2
ESENCIAS HUMIDIFICADORES	ES.HUMI.SAI BABA    	5
ESENCIAS HUMIDIFICADORES	ES.HUMI.TAHITI     	1
ESENCIAS HUMIDIFICADORES	ES.HUMI.TE VERDE Y JENGIBRE  	0
ESENCIAS HUMIDIFICADORES	ES.HUMI.ULTRA VIOLET    	2
ESENCIAS HUMIDIFICADORES	ES.HUMI.UVA Y FRUTOS ROJOS  	1
ESENCIAS HUMIDIFICADORES	ES.HUMI.VAINILLA CARAMELO    	4
ESENCIAS HUMIDIFICADORES	ES.HUMI.VAINILLA CEDRO    	5
ESENCIAS HUMIDIFICADORES	ES.HUMI.VAINILLA COCO    	0
ESPUMAS DE BAÑO	ESP. DE BAÑO ALMENDRAS  	8
ESPUMAS DE BAÑO	ESP. DE BAÑO EUCALIPTO  	9
ESPUMAS DE BAÑO	ESP. DE BAÑO FLORAL  	7
ESPUMAS DE BAÑO	ESP. DE BAÑO FRUTAL  	21
ESPUMAS DE BAÑO	ESP. DE BAÑO FRUTOS ROJOS 	4
ESPUMAS DE BAÑO	ESP. DE BAÑO LAVANDA  	6
ESPUMAS DE BAÑO	ESP. DE BAÑO ROSA MOSQUETA 	15
ESPUMAS DE BAÑO	ESP. DE BAÑO ROSAS  	9
ESPUMAS DE BAÑO	ESP. DE BAÑO TILO  	5
ESPUMAS DE BAÑO	ESP. DE BAÑO VAINICOCO  	4
FRAGANCIAS TEXTILES	F. TEXTIL AKIA   	12
FRAGANCIAS TEXTILES	F. TEXTIL CHER   	8
FRAGANCIAS TEXTILES	F. TEXTIL CONI   	2
FRAGANCIAS TEXTILES	F. TEXTIL CROMBIE   	15
FRAGANCIAS TEXTILES	F. TEXTIL FRESH   	13
FRAGANCIAS TEXTILES	F. TEXTIL KOSIUK   	7
FRAGANCIAS TEXTILES	F. TEXTIL MILLON   	8
FRAGANCIAS TEXTILES	F. TEXTIL TOMY   	8
FRAGANCIAS TEXTILES	F. TEXTIL WANA   	4
FRAGANCIAS TEXTILES	F. TEXTIL YAPA   	8
HOME SPRAY	HOME SPRAY CALM   	8
HOME SPRAY	HOME SPRAY CARIBEAN   	8
HOME SPRAY	HOME SPRAY DREAMS   	7
HOME SPRAY	HOME SPRAY FLOWERS   	8
HOME SPRAY	HOME SPRAY GLAMOUR   	12
HOME SPRAY	HOME SPRAY HARMONY   	6
HOME SPRAY	HOME SPRAY INTENSE   	8
HOME SPRAY	HOME SPRAY LIVE   	10
HOME SPRAY	HOME SPRAY LOVE   	8
HOME SPRAY	HOME SPRAY PEACE   	9
HOME SPRAY	HOME SPRAY PURO   	5
HOME SPRAY	HOME SPRAY QUINTANA ROO  	5
HOME SPRAY	HOME SPRAY RELAX   	6
HOME SPRAY	HOME SPRAY SER   	9
HOME SPRAY	HOME SPRAY SWEET   	10
JABONES LIQUIDOS	JABON LIQUIDO ALOE   	5
JABONES LIQUIDOS	JABON LIQUIDO CANCUN   	6
JABONES LIQUIDOS	JABON LIQUIDO CHANDAL   	7
JABONES LIQUIDOS	JABON LIQUIDO HIBISCUS   	7
JABONES LIQUIDOS	JABON LIQUIDO MANGO Y MARACUYA 	7
JABONES LIQUIDOS	JABON LIQUIDO PARADISE   	6
JABONES LIQUIDOS	JABON LIQUIDO VAINILLA COCO  	3
SALES DE BAÑO	SAL DE BAÑO COCO VAINILLA 	5
SALES DE BAÑO	SAL DE BAÑO EUCALIPTO  	14
SALES DE BAÑO	SAL DE BAÑO FRUTOS ROJOS 	8
SALES DE BAÑO	SAL DE BAÑO LAVANDA  	2
SALES DE BAÑO	SAL DE BAÑO MARINA  	13
SALES DE BAÑO	SAL DE BAÑO ROSAS  	6
SALES DE BAÑO	SAL DE BAÑO TILO  	0
SALES DE BAÑO	SAL DE BAÑO VAINILLA  	7
JABONES SOLIDOS	JABON SOLIDO AVENA Y COCO 	1
JABONES SOLIDOS	JABON SOLIDO CACAO   	1
JABONES SOLIDOS	JABON SOLIDO CALENDULA   	0
JABONES SOLIDOS	JABON SOLIDO CARBON ACTIVADO  	3
JABONES SOLIDOS	JABON SOLIDO LAVANDA   	2
JABONES SOLIDOS	JABON SOLIDO MALBEC   	0
JABONES SOLIDOS	JABON SOLIDO MANZANILLA   	2
JABONES SOLIDOS	JABON SOLIDO OLIVA   	3
JABONES SOLIDOS	JABON SOLIDO ROSA MOSQUETA  	0
JABONES SOLIDOS	JABON SOLIDO CAFE   	3
JABONES SOLIDOS	JABON SOLIDO CENTELLA ASIATICA  	0
BOMBAS ESFERVESCENTES	BOMBA ESF. ALMENDRA   	11
BOMBAS ESFERVESCENTES	BOMBA ESF. CHICLE   	5
BOMBAS ESFERVESCENTES	BOMBA ESF. COCO VAINILLA  	0
BOMBAS ESFERVESCENTES	BOMBA ESF. FLORAL   	11
BOMBAS ESFERVESCENTES	BOMBA ESF. FRUTOS ROJOS  	4
BOMBAS ESFERVESCENTES	BOMBA ESF. JAZMIN   	7
BOMBAS ESFERVESCENTES	BOMBA ESF. LAVANDA   	3
BOMBAS ESFERVESCENTES	BOMBA ESF. ROSA MOSQUETA  	5
ESENCIAS DE HORNILLO	ES. HORNI. BEBE   	13
ESENCIAS DE HORNILLO	ES. HORNI. BERGAMOTA   	19
ESENCIAS DE HORNILLO	ES. HORNI. CEREZA   	13
ESENCIAS DE HORNILLO	ES. HORNI. CHERRY   	15
ESENCIAS DE HORNILLO	ES. HORNI. CITRONELLA   	6
ESENCIAS DE HORNILLO	ES. HORNI. COCO   	16
ESENCIAS DE HORNILLO	ES. HORNI. EUCALIPTO   	7
ESENCIAS DE HORNILLO	ES. HORNI. FLORAL   	8
ESENCIAS DE HORNILLO	ES. HORNI. FLORES BLANCAS  	3
ESENCIAS DE HORNILLO	ES. HORNI. FRESIAS   	15
ESENCIAS DE HORNILLO	ES. HORNI. INCIENSO   	23
ESENCIAS DE HORNILLO	ES. HORNI. LAVANDA   	0
ESENCIAS DE HORNILLO	ES. HORNI. LEMON GRASS  	0
ESENCIAS DE HORNILLO	ES. HORNI. MADERAS DE ORIENTE 	0
ESENCIAS DE HORNILLO	ES. HORNI. MANZANA   	12
ESENCIAS DE HORNILLO	ES. HORNI. MELON   	14
ESENCIAS DE HORNILLO	ES. HORNI. MIEL   	10
ESENCIAS DE HORNILLO	ES. HORNI. MIRRA   	10
ESENCIAS DE HORNILLO	ES. HORNI. NAG CHAMPA  	0
ESENCIAS DE HORNILLO	ES. HORNI. NARANJA CANELA  	11
ESENCIAS DE HORNILLO	ES. HORNI. NARANJA JENGIBRE  	1
ESENCIAS DE HORNILLO	ES. HORNI. NARDO   	10
ESENCIAS DE HORNILLO	ES. HORNI. PATCHULI   	18
ESENCIAS DE HORNILLO	ES. HORNI. ROMERO   	7
ESENCIAS DE HORNILLO	ES. HORNI. ROSAS   	9
ESENCIAS DE HORNILLO	ES. HORNI. SANDALO   	3
ESENCIAS DE HORNILLO	ES. HORNI. SANDALO HINDU  	11
ESENCIAS DE HORNILLO	ES. HORNI. TE VERDE  	10
ESENCIAS DE HORNILLO	ES. HORNI. TILO   	6
ESENCIAS DE HORNILLO	ES. HORNI. VAINICOCO   	1
ESENCIAS DE HORNILLO	ES. HORNI. VAINILLA   	4
ESENCIAS DE HORNILLO	ES. HORNI. VERBENA   	0
ACEITES	ACEITE DE ALMENDRAS   	16
ACEITES	ACEITE DE COCO   	20
ACEITES	ACEITE DE ROSA MOSQUETA  	8
VARIOS	ADAPTADOR PARA HUMI   	17
VARIOS	APAGA VELAS    	4
VARIOS	FILTRO HUMIDIFICADOR    	28
`.trim();

// Función para parsear los datos del stock actualizado
function parsearStockActualizado() {
  const lineas = stockActualizadoData.split('\n').filter(l => l.trim());
  const productos = [];

  lineas.forEach((linea, index) => {
    const partes = linea.split('\t').map(p => p.trim());
    
    if (partes.length >= 3) {
      const categoria = partes[0];
      const nombreProducto = partes[1];
      const stock = parseInt(partes[2]) || 0;

      productos.push({
        categoria: categoria,
        nombre: nombreProducto.trim(),
        stock: stock,
        linea: index + 1
      });
    }
  });

  return productos;
}

// Función para buscar producto en la base de datos (reutilizada del script anterior)
async function buscarProducto(nombreOriginal, categoria) {
  console.log(`   🔍 Buscando: "${nombreOriginal}" en categoría "${categoria}"`);
  
  // 1. Buscar por nombre exacto
  let producto = await prisma.producto.findFirst({
    where: {
      nombre: nombreOriginal,
      activo: true
    },
    include: { categoria: true }
  });

  if (producto) {
    console.log(`   ✅ Encontrado por nombre exacto: ${producto.nombre}`);
    return producto;
  }

  // 2. Buscar por nombre con coincidencia parcial (contiene)
  producto = await prisma.producto.findFirst({
    where: {
      nombre: {
        contains: nombreOriginal,
        mode: 'insensitive'
      },
      activo: true
    },
    include: { categoria: true }
  });

  if (producto) {
    console.log(`   ✅ Encontrado por coincidencia parcial: ${producto.nombre}`);
    return producto;
  }

  // 3. Buscar quitando prefijos comunes
  const nombreLimpio = nombreOriginal
    .replace(/^(DIFUSOR|BOMBA ESF\.|ES\. HORNI\.|ES\.HUMI\.|ESP\. DE BAÑO|F\. TEXTIL|HOME SPRAY|JABON LIQUIDO|JABON SOLIDO|SAL DE BAÑO|ACEITE DE|REC\. DIFU\. AUTO|REC\.DIFU\. AUTO)/i, '')
    .trim();

  if (nombreLimpio !== nombreOriginal) {
    producto = await prisma.producto.findFirst({
      where: {
        nombre: {
          contains: nombreLimpio,
          mode: 'insensitive'
        },
        activo: true
      },
      include: { categoria: true }
    });

    if (producto) {
      console.log(`   ✅ Encontrado por nombre limpio: ${producto.nombre}`);
      return producto;
    }
  }

  console.log(`   ❌ NO encontrado: "${nombreOriginal}"`);
  return null;
}

// Función para obtener usuario admin
async function obtenerUsuarioAdmin() {
  const usuario = await prisma.user.findFirst({
    where: { roleId: 'role-admin' }
  });

  if (!usuario) {
    throw new Error('No se encontró usuario admin. Ejecuta primero el script de seed de usuarios.');
  }

  return usuario;
}

// Función para buscar la sucursal Shopping Patagonia
async function buscarSucursalShoppingPatagonia() {
  console.log('🏢 Buscando sucursal Shopping Patagonia...');
  
  const nombresAPróbar = [
    'Shopping patagonia - bariloche',
    'SHOPPING PATAGONIA - BARILOCHE',
    'Shopping Patagonia',
    'SHOPPING PATAGONIA',
    'shopping patagonia',
    'Sucursal Bariloche'
  ];

  for (const nombre of nombresAPróbar) {
    const sucursal = await prisma.ubicacion.findFirst({
      where: {
        nombre: {
          equals: nombre,
          mode: 'insensitive'
        },
        tipo: 'sucursal'
      }
    });

    if (sucursal) {
      console.log(`   ✅ Sucursal encontrada: ${sucursal.nombre} (ID: ${sucursal.id})`);
      return sucursal;
    }
  }

  throw new Error('Sucursal Shopping Patagonia no encontrada');
}

// Función para limpiar stock actual de la sucursal
async function limpiarStockSucursal(sucursalId, usuarioId) {
  console.log('🧹 === LIMPIANDO STOCK ACTUAL DE LA SUCURSAL ===');
  
  // Obtener todos los stocks de la sucursal
  const stocksActuales = await prisma.stock.findMany({
    where: {
      ubicacionId: sucursalId,
      productoId: { not: null } // Solo productos, no insumos
    },
    include: { producto: true }
  });
  
  console.log(`   📊 Encontrados ${stocksActuales.length} productos con stock actual`);
  
  let stocksLimpiados = 0;
  let movimientosCreados = 0;
  
  for (const stockActual of stocksActuales) {
    if (stockActual.cantidad > 0) {
      try {
        // Crear movimiento de salida para llevarlo a 0
        await prisma.movimientoStock.create({
          data: {
            stockId: stockActual.id,
            tipoMovimiento: 'salida',
            cantidad: stockActual.cantidad,
            motivo: 'Limpieza para actualización masiva de stock 2025',
            usuarioId: usuarioId,
            fecha: new Date()
          }
        });
        
        // Actualizar stock a 0
        await prisma.stock.update({
          where: { id: stockActual.id },
          data: {
            cantidad: 0,
            ultimaActualizacion: new Date()
          }
        });
        
        stocksLimpiados++;
        movimientosCreados++;
        
        if (stocksLimpiados % 50 === 0) {
          console.log(`   🧹 Limpiados ${stocksLimpiados} stocks...`);
        }
      } catch (error) {
        console.error(`   ❌ Error limpiando stock de ${stockActual.producto?.nombre}:`, error.message);
      }
    }
  }
  
  console.log(`   ✅ ${stocksLimpiados} stocks limpiados`);
  console.log(`   ✅ ${movimientosCreados} movimientos de limpieza creados`);
  
  return { stocksLimpiados, movimientosCreados };
}

// Función para establecer el nuevo stock
async function establecerNuevoStock(productoId, sucursalId, cantidadDeseada, usuarioId) {
  console.log(`   📦 Estableciendo stock de producto ${productoId} a ${cantidadDeseada} unidades`);

  // Buscar stock existente
  let stock = await prisma.stock.findFirst({
    where: {
      productoId: productoId,
      ubicacionId: sucursalId
    }
  });

  if (!stock) {
    // Crear nuevo registro si no existe
    stock = await prisma.stock.create({
      data: {
        ubicacionId: sucursalId,
        productoId: productoId,
        cantidad: 0,
        ultimaActualizacion: new Date()
      }
    });
  }

  // Solo crear movimiento si la cantidad es mayor a 0
  if (cantidadDeseada > 0) {
    // Actualizar stock
    await prisma.stock.update({
      where: { id: stock.id },
      data: {
        cantidad: cantidadDeseada,
        ultimaActualizacion: new Date()
      }
    });

    // Registrar movimiento de entrada
    await prisma.movimientoStock.create({
      data: {
        stockId: stock.id,
        tipoMovimiento: 'entrada',
        cantidad: cantidadDeseada,
        motivo: 'Actualización masiva de stock Shopping Patagonia 2025',
        usuarioId: usuarioId,
        fecha: new Date()
      }
    });

    console.log(`   ✅ Stock establecido: ${cantidadDeseada} unidades`);
  } else {
    console.log(`   ⚪ Stock mantenido en 0 (no se crea movimiento)`);
  }

  return { stockAnterior: 0, stockNuevo: cantidadDeseada };
}

// Función principal
async function actualizarStockShoppingPatagonia() {
  console.log('🔄 === ACTUALIZACIÓN COMPLETA DE STOCK - SHOPPING PATAGONIA ===\n');

  try {
    // 1. Obtener usuario admin
    const usuario = await obtenerUsuarioAdmin();
    console.log(`👤 Usuario para operaciones: ${usuario.name} (${usuario.email})`);

    // 2. Buscar sucursal Shopping Patagonia
    const sucursal = await buscarSucursalShoppingPatagonia();

    // 3. Parsear datos del stock actualizado
    console.log('📋 Parseando datos del stock actualizado...');
    const productosStock = parsearStockActualizado();
    console.log(`   ✅ ${productosStock.length} productos parseados`);

    // 4. Limpiar stock actual de la sucursal
    const resultadoLimpieza = await limpiarStockSucursal(sucursal.id, usuario.id);

    // 5. Procesar cada producto del archivo
    console.log('\n📦 === CARGANDO NUEVO STOCK ===\n');
    
    let procesados = 0;
    let encontrados = 0;
    let noEncontrados = 0;
    let actualizados = 0;
    let sinStock = 0;
    let totalUnidadesCargadas = 0;

    const noEncontradosDetalle = [];
    const procesadosDetalle = [];

    for (const item of productosStock) {
      console.log(`📋 [${procesados + 1}/${productosStock.length}] ${item.nombre} (${item.stock} unidades)`);
      
      try {
        // Buscar producto en la base de datos
        const producto = await buscarProducto(item.nombre, item.categoria);
        
        if (!producto) {
          noEncontrados++;
          noEncontradosDetalle.push({
            nombre: item.nombre,
            categoria: item.categoria,
            stock: item.stock,
            linea: item.linea
          });
          console.log(`   ❌ Producto no encontrado\n`);
          continue;
        }

        encontrados++;

        // Establecer nuevo stock
        const resultado = await establecerNuevoStock(
          producto.id, 
          sucursal.id, 
          item.stock, 
          usuario.id
        );

        if (item.stock === 0) {
          sinStock++;
        } else {
          actualizados++;
          totalUnidadesCargadas += item.stock;
        }

        procesadosDetalle.push({
          producto: producto.nombre,
          categoria: item.categoria,
          stockNuevo: item.stock,
          accion: item.stock === 0 ? 'Sin stock' : 'Actualizado'
        });

        console.log(`   ✅ Procesado correctamente\n`);

      } catch (error) {
        console.error(`   ❌ Error procesando: ${error.message}\n`);
        noEncontrados++;
        noEncontradosDetalle.push({
          nombre: item.nombre,
          categoria: item.categoria,
          stock: item.stock,
          error: error.message
        });
      }

      procesados++;
    }

    // 6. Mostrar resumen final
    console.log('📊 === RESUMEN FINAL DE ACTUALIZACIÓN ===');
    console.log(`🏢 Sucursal: ${sucursal.nombre}`);
    console.log(`🧹 Stock anterior limpiado: ${resultadoLimpieza.stocksLimpiados} productos`);
    console.log(`📋 Total productos en archivo: ${productosStock.length}`);
    console.log(`✅ Productos encontrados: ${encontrados}`);
    console.log(`❌ Productos no encontrados: ${noEncontrados}`);
    console.log(`📦 Productos con stock actualizado: ${actualizados}`);
    console.log(`⚪ Productos sin stock (0 unidades): ${sinStock}`);
    console.log(`📦 Total unidades cargadas: ${totalUnidadesCargadas}`);

    // 7. Mostrar productos no encontrados
    if (noEncontradosDetalle.length > 0) {
      console.log('\n❌ === PRODUCTOS NO ENCONTRADOS ===');
      noEncontradosDetalle.forEach((item, index) => {
        console.log(`${index + 1}. ${item.nombre} (${item.categoria}) - Stock: ${item.stock}`);
        if (item.error) {
          console.log(`   Error: ${item.error}`);
        }
      });
    }

    // 8. Verificar algunos productos actualizados
    console.log('\n🔍 === VERIFICACIÓN DE MUESTRA ===');
    const muestra = await prisma.stock.findMany({
      take: 5,
      where: {
        ubicacionId: sucursal.id,
        cantidad: { gt: 0 }
      },
      include: {
        producto: true
      },
      orderBy: { ultimaActualizacion: 'desc' }
    });

    muestra.forEach(stock => {
      console.log(`   📦 ${stock.producto?.nombre}: ${stock.cantidad} unidades`);
    });

    return {
      sucursal: sucursal.nombre,
      limpieza: resultadoLimpieza,
      totalProcesados: procesados,
      encontrados,
      noEncontrados,
      actualizados,
      sinStock,
      totalUnidadesCargadas,
      noEncontradosDetalle,
      procesadosDetalle
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
📚 Script de Actualización Completa de Stock - Shopping Patagonia

🎯 Propósito:
   Limpiar completamente el stock actual de Shopping Patagonia y
   cargar el stock actualizado desde los datos más recientes.

🔧 Uso:
   node scripts/insertar/actualizar-stock-shopping-patagonia-2025.js

⚠️ ADVERTENCIA:
   Este script ELIMINA TODO EL STOCK ACTUAL de Shopping Patagonia
   antes de cargar el nuevo stock.

📋 Qué hace:
   ✅ Busca la sucursal Shopping Patagonia
   ✅ Limpia TODO el stock actual (movimientos de salida)
   ✅ Parsea ${parsearStockActualizado().length} productos del archivo actualizado
   ✅ Carga el nuevo stock con movimientos de entrada
   ✅ Registra todos los movimientos para auditoría
   ✅ Genera reporte completo de la operación

💡 Características:
   - Maneja productos con stock 0 (no crea movimientos innecesarios)
   - Busca productos por múltiples criterios (nombre exacto, parcial, limpio)
   - Crea registros de auditoría completos
   - Reporta productos no encontrados para revisión manual

🔒 Requisitos:
   - Usuario admin configurado
   - Sucursal Shopping Patagonia existente
   - Base de datos accesible
   - Productos previamente cargados en el sistema
`);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--ayuda') || args.includes('--help')) {
    mostrarAyuda();
    process.exit(0);
  }
  
  console.log('🚀 Iniciando actualización completa de stock...\n');
  
  actualizarStockShoppingPatagonia()
    .then((resultado) => {
      console.log('\n🎉 === ACTUALIZACIÓN COMPLETADA EXITOSAMENTE ===');
      console.log(`🧹 Stock anterior limpiado: ${resultado.limpieza.stocksLimpiados} productos`);
      console.log(`📦 ${resultado.totalUnidadesCargadas} unidades cargadas en ${resultado.sucursal}`);
      console.log(`✅ ${resultado.encontrados} productos procesados correctamente`);
      
      if (resultado.noEncontrados > 0) {
        console.log(`⚠️ ${resultado.noEncontrados} productos no encontrados (revisar reporte arriba)`);
      }
      
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 === ERROR EN LA ACTUALIZACIÓN ===');
      console.error(error.message);
      process.exit(1);
    });
}

module.exports = { actualizarStockShoppingPatagonia };