// scripts/insertar/carga-stock-real-shopping-patagonia.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🔥 DATOS REALES DEL STOCK ACTUAL EN SHOPPING PATAGONIA - BARILOCHE
const stockRealData = `
DIFUSORES DE AUTO	DIFUSOR DE AUTO   	32
DIFUSORES DE AUTO	REC. DIFU. AUTO AUTO NUEVO 	0
DIFUSORES DE AUTO	REC. DIFU. AUTO BAMBU  	1
DIFUSORES DE AUTO	REC. DIFU. AUTO FLORES BLANCAS 	5
DIFUSORES DE AUTO	REC. DIFU. AUTO FRUTOS ROJOS 	1
DIFUSORES DE AUTO	REC. DIFU. AUTO LEMON GRASS 	3
DIFUSORES DE AUTO	REC. DIFU. AUTO LIMON Y JENGIBRE	5
DIFUSORES DE AUTO	REC. DIFU. AUTO MANGO  	6
DIFUSORES DE AUTO	REC. DIFU. AUTO NARANJA Y CANELA	13
DIFUSORES DE AUTO	REC. DIFU. AUTO NARANJA Y JENGIBRE	7
DIFUSORES DE AUTO	REC. DIFU. AUTO NARANJA Y PIMIENTA	2
DIFUSORES DE AUTO	REC. DIFU. AUTO PERAS Y FLORES	0
DIFUSORES DE AUTO	REC. DIFU. AUTO ROSAS  	5
DIFUSORES DE AUTO	REC. DIFU. AUTO SANDALO  	5
DIFUSORES DE AUTO	REC. DIFU. AUTO TE VERDE 	0
DIFUSORES DE AUTO	REC. DIFU. AUTO VAINICOCO  	5
DIFUSORES DE AUTO	REC. DIFU. AUTO VAINILLA  	2
DIFUSORES DE AUTO	REC.DIFU. AUTO LAVANDA   	6
DIFUSORES DE HOGAR	DIFUSOR ALMENDRAS  	10
DIFUSORES DE HOGAR	DIFUSOR BAMBU  	7
DIFUSORES DE HOGAR	DIFUSOR BERGAMOTA  	11
DIFUSORES DE HOGAR	DIFUSOR CALOR DE HOGAR	15
DIFUSORES DE HOGAR	DIFUSOR CITRONELLA  	6
DIFUSORES DE HOGAR	DIFUSOR FLORES BLANCAS 	9
DIFUSORES DE HOGAR	DIFUSOR FRUTOS ROJOS 	12
DIFUSORES DE HOGAR	DIFUSOR GARDENIA  	14
DIFUSORES DE HOGAR	DIFUSOR JAZMIN  	8
DIFUSORES DE HOGAR	DIFUSOR LAVANDA Y ROMERO	5
DIFUSORES DE HOGAR	DIFUSOR LEMONGRASS  	13
DIFUSORES DE HOGAR	DIFUSOR LIMON Y JENGIBRE	6
DIFUSORES DE HOGAR	DIFUSOR MADERAS DEL ORIENTE	13
DIFUSORES DE HOGAR	DIFUSOR MANGO  	20
DIFUSORES DE HOGAR	DIFUSOR MANGO Y MARACUYA	13
DIFUSORES DE HOGAR	DIFUSOR NAGCHAMPA  	14
DIFUSORES DE HOGAR	DIFUSOR NARANJA CANELA 	11
DIFUSORES DE HOGAR	DIFUSOR NARANJA Y JENGIBRE	0
DIFUSORES DE HOGAR	DIFUSOR NARANJA Y PIMIENTA	14
DIFUSORES DE HOGAR	DIFUSOR ORANGE  	14
DIFUSORES DE HOGAR	DIFUSOR PALO SANTO 	15
DIFUSORES DE HOGAR	DIFUSOR PERAS Y FLORES	14
DIFUSORES DE HOGAR	DIFUSOR ROSAS  	13
DIFUSORES DE HOGAR	DIFUSOR SAI BABA 	14
DIFUSORES DE HOGAR	DIFUSOR SANDALO  	8
DIFUSORES DE HOGAR	DIFUSOR TE VERDE 	8
DIFUSORES DE HOGAR	DIFUSOR TILO  	4
DIFUSORES DE HOGAR	DIFUSOR VAINICOCO  	0
DIFUSORES DE HOGAR	DIFUSOR VAINILLA  	11
DIFUSORES DE HOGAR	DIFUSOR VERBENA  	11
DIFUSORES DE HOGAR	DIFUSOR WANAMA  	7
ESENCIAS HUMIDIFICADORES	ES.HUMI.AKITA     	5
ESENCIAS HUMIDIFICADORES	ES.HUMI.AMSTERDAM     	4
ESENCIAS HUMIDIFICADORES	ES.HUMI.APHRODITA     	7
ESENCIAS HUMIDIFICADORES	ES.HUMI.BELICE     	5
ESENCIAS HUMIDIFICADORES	ES.HUMI.BERGAMOTA     	11
ESENCIAS HUMIDIFICADORES	ES.HUMI.CALIFORNIA     	13
ESENCIAS HUMIDIFICADORES	ES.HUMI.CANCUN     	10
ESENCIAS HUMIDIFICADORES	ES.HUMI.CARIBEAN     	11
ESENCIAS HUMIDIFICADORES	ES.HUMI.CHANDAL     	9
ESENCIAS HUMIDIFICADORES	ES.HUMI.CHICLE     	12
ESENCIAS HUMIDIFICADORES	ES.HUMI.DELICATEZA     	8
ESENCIAS HUMIDIFICADORES	ES.HUMI.EUCALIPTO     	5
ESENCIAS HUMIDIFICADORES	ES.HUMI.GINGER     	8
ESENCIAS HUMIDIFICADORES	ES.HUMI.GREEN TEA    	9
ESENCIAS HUMIDIFICADORES	ES.HUMI.GROSEILLE     	7
ESENCIAS HUMIDIFICADORES	ES.HUMI.KANNAUJ     	3
ESENCIAS HUMIDIFICADORES	ES.HUMI.LAVANDA     	5
ESENCIAS HUMIDIFICADORES	ES.HUMI.LEMON     	7
ESENCIAS HUMIDIFICADORES	ES.HUMI.LOTUS FRESH    	5
ESENCIAS HUMIDIFICADORES	ES.HUMI.MADRE SELVA    	8
ESENCIAS HUMIDIFICADORES	ES.HUMI.MALASIA     	3
ESENCIAS HUMIDIFICADORES	ES.HUMI.MANGO Y MARACUYA   	6
ESENCIAS HUMIDIFICADORES	ES.HUMI.MONASTRELL     	8
ESENCIAS HUMIDIFICADORES	ES.HUMI.NARANJA Y PIMIENTA   	1
ESENCIAS HUMIDIFICADORES	ES.HUMI.ORANGE     	14
ESENCIAS HUMIDIFICADORES	ES.HUMI.ORQUIDEA NEGRA    	10
ESENCIAS HUMIDIFICADORES	ES.HUMI.PARADISE     	7
ESENCIAS HUMIDIFICADORES	ES.HUMI.PITANGA     	10
ESENCIAS HUMIDIFICADORES	ES.HUMI.POMELO BLUEBERRY    	7
ESENCIAS HUMIDIFICADORES	ES.HUMI.SAI BABA    	11
ESENCIAS HUMIDIFICADORES	ES.HUMI.TAHITI     	7
ESENCIAS HUMIDIFICADORES	ES.HUMI.TE VERDE Y JENGIBRE  	4
ESENCIAS HUMIDIFICADORES	ES.HUMI.ULTRA VIOLET    	5
ESENCIAS HUMIDIFICADORES	ES.HUMI.UVA Y FRUTOS ROJOS  	4
ESENCIAS HUMIDIFICADORES	ES.HUMI.VAINILLA CARAMELO    	1
ESENCIAS HUMIDIFICADORES	ES.HUMI.VAINILLA CEDRO    	7
ESENCIAS HUMIDIFICADORES	ES.HUMI.VAINILLA COCO    	9
ESPUMAS DE BAÑO	ESP. DE BAÑO ALMENDRAS  	8
ESPUMAS DE BAÑO	ESP. DE BAÑO EUCALIPTO  	10
ESPUMAS DE BAÑO	ESP. DE BAÑO FLORAL  	7
ESPUMAS DE BAÑO	ESP. DE BAÑO FRUTAL  	21
ESPUMAS DE BAÑO	ESP. DE BAÑO FRUTOS ROJOS 	4
ESPUMAS DE BAÑO	ESP. DE BAÑO LAVANDA  	6
ESPUMAS DE BAÑO	ESP. DE BAÑO ROSA MOSQUETA 	15
ESPUMAS DE BAÑO	ESP. DE BAÑO ROSAS  	9
ESPUMAS DE BAÑO	ESP. DE BAÑO TILO  	5
ESPUMAS DE BAÑO	ESP. DE BAÑO VAINICOCO  	2
FRAGANCIAS TEXTILES	F. TEXTIL AKIA   	13
FRAGANCIAS TEXTILES	F. TEXTIL CHER   	0
FRAGANCIAS TEXTILES	F. TEXTIL CONI   	9
FRAGANCIAS TEXTILES	F. TEXTIL CROMBIE   	16
FRAGANCIAS TEXTILES	F. TEXTIL FRESH   	9
FRAGANCIAS TEXTILES	F. TEXTIL KOSIUK   	11
FRAGANCIAS TEXTILES	F. TEXTIL MILLON   	10
FRAGANCIAS TEXTILES	F. TEXTIL TOMY   	9
FRAGANCIAS TEXTILES	F. TEXTIL WANA   	8
FRAGANCIAS TEXTILES	F. TEXTIL YAPA   	3
HOME SPRAY	HOME SPRAY CALM   	5
HOME SPRAY	HOME SPRAY CARIBEAN   	1
HOME SPRAY	HOME SPRAY DREAMS   	10
HOME SPRAY	HOME SPRAY FLOWERS   	8
HOME SPRAY	HOME SPRAY GLAMOUR   	12
HOME SPRAY	HOME SPRAY HARMONY   	5
HOME SPRAY	HOME SPRAY INTENSE   	10
HOME SPRAY	HOME SPRAY LIVE   	5
HOME SPRAY	HOME SPRAY LOVE   	8
HOME SPRAY	HOME SPRAY PEACE   	10
HOME SPRAY	HOME SPRAY PURO   	0
HOME SPRAY	HOME SPRAY QUINTANA ROO  	3
HOME SPRAY	HOME SPRAY RELAX   	7
HOME SPRAY	HOME SPRAY SER   	7
HOME SPRAY	HOME SPRAY SWEET   	12
JABONES LIQUIDOS	JABON LIQUIDO ALOE   	5
JABONES LIQUIDOS	JABON LIQUIDO CANCUN   	7
JABONES LIQUIDOS	JABON LIQUIDO CHANDAL   	7
JABONES LIQUIDOS	JABON LIQUIDO HIBISCUS   	7
JABONES LIQUIDOS	JABON LIQUIDO MANGO Y MARACUYA 	7
JABONES LIQUIDOS	JABON LIQUIDO PARADISE   	6
JABONES LIQUIDOS	JABON LIQUIDO VAINILLA COCO  	3
SALES DE BAÑO	SAL DE BAÑO COCO VAINILLA 	5
SALES DE BAÑO	SAL DE BAÑO EUCALIPTO  	15
SALES DE BAÑO	SAL DE BAÑO FRUTOS ROJOS 	9
SALES DE BAÑO	SAL DE BAÑO LAVANDA  	2
SALES DE BAÑO	SAL DE BAÑO MARINA  	13
SALES DE BAÑO	SAL DE BAÑO ROSAS  	6
SALES DE BAÑO	SAL DE BAÑO TILO  	0
SALES DE BAÑO	SAL DE BAÑO VAINILLA  	7
JABONES SOLIDOS	JABON SOLIDO AVENA Y COCO 	3
JABONES SOLIDOS	JABON SOLIDO CACAO   	3
JABONES SOLIDOS	JABON SOLIDO CALENDULA   	0
JABONES SOLIDOS	JABON SOLIDO CARBON ACTIVADO  	3
JABONES SOLIDOS	JABON SOLIDO LAVANDA   	3
JABONES SOLIDOS	JABON SOLIDO MALBEC   	3
JABONES SOLIDOS	JABON SOLIDO MANZANILLA   	3
JABONES SOLIDOS	JABON SOLIDO OLIVA   	3
JABONES SOLIDOS	JABON SOLIDO ROSA MOSQUETA  	3
JABONES SOLIDOS	JABON SOLIDO CAFE   	3
JABONES SOLIDOS	JABON SOLIDO CENTELLA ASIATICA  	2
BOMBAS ESFERVESCENTES	BOMBA ESF. ALMENDRA   	12
BOMBAS ESFERVESCENTES	BOMBA ESF. CHICLE   	2
BOMBAS ESFERVESCENTES	BOMBA ESF. COCO VAINILLA  	0
BOMBAS ESFERVESCENTES	BOMBA ESF. FLORAL   	11
BOMBAS ESFERVESCENTES	BOMBA ESF. FRUTOS ROJOS  	5
BOMBAS ESFERVESCENTES	BOMBA ESF. JAZMIN   	7
BOMBAS ESFERVESCENTES	BOMBA ESF. LAVANDA   	1
BOMBAS ESFERVESCENTES	BOMBA ESF. ROSA MOSQUETA  	3
ESENCIAS DE HORNILLO	ES. HORNI. BEBE   	13
ESENCIAS DE HORNILLO	ES. HORNI. BERGAMOTA   	19
ESENCIAS DE HORNILLO	ES. HORNI. CEREZA   	15
ESENCIAS DE HORNILLO	ES. HORNI. CHERRY   	16
ESENCIAS DE HORNILLO	ES. HORNI. CITRONELLA   	6
ESENCIAS DE HORNILLO	ES. HORNI. COCO   	16
ESENCIAS DE HORNILLO	ES. HORNI. EUCALIPTO   	7
ESENCIAS DE HORNILLO	ES. HORNI. FLORAL   	16
ESENCIAS DE HORNILLO	ES. HORNI. FLORES BLANCAS  	8
ESENCIAS DE HORNILLO	ES. HORNI. FRESIAS   	15
ESENCIAS DE HORNILLO	ES. HORNI. INCIENSO   	23
ESENCIAS DE HORNILLO	ES. HORNI. LAVANDA   	2
ESENCIAS DE HORNILLO	ES. HORNI. LEMON GRASS  	11
ESENCIAS DE HORNILLO	ES. HORNI. MADERAS DE ORIENTE 	11
ESENCIAS DE HORNILLO	ES. HORNI. MANZANA   	15
ESENCIAS DE HORNILLO	ES. HORNI. MELON   	14
ESENCIAS DE HORNILLO	ES. HORNI. MIEL   	10
ESENCIAS DE HORNILLO	ES. HORNI. MIRRA   	10
ESENCIAS DE HORNILLO	ES. HORNI. NAG CHAMPA  	2
ESENCIAS DE HORNILLO	ES. HORNI. NARANJA CANELA  	14
ESENCIAS DE HORNILLO	ES. HORNI. NARANJA JENGIBRE  	5
ESENCIAS DE HORNILLO	ES. HORNI. NARDO   	12
ESENCIAS DE HORNILLO	ES. HORNI. PATCHULI   	18
ESENCIAS DE HORNILLO	ES. HORNI. ROMERO   	7
ESENCIAS DE HORNILLO	ES. HORNI. ROSAS   	10
ESENCIAS DE HORNILLO	ES. HORNI. SANDALO   	6
ESENCIAS DE HORNILLO	ES. HORNI. SANDALO HINDU  	11
ESENCIAS DE HORNILLO	ES. HORNI. TE VERDE  	14
ESENCIAS DE HORNILLO	ES. HORNI. TILO   	8
ESENCIAS DE HORNILLO	ES. HORNI. VAINICOCO   	3
ESENCIAS DE HORNILLO	ES. HORNI. VAINILLA   	4
ESENCIAS DE HORNILLO	ES. HORNI. VERBENA   	10
ACEITES	ACEITE DE ALMENDRAS   	17
ACEITES	ACEITE DE COCO   	22
ACEITES	ACEITE DE ROSA MOSQUETA  	16
VARIOS	ADAPTADOR PARA HUMI   	20
VARIOS	APAGA VELAS    	4
VARIOS	FILTRO HUMIDIFICADOR    	39
VARIOS	RECARGA DIFU DE AUTO	100
`.trim();

// Función para parsear los datos del stock real
function parsearStockReal() {
  const lineas = stockRealData.split('\n').filter(l => l.trim());
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

// Función para buscar producto en la base de datos
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

  // 4. Último intento: buscar palabras clave en el nombre
  const palabrasClave = nombreOriginal.split(' ').filter(p => p.length > 3);
  
  if (palabrasClave.length > 0) {
    for (const palabra of palabrasClave) {
      producto = await prisma.producto.findFirst({
        where: {
          nombre: {
            contains: palabra,
            mode: 'insensitive'
          },
          activo: true
        },
        include: { categoria: true }
      });

      if (producto) {
        console.log(`   ✅ Encontrado por palabra clave "${palabra}": ${producto.nombre}`);
        return producto;
      }
    }
  }

  console.log(`   ❌ NO encontrado: "${nombreOriginal}"`);
  return null;
}

// Función para obtener o crear usuario admin
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
  
  // Buscar por nombres posibles
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

  // Si no se encuentra, listar todas las sucursales disponibles
  const sucursales = await prisma.ubicacion.findMany({
    where: { tipo: 'sucursal' },
    select: { id: true, nombre: true, activo: true }
  });

  console.log('❌ Sucursal Shopping Patagonia no encontrada.');
  console.log('📋 Sucursales disponibles:');
  sucursales.forEach(suc => {
    console.log(`   - ${suc.nombre} (ID: ${suc.id}) ${suc.activo ? '✅' : '❌'}`);
  });

  throw new Error('Sucursal Shopping Patagonia no encontrada. Verificar nombre en la base de datos.');
}

// Función para establecer stock en la sucursal
async function establecerStock(productoId, sucursalId, cantidadDeseada, usuarioId) {
  console.log(`   📦 Estableciendo stock de producto ${productoId} a ${cantidadDeseada} unidades`);

  // Verificar stock actual
  const stockActual = await prisma.stock.findFirst({
    where: {
      productoId: productoId,
      ubicacionId: sucursalId
    }
  });

  const cantidadActual = stockActual?.cantidad || 0;
  const diferencia = cantidadDeseada - cantidadActual;

  console.log(`   📊 Stock actual: ${cantidadActual}, Diferencia: ${diferencia}`);

  if (diferencia === 0) {
    console.log(`   ✅ Stock ya está correcto: ${cantidadActual} unidades`);
    return { stockAnterior: cantidadActual, stockNuevo: cantidadActual, diferencia: 0 };
  }

  // Realizar ajuste de stock
  if (stockActual) {
    // Actualizar stock existente
    const stockActualizado = await prisma.stock.update({
      where: { id: stockActual.id },
      data: {
        cantidad: cantidadDeseada,
        ultimaActualizacion: new Date()
      }
    });

    // Registrar movimiento
    await prisma.movimientoStock.create({
      data: {
        stockId: stockActualizado.id,
        tipoMovimiento: diferencia > 0 ? 'entrada' : 'salida',
        cantidad: Math.abs(diferencia),
        motivo: 'Carga stock inicial real Shopping Patagonia',
        usuarioId: usuarioId,
        fecha: new Date()
      }
    });

    console.log(`   ✅ Stock actualizado: ${cantidadActual} → ${cantidadDeseada}`);
    return { stockAnterior: cantidadActual, stockNuevo: cantidadDeseada, diferencia };
  } else {
    // Crear nuevo registro de stock
    const nuevoStock = await prisma.stock.create({
      data: {
        ubicacionId: sucursalId,
        productoId: productoId,
        cantidad: cantidadDeseada,
        ultimaActualizacion: new Date()
      }
    });

    // Registrar movimiento
    await prisma.movimientoStock.create({
      data: {
        stockId: nuevoStock.id,
        tipoMovimiento: 'entrada',
        cantidad: cantidadDeseada,
        motivo: 'Carga stock inicial real Shopping Patagonia',
        usuarioId: usuarioId,
        fecha: new Date()
      }
    });

    console.log(`   ✅ Stock creado: 0 → ${cantidadDeseada}`);
    return { stockAnterior: 0, stockNuevo: cantidadDeseada, diferencia: cantidadDeseada };
  }
}

// Función principal
async function cargarStockRealShoppingPatagonia() {
  console.log('🛍️ === CARGA DE STOCK REAL - SHOPPING PATAGONIA BARILOCHE ===\n');

  try {
    // 1. Obtener usuario admin
    const usuario = await obtenerUsuarioAdmin();
    console.log(`👤 Usuario para movimientos: ${usuario.name} (${usuario.email})`);

    // 2. Buscar sucursal Shopping Patagonia
    const sucursal = await buscarSucursalShoppingPatagonia();

    // 3. Parsear datos del stock real
    console.log('\n📋 Parseando datos del stock real...');
    const productosStock = parsearStockReal();
    console.log(`   ✅ ${productosStock.length} productos parseados`);

    // 4. Mostrar resumen por categoría
    const categorias = [...new Set(productosStock.map(p => p.categoria))];
    console.log('\n📂 Categorías encontradas:');
    categorias.forEach(cat => {
      const cantidadProductos = productosStock.filter(p => p.categoria === cat).length;
      const stockTotal = productosStock
        .filter(p => p.categoria === cat)
        .reduce((sum, p) => sum + p.stock, 0);
      console.log(`   ${cat}: ${cantidadProductos} productos, ${stockTotal} unidades totales`);
    });

    // 5. Procesar cada producto
    console.log('\n📦 Procesando stock por producto...\n');
    
    let procesados = 0;
    let encontrados = 0;
    let noEncontrados = 0;
    let actualizados = 0;
    let creados = 0;
    let sinCambios = 0;
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

        // Establecer stock
        const resultado = await establecerStock(
          producto.id, 
          sucursal.id, 
          item.stock, 
          usuario.id
        );

        if (resultado.diferencia === 0) {
          sinCambios++;
        } else if (resultado.stockAnterior === 0) {
          creados++;
        } else {
          actualizados++;
        }

        totalUnidadesCargadas += item.stock;

        procesadosDetalle.push({
          producto: producto.nombre,
          categoria: item.categoria,
          stockAnterior: resultado.stockAnterior,
          stockNuevo: resultado.stockNuevo,
          diferencia: resultado.diferencia,
          accion: resultado.diferencia === 0 ? 'Sin cambios' : 
                  resultado.stockAnterior === 0 ? 'Creado' : 'Actualizado'
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
    console.log('📊 === RESUMEN FINAL ===');
    console.log(`🏢 Sucursal: ${sucursal.nombre}`);
    console.log(`📋 Total productos en archivo: ${productosStock.length}`);
    console.log(`✅ Productos encontrados: ${encontrados}`);
    console.log(`❌ Productos no encontrados: ${noEncontrados}`);
    console.log(`📦 Stock creado: ${creados} productos`);
    console.log(`🔄 Stock actualizado: ${actualizados} productos`);
    console.log(`⚪ Sin cambios: ${sinCambios} productos`);
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

    // 8. Verificar stock final por categoría
    console.log('\n📂 === STOCK FINAL POR CATEGORÍA ===');
    for (const categoria of categorias) {
      const productosCategoria = procesadosDetalle.filter(p => p.categoria === categoria);
      if (productosCategoria.length > 0) {
        const totalStock = productosCategoria.reduce((sum, p) => sum + p.stockNuevo, 0);
        console.log(`${categoria}: ${productosCategoria.length} productos, ${totalStock} unidades`);
      }
    }

    return {
      sucursal: sucursal.nombre,
      totalProcesados: procesados,
      encontrados,
      noEncontrados,
      creados,
      actualizados,
      sinCambios,
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
📚 Script de Carga de Stock Real - Shopping Patagonia Bariloche

🎯 Propósito:
   Cargar el stock inicial real de la sucursal Shopping Patagonia
   basándose en el inventario físico actual.

🔧 Uso:
   node scripts/insertar/carga-stock-real-shopping-patagonia.js

📋 Qué hace:
   ✅ Parsea los datos reales del inventario físico
   ✅ Busca cada producto en la base de datos
   ✅ Establece el stock exacto en la sucursal Shopping Patagonia
   ✅ Registra todos los movimientos de stock
   ✅ Genera reporte completo de la operación

⚠️ Importante:
   - Los productos y categorías deben estar previamente cargados
   - La sucursal Shopping Patagonia debe existir
   - Se requiere un usuario admin para los movimientos
   - El script ESTABLECE el stock (no suma ni resta)

💡 Antes de ejecutar:
   1. Verificar que los productos estén cargados
   2. Confirmar que la sucursal existe con el nombre correcto
   3. Tener un usuario admin configurado

📊 Datos incluidos:
   - ${parsearStockReal().length} productos
   - ${[...new Set(parsearStockReal().map(p => p.categoria))].length} categorías
   - Stock total a cargar: ${parsearStockReal().reduce((sum, p) => sum + p.stock, 0)} unidades
`);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--ayuda') || args.includes('--help')) {
    mostrarAyuda();
    process.exit(0);
  }
  
  console.log('🚀 Iniciando carga de stock real...\n');
  
  cargarStockRealShoppingPatagonia()
    .then((resultado) => {
      console.log('\n🎉 === CARGA COMPLETADA EXITOSAMENTE ===');
      console.log(`📦 ${resultado.totalUnidadesCargadas} unidades cargadas en ${resultado.sucursal}`);
      console.log(`✅ ${resultado.encontrados} productos procesados correctamente`);
      
      if (resultado.noEncontrados > 0) {
        console.log(`⚠️ ${resultado.noEncontrados} productos no encontrados (revisar reporte arriba)`);
      }
      
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 === ERROR EN LA CARGA ===');
      console.error(error.message);
      process.exit(1);
    });
}

module.exports = { cargarStockRealShoppingPatagonia };