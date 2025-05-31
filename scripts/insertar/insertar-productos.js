// scripts/insertar/insertar-productos-completos.js - CARGA COMPLETA DESDE PLANILLA
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Datos completos de productos desde la planilla
const productosData = `codigo	Categoria	'Nombre	Precio en Pesos
1001	'ACEITES CORPORALES	'ACEITE  DE  ALMENDRAS	8500.00
1002	'ACEITES CORPORALES	'ACEITE  DE  COCO	6900.00
1003	'ACEITES CORPORALES	'ACEITE  DE  ROSA  MOSQUETA	9500.00
1004	'ACEITES CORPORALES	'ACEITE DE RICINO	7500.00
2001	'AGUAS	'AGUA  DE  AZAHAR	9500.00
2001	'AGUAS	'AGUA  DE  ROSAS	9500.00
3001	'BOMBAS ESFERVESCENTES	'BOMBA  ESF.  ALMENDRA	8500.00
3002	'BOMBAS ESFERVESCENTES	'BOMBA  ESF.  CHICLE	8500.00
3003	'BOMBAS ESFERVESCENTES	'BOMBA  ESF.  COCO  VAINILLA	8500.00
3004	'BOMBAS ESFERVESCENTES	'BOMBA  ESF.  FLORAL	8500.00
3005	'BOMBAS ESFERVESCENTES	'BOMBA  ESF.  FRUTOS  ROJOS	8500.00
3006	'BOMBAS ESFERVESCENTES	'BOMBA  ESF.  JAZMIN	8500.00
3007	'BOMBAS ESFERVESCENTES	'BOMBA  ESF.  LAVANDA	8500.00
3008	'BOMBAS ESFERVESCENTES	'BOMBA  ESF.  ROSA  MOSQUETA	8500.00
4001	'DIFUSOR AUTO	'DIFUSOR  DE  AUTO	8900.00
4002	'DIFUSOR AUTO	'REC.   DIFU.  AUTO  AUTO NUEVO	8900.00
4003	'DIFUSOR AUTO	'REC.   DIFU.  AUTO  BAMBU	8900.00
4004	'DIFUSOR AUTO	'REC.   DIFU.  AUTO  FLORES BLANCAS	8900.00
4005	'DIFUSOR AUTO	'REC.   DIFU.  AUTO  FRUTOS ROJOS	8900.00
4006	'DIFUSOR AUTO	'REC.   DIFU.  AUTO  LEMON GRASS	8900.00
4007	'DIFUSOR AUTO	'REC.   DIFU.  AUTO  LIMON Y JENGIBRE	8900.00
4008	'DIFUSOR AUTO	'REC.   DIFU.  AUTO  MANGO	8900.00
4009	'DIFUSOR AUTO	'REC.   DIFU.  AUTO  NARANJA Y CANELA	8900.00
4010	'DIFUSOR AUTO	'REC.   DIFU.  AUTO  NARANJA Y JENGIBRE	8900.00
4011	'DIFUSOR AUTO	'REC.   DIFU.  AUTO  NARANJA Y PIMIENTA	8900.00
4012	'DIFUSOR AUTO	'REC.   DIFU.  AUTO  PERAS Y FLORES	8900.00
4013	'DIFUSOR AUTO	'REC.   DIFU.  AUTO  ROSAS	8900.00
4014	'DIFUSOR AUTO	'REC.   DIFU.  AUTO  SANDALO	8900.00
4015	'DIFUSOR AUTO	'REC.   DIFU.  AUTO  TE VERDE	8900.00
4016	'DIFUSOR AUTO	'REC.   DIFU.  AUTO  VAINICOCO	8900.00
4017	'DIFUSOR AUTO	'REC.   DIFU.  AUTO  VAINILLA	8900.00
4018	'DIFUSOR AUTO	REC.   DIFU. AUTO LAVANDA	8900.00
5001	'DIFUSORES	'DIFUSOR  ALMENDRAS	25900.00
5002	'DIFUSORES	'DIFUSOR  BAMBU	25900.00
5003	'DIFUSORES	'DIFUSOR  BERGAMOTA	25900.00
5004	'DIFUSORES	'DIFUSOR  CALOR  DE  HOGAR	25900.00
5005	'DIFUSORES	'DIFUSOR  CITRONELLA	25900.00
5006	'DIFUSORES	'DIFUSOR  FLORES  BLANCAS	25900.00
5007	'DIFUSORES	'DIFUSOR  FRUTOS  ROJOS	25900.00
5008	'DIFUSORES	'DIFUSOR  GARDENIA	25900.00
5009	'DIFUSORES	'DIFUSOR  JAZMIN	25900.00
5010	'DIFUSORES	'DIFUSOR  LAVANDA  Y  ROMERO	25900.00
5011	'DIFUSORES	'DIFUSOR  LEMONGRASS	25900.00
5012	'DIFUSORES	'DIFUSOR  LIMON  Y  JENGIBRE	25900.00
5013	'DIFUSORES	'DIFUSOR  MADERAS  DEL  ORIENTE	25900.00
5014	'DIFUSORES	'DIFUSOR  MANGO	25900.00
5015	'DIFUSORES	'DIFUSOR  MANGO  Y  MARACUYA	25900.00
5016	'DIFUSORES	'DIFUSOR  NAGCHAMPA	25900.00
5017	'DIFUSORES	'DIFUSOR  NARANJA  CANELA	25900.00
5018	'DIFUSORES	'DIFUSOR  NARANJA  Y  JENGIBRE	25900.00
5019	'DIFUSORES	'DIFUSOR  NARANJA  Y  PIMIENTA	25900.00
5020	'DIFUSORES	'DIFUSOR  ORANGE	25900.00
5021	'DIFUSORES	'DIFUSOR  PALO  SANTO	25900.00
5022	'DIFUSORES	'DIFUSOR  PERAS  Y  FLORES	25900.00
5023	'DIFUSORES	'DIFUSOR  ROSAS	25900.00
5024	'DIFUSORES	'DIFUSOR  SAI  BABA	25900.00
5025	'DIFUSORES	'DIFUSOR  SANDALO	25900.00
5026	'DIFUSORES	'DIFUSOR  TE  VERDE	25900.00
5027	'DIFUSORES	'DIFUSOR  TILO	25900.00
5028	'DIFUSORES	'DIFUSOR  VAINICOCO	25900.00
5029	'DIFUSORES	'DIFUSOR  VAINILLA	25900.00
5030	'DIFUSORES	'DIFUSOR  VERBENA	25900.00
5031	'DIFUSORES	'DIFUSOR  WANAMA	25900.00
6001	'ESENCIAS HORNILLO	'ES.  HORNI.  BEBE	9500.00
6002	'ESENCIAS HORNILLO	'ES.  HORNI.  BERGAMOTA	9500.00
6003	'ESENCIAS HORNILLO	'ES.  HORNI.  CEREZA	9500.00
6004	'ESENCIAS HORNILLO	'ES.  HORNI.  CHERRY	9500.00
6005	'ESENCIAS HORNILLO	'ES.  HORNI.  CITRONELLA	9500.00
6006	'ESENCIAS HORNILLO	'ES.  HORNI.  COCO	9500.00
6007	'ESENCIAS HORNILLO	'ES.  HORNI.  EUCALIPTO	9500.00
6008	'ESENCIAS HORNILLO	'ES.  HORNI.  FLORAL	9500.00
6009	'ESENCIAS HORNILLO	'ES.  HORNI.  FLORES  BLANCAS	9500.00
6010	'ESENCIAS HORNILLO	'ES.  HORNI.  FRESIAS	9500.00
6011	'ESENCIAS HORNILLO	'ES.  HORNI.  INCIENSO	9500.00
6012	'ESENCIAS HORNILLO	'ES.  HORNI.  LAVANDA	9500.00
6013	'ESENCIAS HORNILLO	'ES.  HORNI.  LEMON  GRASS	9500.00
6014	'ESENCIAS HORNILLO	'ES.  HORNI.  MADERAS  DE  ORIENTE	9500.00
6015	'ESENCIAS HORNILLO	'ES.  HORNI.  MANZANA	9500.00
6016	'ESENCIAS HORNILLO	'ES.  HORNI.  MELON	9500.00
6017	'ESENCIAS HORNILLO	'ES.  HORNI.  MIEL	9500.00
6018	'ESENCIAS HORNILLO	'ES.  HORNI.  MIRRA	9500.00
6019	'ESENCIAS HORNILLO	'ES.  HORNI.  NAG  CHAMPA	9500.00
6020	'ESENCIAS HORNILLO	'ES.  HORNI.  NARANJA  CANELA	9500.00
6021	'ESENCIAS HORNILLO	'ES.  HORNI.  NARANJA  JENGIBRE	9500.00
6022	'ESENCIAS HORNILLO	'ES.  HORNI.  NARDO	9500.00
6023	'ESENCIAS HORNILLO	'ES.  HORNI.  PATCHULI	9500.00
6024	'ESENCIAS HORNILLO	'ES.  HORNI.  ROMERO	9500.00
6025	'ESENCIAS HORNILLO	'ES.  HORNI.  ROSAS	9500.00
6026	'ESENCIAS HORNILLO	'ES.  HORNI.  SANDALO	9500.00
6027	'ESENCIAS HORNILLO	'ES.  HORNI.  SANDALO  HINDU	9500.00
6028	'ESENCIAS HORNILLO	'ES.  HORNI.  TE  VERDE	9500.00
6029	'ESENCIAS HORNILLO	'ES.  HORNI.  TILO	9500.00
6030	'ESENCIAS HORNILLO	'ES.  HORNI.  VAINICOCO	9500.00
6031	'ESENCIAS HORNILLO	'ES.  HORNI.  VAINILLA	9500.00
6032	'ESENCIAS HORNILLO	'ES.  HORNI.  VERBENA	9500.00
7001	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.AKITA	14500.00
7002	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.AMSTERDAM	14500.00
7003	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.APHRODITA	14500.00
7004	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.BELICE	14500.00
7005	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.BERGAMOTA	14500.00
7006	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.CALIFORNIA	14500.00
7007	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.CANCUN	14500.00
7008	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.CARIBEAN	14500.00
7009	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.CHANDAL	14500.00
7010	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.CHICLE	14500.00
7011	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.DELICATEZA	14500.00
7012	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.EUCALIPTO	14500.00
7013	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.GINGER	14500.00
7014	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.GREEN TEA	14500.00
7015	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.GROSEILLE	14500.00
7016	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.KANNAUJ	14500.00
7017	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.LAVANDA	14500.00
7018	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.LEMON	14500.00
7019	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.LOTUS  FRESH	14500.00
7020	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.MADRE SELVA	14500.00
7021	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.MALASIA	14500.00
7022	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.MANGO Y MARACUYA	14500.00
7023	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.MONASTRELL	14500.00
7024	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.NARANJA  Y  PIMIENTA	14500.00
7025	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.ORANGE	14500.00
7026	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.ORQUIDEA  NEGRA	14500.00
7027	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.PARADISE	14500.00
7028	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.PITANGA	14500.00
7029	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.POMELO BLUEBERRY	14500.00
7030	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.ROMANTIC  WISH	14500.00
7031	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.SAI  BABA	14500.00
7032	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.TAHITI	14500.00
7033	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.TE  VERDE  Y  JENGIBRE	14500.00
7034	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.ULTRA VIOLET	14500.00
7035	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.UVA Y FRUTOS ROJOS	14500.00
7036	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.VAINILLA CARAMELO	14500.00
7037	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.VAINILLA CEDRO	14500.00
7038	'ESENCIAS HUMIDIFICADOR	'ES.HUMI.VAINILLA COCO	14500.00
8001	'ESPUMA DE BAÑO	'ESP.  DE  BAÑO  ALMENDRAS	13900.00
8002	'ESPUMA DE BAÑO	'ESP.  DE  BAÑO  EUCALIPTO	13900.00
8003	'ESPUMA DE BAÑO	'ESP.  DE  BAÑO  FLORAL	13900.00
8004	'ESPUMA DE BAÑO	'ESP.  DE  BAÑO  FRUTAL	13900.00
8005	'ESPUMA DE BAÑO	'ESP.  DE  BAÑO  FRUTOS  ROJOS	13900.00
8006	'ESPUMA DE BAÑO	'ESP.  DE  BAÑO  LAVANDA	13900.00
8007	'ESPUMA DE BAÑO	'ESP.  DE  BAÑO  ROSA  MOSQUETA	13900.00
8008	'ESPUMA DE BAÑO	'ESP.  DE  BAÑO  ROSAS	13900.00
8009	'ESPUMA DE BAÑO	'ESP.  DE  BAÑO  TILO	13900.00
8010	'ESPUMA DE BAÑO	'ESP.  DE  BAÑO  VAINICOCO	13900.00
9001	'FRAGANCIAS TEXTILES	'F.  TEXTIL  AKIA	15900.00
9002	'FRAGANCIAS TEXTILES	'F.  TEXTIL  CHER	15900.00
9003	'FRAGANCIAS TEXTILES	'F.  TEXTIL  CONI	15900.00
9004	'FRAGANCIAS TEXTILES	'F.  TEXTIL  CROMBIE	15900.00
9005	'FRAGANCIAS TEXTILES	'F.  TEXTIL  FRESH	15900.00
9006	'FRAGANCIAS TEXTILES	'F.  TEXTIL  KOSIUK	15900.00
9007	'FRAGANCIAS TEXTILES	'F.  TEXTIL  MILLON	15900.00
9008	'FRAGANCIAS TEXTILES	'F.  TEXTIL  TOMY	15900.00
9009	'FRAGANCIAS TEXTILES	'F.  TEXTIL  WANA	15900.00
9010	'FRAGANCIAS TEXTILES	'F.  TEXTIL  YAPA	15900.00
10001	'HOME SPRAY	'HOME  SPRAY  CALM	16900.00
10002	'HOME SPRAY	'HOME  SPRAY  CARIBEAN	16900.00
10003	'HOME SPRAY	'HOME  SPRAY  DREAMS	16900.00
10004	'HOME SPRAY	'HOME  SPRAY  FLOWERS	16900.00
10005	'HOME SPRAY	'HOME  SPRAY  GLAMOUR	16900.00
10006	'HOME SPRAY	'HOME  SPRAY  HARMONY	16900.00
10007	'HOME SPRAY	'HOME  SPRAY  INTENSE	16900.00
10008	'HOME SPRAY	'HOME  SPRAY  LIVE	16900.00
10009	'HOME SPRAY	'HOME  SPRAY  LOVE	16900.00
10010	'HOME SPRAY	'HOME  SPRAY  PEACE	16900.00
10011	'HOME SPRAY	'HOME  SPRAY  PURO	16900.00
10012	'HOME SPRAY	'HOME  SPRAY  QUINTANA  ROO	16900.00
10013	'HOME SPRAY	'HOME  SPRAY  RELAX	16900.00
10014	'HOME SPRAY	'HOME  SPRAY  SER	16900.00
10015	'HOME SPRAY	'HOME  SPRAY  SWEET	16900.00
11001	JABONES	'JABON  LIQUIDO  ALOE	14500.00
11002	JABONES	'JABON  LIQUIDO  CANCUN	14500.00
11003	JABONES	'JABON  LIQUIDO  CHANDAL	14500.00
11004	JABONES	'JABON  LIQUIDO  HIBISCUS	14500.00
11005	JABONES	'JABON  LIQUIDO  MANGO Y MARACUYA	14500.00
11006	JABONES	'JABON  LIQUIDO  PARADISE	14500.00
11007	JABONES	'JABON  LIQUIDO  VAINILLA COCO	14500.00
12001	JABONES	'JABON  SOLIDO  AVENA Y COCO	4900.00
12002	JABONES	'JABON  SOLIDO  CACAO	4900.00
12003	JABONES	'JABON  SOLIDO  CALENDULA	4900.00
12004	JABONES	'JABON  SOLIDO  CARBON ACTIVADO	4900.00
12005	JABONES	'JABON  SOLIDO  LAVANDA	4900.00
12006	JABONES	'JABON  SOLIDO  MALBEC	4900.00
12007	JABONES	'JABON  SOLIDO  MANZANILLA	4900.00
12008	JABONES	'JABON  SOLIDO  OLIVA	4900.00
12009	JABONES	'JABON  SOLIDO  ROSA MOSQUETA	4900.00
12010	JABONES	'JABON SOLIDO CAFE	4900.00
12011	JABONES	'JABON SOLIDO CENTELLA ASIATICA	4900.00
13001	'SALES DE BAÑO	'SAL  DE  BAÑO  COCO  VAINILLA	9500.00
13002	'SALES DE BAÑO	'SAL  DE  BAÑO  EUCALIPTO	9500.00
13003	'SALES DE BAÑO	'SAL  DE  BAÑO  FRUTOS  ROJOS	9500.00
13004	'SALES DE BAÑO	'SAL  DE  BAÑO  LAVANDA	9500.00
13005	'SALES DE BAÑO	'SAL  DE  BAÑO  MARINA	9500.00
13006	'SALES DE BAÑO	'SAL  DE  BAÑO  ROSAS	9500.00
13007	'SALES DE BAÑO	'SAL  DE  BAÑO  TILO	9500.00
13008	'SALES DE BAÑO	'SAL  DE  BAÑO  VAINILLA	9500.00
15001	'VARIOS	'ADAPTADOR  PARA  HUMI	8500.00
15002	'VARIOS	'APAGA  VELAS	4500.00
15003	'VARIOS	'FILTRO  HUMIDIFICADOR	2500.00
14001	'VELAS DE SOJA	'VELA  DE  SOJA  BOMBE  CON  FRASE	26500.00
14002	'VELAS DE SOJA	'VELA  DE  SOJA  CARAMELERA	45000.00
14003	'VELAS DE SOJA	'VELA  DE  SOJA  CATEDRAL  GRANDE	39000.00
14004	'VELAS DE SOJA	'VELA  DE  SOJA  ECO  CON  TAPA	23500.00
14005	'VELAS DE SOJA	'VELA  DE  SOJA  ECO  SIN  TAPA	20500.00
14006	'VELAS DE SOJA	'VELA  DE  SOJA  GEOGLIFICA	49000.00
14007	'VELAS DE SOJA	'VELA  DE  SOJA  URSULA  COLOR  CON  TAPA	39000.00
14008	'VELAS DE SOJA	'VELA  DE  SOJA  URSULA  SIN  TAPA	23500.00
14009	'VELAS DE SOJA	'VELA  DE  SOJA  URSULA  VIDRIO  CON  TAPA	25500.00
14010	'VELAS DE SOJA	'VELA DE SOJA ACANALADA	49000.00
14011	'VELAS DE SOJA	'VELA DE SOJA CERAMICA	29500.00
14012	'VELAS DE SOJA	'VELA DE SOJA REDONDA GRANDE	39000.00
14013	'VELAS DE SOJA	'VELA DE SOJA RELIEVE	39000.00
14014	'VELAS DE SOJA	'VELA DE SOJA ROMBOS	39000.00
14015	'VELAS DE SOJA	'VELA DE SOJA TRIANGULO GRANDE	79000.00`;

// Mapeo de categorías de la planilla a nombres más limpios
const categoriasMapping = {
  "'ACEITES CORPORALES": "Aceites Corporales",
  "'AGUAS": "Aguas Aromáticas", 
  "'BOMBAS ESFERVESCENTES": "Bombas de Baño",
  "'DIFUSOR AUTO": "Difusores para Auto",
  "'DIFUSORES": "Difusores",
  "'ESENCIAS HORNILLO": "Esencias para Hornillo",
  "'ESENCIAS HUMIDIFICADOR": "Esencias para Humidificador",
  "'ESPUMA DE BAÑO": "Espumas de Baño",
  "'FRAGANCIAS TEXTILES": "Fragancias Textiles",
  "'HOME SPRAY": "Home Sprays",
  "JABONES": "Jabones",
  "'SALES DE BAÑO": "Sales de Baño",
  "'VARIOS": "Accesorios",
  "'VELAS DE SOJA": "Velas de Soja"
};

// Función para generar código de barras EAN-13 válido
function generarCodigoBarrasEAN13(codigo) {
  // Usar el código base y agregar dígitos para formar EAN-13
  const paisArg = '779'; // Código de país Argentina
  const empresa = '1000'; // Código de empresa ficticio
  const producto = codigo.toString().padStart(5, '0');
  
  // Construir los primeros 12 dígitos
  const base = paisArg + empresa + producto;
  
  // Calcular dígito verificador
  let suma = 0;
  for (let i = 0; i < 12; i++) {
    const digito = parseInt(base[i]);
    suma += (i % 2 === 0) ? digito : digito * 3;
  }
  
  const digitoVerificador = (10 - (suma % 10)) % 10;
  
  return base + digitoVerificador;
}

// Función para procesar los datos de la planilla
function procesarDatosPlanilla() {
  const lineas = productosData.split('\n').slice(1); // Omitir header
  const productos = [];
  
  for (const linea of lineas) {
    if (!linea.trim()) continue;
    
    const partes = linea.split('\t');
    if (partes.length < 4) continue;
    
    const codigo = parseInt(partes[0]);
    const categoriaRaw = partes[1].trim();
    const nombreRaw = partes[2].trim();
    const precio = parseFloat(partes[3]);
    
    // Limpiar nombre (quitar comilla inicial si existe)
    const nombre = nombreRaw.startsWith("'") ? nombreRaw.substring(1) : nombreRaw;
    
    // Mapear categoría
    const categoria = categoriasMapping[categoriaRaw] || categoriaRaw.replace("'", "");
    
    // Generar código de barras válido
    const codigoBarras = generarCodigoBarrasEAN13(codigo);
    
    productos.push({
      codigo,
      categoria,
      nombre: nombre.trim(),
      precio,
      codigoBarras
    });
  }
  
  return productos;
}

// Función para crear/obtener categorías
async function crearCategorias() {
  console.log('📂 Creando categorías...');
  
  const categoriasUnicas = [...new Set(Object.values(categoriasMapping))];
  const categoriaMap = new Map();
  
  for (const nombreCategoria of categoriasUnicas) {
    try {
      let categoria = await prisma.categoria.findUnique({
        where: { nombre: nombreCategoria }
      });
      
      if (!categoria) {
        categoria = await prisma.categoria.create({
          data: { nombre: nombreCategoria }
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

// Función para verificar dependencias antes de limpiar
async function verificarDependencias() {
  console.log('🔍 Verificando dependencias de productos...');
  
  try {
    // Verificar ventas
    const ventasCount = await prisma.itemVenta.count();
    
    // Verificar recetas de productos
    const recetasCount = await prisma.productoReceta.count();
    
    // Verificar stock
    const stockCount = await prisma.stock.count({
      where: { productoId: { not: null } }
    });
    
    console.log(`   📋 Ventas existentes: ${ventasCount}`);
    console.log(`   📋 Recetas de productos: ${recetasCount}`);
    console.log(`   📋 Registros de stock: ${stockCount}`);
    
    return {
      ventas: ventasCount,
      recetas: recetasCount,
      stock: stockCount,
      total: ventasCount + recetasCount + stockCount
    };
  } catch (error) {
    console.error('❌ Error verificando dependencias:', error);
    return { ventas: 0, recetas: 0, stock: 0, total: 0 };
  }
}

// Función para limpiar productos existentes
async function limpiarProductosExistentes(forzar = false) {
  console.log('🧹 Preparando limpieza de productos existentes...');
  
  const dependencias = await verificarDependencias();
  
  if (dependencias.total > 0 && !forzar) {
    console.log('⚠️ Se encontraron dependencias de productos:');
    console.log(`   - ${dependencias.ventas} ventas`);
    console.log(`   - ${dependencias.recetas} recetas`);
    console.log(`   - ${dependencias.stock} registros de stock`);
    console.log('');
    console.log('💡 Opciones:');
    console.log('   1. Ejecutar con --forzar para eliminar todo');
    console.log('   2. Solo desactivar productos existentes');
    
    // Solo desactivar productos
    const desactivados = await prisma.producto.updateMany({
      data: { activo: false }
    });
    
    console.log(`   🔄 ${desactivados.count} productos desactivados`);
    return { eliminados: 0, desactivados: desactivados.count };
  }
  
  try {
    console.log('🗑️ Eliminando dependencias...');
    
    // Eliminar en orden correcto
    await prisma.productoReceta.deleteMany({});
    console.log('   ✅ Recetas de productos eliminadas');
    
    await prisma.movimientoStock.deleteMany({
      where: { stock: { productoId: { not: null } } }
    });
    console.log('   ✅ Movimientos de stock eliminados');
    
    await prisma.stock.deleteMany({
      where: { productoId: { not: null } }
    });
    console.log('   ✅ Stock de productos eliminado');
    
    // Finalmente eliminar productos
    const eliminados = await prisma.producto.deleteMany({});
    console.log(`   ✅ ${eliminados.count} productos eliminados`);
    
    return { eliminados: eliminados.count, desactivados: 0 };
    
  } catch (error) {
    console.error('❌ Error eliminando productos:', error);
    throw error;
  }
}

// Función principal para insertar productos
async function insertarProductosCompletos(forzarLimpieza = false) {
  console.log('📦 === CARGA COMPLETA DE PRODUCTOS DESDE PLANILLA ===\n');
  
  try {
    // 1. Procesar datos de la planilla
    console.log('📋 Procesando datos de la planilla...');
    const productosData = procesarDatosPlanilla();
    console.log(`   Procesados ${productosData.length} productos`);
    
    // 2. Crear categorías
    const categoriaMap = await crearCategorias();
    
    // 3. Limpiar productos existentes
    const limpieza = await limpiarProductosExistentes(forzarLimpieza);
    
    // 4. Insertar nuevos productos
    console.log('\n📦 Insertando productos...');
    
    let insertados = 0;
    let errores = 0;
    const erroresDetalle = [];
    
    for (const item of productosData) {
      try {
        const categoriaId = categoriaMap.get(item.categoria);
        
        if (!categoriaId) {
          throw new Error(`Categoría no encontrada: ${item.categoria}`);
        }
        
        // Verificar que el código de barras sea único
        const existente = await prisma.producto.findUnique({
          where: { codigoBarras: item.codigoBarras }
        });
        
        if (existente) {
          console.log(`   ⚠️ Código ${item.codigoBarras} ya existe, generando alternativo...`);
          item.codigoBarras = generarCodigoBarrasEAN13(item.codigo + 10000);
        }
        
        const producto = await prisma.producto.create({
          data: {
            nombre: item.nombre,
            descripcion: `${item.categoria} - Código: ${item.codigo}`,
            precio: item.precio,
            codigoBarras: item.codigoBarras,
            categoriaId: categoriaId,
            stockMinimo: 5,
            activo: true
          }
        });
        
        console.log(`   ✅ ${producto.nombre} - $${producto.precio} (${item.codigoBarras})`);
        insertados++;
        
      } catch (error) {
        console.error(`   ❌ Error con ${item.nombre}: ${error.message}`);
        errores++;
        erroresDetalle.push(`${item.nombre}: ${error.message}`);
      }
    }
    
    // 5. Mostrar resumen
    console.log('\n📊 === RESUMEN DE CARGA ===');
    console.log(`✅ Productos insertados: ${insertados}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`🔄 Productos eliminados: ${limpieza.eliminados}`);
    console.log(`📴 Productos desactivados: ${limpieza.desactivados}`);
    console.log(`📂 Categorías procesadas: ${categoriaMap.size}`);
    
    if (errores > 0) {
      console.log('\n❌ Errores detallados:');
      erroresDetalle.forEach(error => console.log(`   - ${error}`));
    }
    
    // 6. Verificar algunos productos insertados
    console.log('\n🔍 Verificación de productos insertados:');
    const muestra = await prisma.producto.findMany({
      take: 5,
      include: { categoria: true },
      orderBy: { createdAt: 'desc' }
    });
    
    muestra.forEach(producto => {
      console.log(`   📦 ${producto.nombre} - ${producto.categoria.nombre} - $${producto.precio}`);
    });
    
    return {
      insertados,
      errores,
      limpieza,
      categorias: categoriaMap.size
    };
    
  } catch (error) {
    console.error('❌ Error general:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const args = process.argv.slice(2);
  const forzarLimpieza = args.includes('--forzar');
  
  if (forzarLimpieza) {
    console.log('⚠️ MODO FORZAR ACTIVADO - Se eliminarán TODAS las dependencias');
  }
  
  insertarProductosCompletos(forzarLimpieza)
    .then((resultado) => {
      console.log('\n🎉 === CARGA COMPLETADA EXITOSAMENTE ===');
      console.log(`📦 ${resultado.insertados} productos cargados`);
      console.log(`📂 ${resultado.categorias} categorías procesadas`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 === ERROR EN LA CARGA ===');
      console.error(error);
      process.exit(1);
    });
}

module.exports = { 
  insertarProductosCompletos,
  procesarDatosPlanilla,
  generarCodigoBarrasEAN13
};