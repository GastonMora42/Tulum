// scripts/insertar/carga-productos-reales-2025.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapeo de categorías de la planilla a nombres en base de datos
const categoriasMapping = {
  'DIFUSORES DE AUTO': 'Difusores para Auto',
  'DIFUSORES DE HOGAR': 'Difusores',
  'ESENCIAS HUMIDIFICADORES': 'Esencias para Humidificador',
  'ESPUMAS DE BAÑO': 'Espumas de Baño',
  'FRAGANCIAS TEXTILES': 'Fragancias Textiles',
  'HOME SPRAY': 'Home Sprays',
  'JABONES LIQUIDOS': 'Jabones',
  'SALES DE BAÑO': 'Sales de Baño',
  'JABONES SOLIDOS': 'Jabones',
  'BOMBAS ESFERVESCENTES': 'Bombas de Baño',
  'ESENCIAS DE HORNILLO': 'Esencias para Hornillo',
  'ACEITES': 'Aceites Corporales',
  'VARIOS': 'Accesorios'
};

// Mapeo de sucursales
const sucursalesMapping = {
  'SHOPPING PATAGONIA': 'Shopping Patagonia',
  'ALTO CAMAHUE': 'Alto Comahue',
  'MENDOZA SHOPPING': 'Mendoza Shopping',
  'PALMARES': 'Palmares'
};

// Datos de productos desde la planilla
const productosData = `
DIFUSORES DE AUTO	DIFUSOR DE AUTO   	100	100	100	100	25	$ 8.900
DIFUSORES DE AUTO	REC. DIFU. AUTO AUTO NUEVO 	9	9	9	9	3	$ 9.500
DIFUSORES DE AUTO	REC. DIFU. AUTO BAMBU  	9	9	9	9	3	$ 9.500
DIFUSORES DE AUTO	REC. DIFU. AUTO FLORES BLANCAS 	9	9	9	9	3	$ 9.500
DIFUSORES DE AUTO	REC. DIFU. AUTO FRUTOS ROJOS 	9	9	9	9	3	$ 9.500
DIFUSORES DE AUTO	REC. DIFU. AUTO LEMON GRASS 	9	9	9	9	3	$ 9.500
DIFUSORES DE AUTO	REC. DIFU. AUTO LIMON Y JENGIBRE	9	9	9	9	3	$ 9.500
DIFUSORES DE AUTO	REC. DIFU. AUTO MANGO  	9	9	9	9	3	$ 9.500
DIFUSORES DE AUTO	REC. DIFU. AUTO NARANJA Y CANELA	9	9	9	9	3	$ 9.500
DIFUSORES DE AUTO	REC. DIFU. AUTO NARANJA Y JENGIBRE	9	9	9	9	3	$ 9.500
DIFUSORES DE AUTO	REC. DIFU. AUTO NARANJA Y PIMIENTA	9	9	9	9	3	$ 9.500
DIFUSORES DE AUTO	REC. DIFU. AUTO PERAS Y FLORES	9	9	9	9	3	$ 9.500
DIFUSORES DE AUTO	REC. DIFU. AUTO ROSAS  	9	9	9	9	3	$ 9.500
DIFUSORES DE AUTO	REC. DIFU. AUTO SANDALO  	9	9	9	9	3	$ 9.500
DIFUSORES DE AUTO	REC. DIFU. AUTO TE VERDE 	9	9	9	9	3	$ 9.500
DIFUSORES DE AUTO	REC. DIFU. AUTO VAINICOCO  	9	9	9	9	3	$ 9.500
DIFUSORES DE AUTO	REC. DIFU. AUTO VAINILLA  	9	9	9	9	3	$ 9.500
DIFUSORES DE AUTO	REC.DIFU. AUTO LAVANDA   	9	9	9	9	3	$ 9.500
DIFUSORES DE HOGAR	DIFUSOR ALMENDRAS  	14	13	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR BAMBU  	14	13	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR BERGAMOTA  	14	13	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR CALOR DE HOGAR	14	13	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR CITRONELLA  	14	13	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR FLORES BLANCAS 	14	13	21	21	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR FRUTOS ROJOS 	14	13	21	21	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR GARDENIA  	14	13	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR JAZMIN  	14	13	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR LAVANDA Y ROMERO	14	12	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR LEMONGRASS  	14	12	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR LIMON Y JENGIBRE	14	12	21	21	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR MADERAS DEL ORIENTE	14	12	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR MANGO  	14	12	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR MANGO Y MARACUYA	14	12	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR NAGCHAMPA  	14	13	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR NARANJA CANELA 	14	13	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR NARANJA Y JENGIBRE	14	13	21	21	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR NARANJA Y PIMIENTA	14	13	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR ORANGE  	14	13	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR PALO SANTO 	14	13	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR PERAS Y FLORES	14	19	21	21	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR ROSAS  	14	13	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR SAI BABA 	14	13	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR SANDALO  	14	12	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR TE VERDE 	14	12	21	21	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR TILO  	14	12	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR VAINICOCO  	14	19	21	21	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR VAINILLA  	14	12	14	14	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR VERBENA  	14	19	21	21	4	$ 26.900
DIFUSORES DE HOGAR	DIFUSOR WANAMA  	14	12	14	14	4	$ 26.900
ESENCIAS HUMIDIFICADORES	ES.HUMI.AKITA     	12	30	18	18	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.AMSTERDAM     	12	30	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.APHRODITA     	12	30	18	18	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.BELICE     	12	28	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.BERGAMOTA     	12	28	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.CALIFORNIA     	12	28	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.CANCUN     	12	28	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.CARIBEAN     	12	28	18	18	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.CHANDAL     	12	28	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.CHICLE     	12	28	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.DELICATEZA     	12	28	18	18	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.EUCALIPTO     	12	28	18	18	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.GINGER     	12	28	18	18	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.GREEN TEA    	12	28	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.GROSEILLE     	12	28	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.KANNAUJ     	12	28	18	18	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.LAVANDA     	12	28	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.LEMON     	12	28	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.LOTUS FRESH    	12	0	18	18	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.MADRE SELVA    	12	28	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.MALASIA     	12	28	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.MANGO Y MARACUYA   	12	28	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.MONASTRELL     	12	28	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.NARANJA Y PIMIENTA   	12	28	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.ORANGE     	12	28	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.ORQUIDEA NEGRA    	12	30	18	18	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.PARADISE     	12	30	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.PITANGA     	12	30	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.POMELO BLUEBERRY    	12	28	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.SAI BABA    	12	28	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.TAHITI     	12	28	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.TE VERDE Y JENGIBRE  	12	28	18	18	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.ULTRA VIOLET    	12	28	18	18	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.UVA Y FRUTOS ROJOS  	12	28	18	18	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.VAINILLA CARAMELO    	12	30	18	18	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.VAINILLA CEDRO    	12	30	12	12	4	$ 15.500
ESENCIAS HUMIDIFICADORES	ES.HUMI.VAINILLA COCO    	12	30	18	18	4	$ 15.500
ESPUMAS DE BAÑO	ESP. DE BAÑO ALMENDRAS  	8	6	0	0	2	$ 14.900
ESPUMAS DE BAÑO	ESP. DE BAÑO EUCALIPTO  	8	6	14	14	2	$ 14.900
ESPUMAS DE BAÑO	ESP. DE BAÑO FLORAL  	8	8	0	0	2	$ 14.900
ESPUMAS DE BAÑO	ESP. DE BAÑO FRUTAL  	8	6	14	14	2	$ 14.900
ESPUMAS DE BAÑO	ESP. DE BAÑO FRUTOS ROJOS 	8	8	14	14	2	$ 14.900
ESPUMAS DE BAÑO	ESP. DE BAÑO LAVANDA  	8	8	14	14	2	$ 14.900
ESPUMAS DE BAÑO	ESP. DE BAÑO ROSA MOSQUETA 	8	8	14	14	2	$ 14.900
ESPUMAS DE BAÑO	ESP. DE BAÑO ROSAS  	8	6	0	0	2	$ 14.900
ESPUMAS DE BAÑO	ESP. DE BAÑO TILO  	8	8	14	14	2	$ 14.900
ESPUMAS DE BAÑO	ESP. DE BAÑO VAINICOCO  	8	8	14	14	2	$ 14.900
FRAGANCIAS TEXTILES	F. TEXTIL AKIA   	10	26	21	21	6	$ 16.500
FRAGANCIAS TEXTILES	F. TEXTIL CHER   	10	26	21	21	6	$ 16.500
FRAGANCIAS TEXTILES	F. TEXTIL CONI   	10	26	21	21	6	$ 16.500
FRAGANCIAS TEXTILES	F. TEXTIL CROMBIE   	10	20	14	14	6	$ 16.500
FRAGANCIAS TEXTILES	F. TEXTIL FRESH   	10	26	21	21	6	$ 16.500
FRAGANCIAS TEXTILES	F. TEXTIL KOSIUK   	10	20	21	21	6	$ 16.500
FRAGANCIAS TEXTILES	F. TEXTIL MILLON   	10	26	21	21	6	$ 16.500
FRAGANCIAS TEXTILES	F. TEXTIL TOMY   	10	26	21	21	6	$ 16.500
FRAGANCIAS TEXTILES	F. TEXTIL WANA   	10	20	21	21	6	$ 16.500
FRAGANCIAS TEXTILES	F. TEXTIL YAPA   	10	20	14	14	6	$ 16.500
HOME SPRAY	HOME SPRAY CALM   	12	19	14	14	6	$ 16.900
HOME SPRAY	HOME SPRAY CARIBEAN   	12	20	14	14	6	$ 16.900
HOME SPRAY	HOME SPRAY DREAMS   	12	13	14	14	6	$ 16.900
HOME SPRAY	HOME SPRAY FLOWERS   	12	13	14	14	6	$ 16.900
HOME SPRAY	HOME SPRAY GLAMOUR   	12	13	14	14	6	$ 16.900
HOME SPRAY	HOME SPRAY HARMONY   	12	20	14	14	6	$ 16.900
HOME SPRAY	HOME SPRAY INTENSE   	12	13	14	14	6	$ 16.900
HOME SPRAY	HOME SPRAY LIVE   	12	20	14	14	6	$ 16.900
HOME SPRAY	HOME SPRAY LOVE   	12	20	0	0	6	$ 16.900
HOME SPRAY	HOME SPRAY PEACE   	12	13	14	14	6	$ 16.900
HOME SPRAY	HOME SPRAY PURO   	12	20	14	14	6	$ 16.900
HOME SPRAY	HOME SPRAY QUINTANA ROO  	12	20	14	14	6	$ 16.900
HOME SPRAY	HOME SPRAY RELAX   	12	13	14	14	6	$ 16.900
HOME SPRAY	HOME SPRAY SER   	12	20	14	14	6	$ 16.900
HOME SPRAY	HOME SPRAY SWEET   	12	13	14	14	6	$ 16.900
JABONES LIQUIDOS	JABON LIQUIDO ALOE   	6	12	14	14	3	$ 15.500
JABONES LIQUIDOS	JABON LIQUIDO CANCUN   	6	12	14	14	3	$ 15.500
JABONES LIQUIDOS	JABON LIQUIDO CHANDAL   	6	12	14	14	3	$ 15.500
JABONES LIQUIDOS	JABON LIQUIDO HIBISCUS   	6	9	14	14	3	$ 15.500
JABONES LIQUIDOS	JABON LIQUIDO MANGO Y MARACUYA 	6	12	14	14	3	$ 15.500
JABONES LIQUIDOS	JABON LIQUIDO PARADISE   	6	12	14	14	3	$ 15.500
JABONES LIQUIDOS	JABON LIQUIDO VAINILLA COCO  	6	12	14	14	3	$ 15.500
SALES DE BAÑO	SAL DE BAÑO COCO VAINILLA 	8	12	0	0	4	$ 9.900
SALES DE BAÑO	SAL DE BAÑO EUCALIPTO  	8	12	18	18	4	$ 9.900
SALES DE BAÑO	SAL DE BAÑO FRUTOS ROJOS 	8	12	18	18	4	$ 9.900
SALES DE BAÑO	SAL DE BAÑO LAVANDA  	8	12	18	18	4	$ 9.900
SALES DE BAÑO	SAL DE BAÑO MARINA  	8	12	18	18	4	$ 9.900
SALES DE BAÑO	SAL DE BAÑO ROSAS  	8	12	18	18	4	$ 9.900
SALES DE BAÑO	SAL DE BAÑO TILO  	8	12	18	18	4	$ 9.900
SALES DE BAÑO	SAL DE BAÑO VAINILLA  	8	12	18	18	4	$ 9.900
JABONES SOLIDOS	JABON SOLIDO AVENA Y COCO 	3	3	3	3	0	$ 6.900
JABONES SOLIDOS	JABON SOLIDO CACAO   	3	3	3	3	0	$ 6.900
JABONES SOLIDOS	JABON SOLIDO CALENDULA   	3	3	3	3	0	$ 6.900
JABONES SOLIDOS	JABON SOLIDO CARBON ACTIVADO  	3	3	3	3	0	$ 6.900
JABONES SOLIDOS	JABON SOLIDO LAVANDA   	3	3	3	3	0	$ 6.900
JABONES SOLIDOS	JABON SOLIDO MALBEC   	3	3	3	3	0	$ 6.900
JABONES SOLIDOS	JABON SOLIDO MANZANILLA   	3	3	3	3	0	$ 6.900
JABONES SOLIDOS	JABON SOLIDO OLIVA   	3	3	3	3	0	$ 6.900
JABONES SOLIDOS	JABON SOLIDO ROSA MOSQUETA  	3	3	3	3	0	$ 6.900
JABONES SOLIDOS	JABON SOLIDO CAFE   	3	3	3	3	0	$ 6.900
JABONES SOLIDOS	JABON SOLIDO CENTELLA ASIATICA  	3	3	3	3	0	$ 6.900
BOMBAS ESFERVESCENTES	BOMBA ESF. ALMENDRA   	5	5	5	5	2	$ 8.900
BOMBAS ESFERVESCENTES	BOMBA ESF. CHICLE   	5	5	5	5	2	$ 8.900
BOMBAS ESFERVESCENTES	BOMBA ESF. COCO VAINILLA  	5	5	10	10	2	$ 8.900
BOMBAS ESFERVESCENTES	BOMBA ESF. FLORAL   	5	5	5	5	2	$ 8.900
BOMBAS ESFERVESCENTES	BOMBA ESF. FRUTOS ROJOS  	5	5	5	5	2	$ 8.900
BOMBAS ESFERVESCENTES	BOMBA ESF. JAZMIN   	5	5	10	10	2	$ 8.900
BOMBAS ESFERVESCENTES	BOMBA ESF. LAVANDA   	5	5	10	10	2	$ 8.900
BOMBAS ESFERVESCENTES	BOMBA ESF. ROSA MOSQUETA  	5	5	10	10	2	$ 8.900
ESENCIAS DE HORNILLO	ES. HORNI. BEBE   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. BERGAMOTA   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. CEREZA   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. CHERRY   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. CITRONELLA   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. COCO   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. EUCALIPTO   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. FLORAL   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. FLORES BLANCAS  	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. FRESIAS   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. INCIENSO   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. LAVANDA   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. LEMON GRASS  	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. MADERAS DE ORIENTE 	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. MANZANA   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. MELON   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. MIEL   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. MIRRA   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. NAG CHAMPA  	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. NARANJA CANELA  	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. NARANJA JENGIBRE  	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. NARDO   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. PATCHULI   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. ROMERO   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. ROSAS   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. SANDALO   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. SANDALO HINDU  	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. TE VERDE  	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. TILO   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. VAINICOCO   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. VAINILLA   	12	10	10	10	4	$ 9.900
ESENCIAS DE HORNILLO	ES. HORNI. VERBENA   	12	10	10	10	4	$ 9.900
ACEITES	ACEITE DE ALMENDRAS   	10	10	10	10	4	$ 8.900
ACEITES	ACEITE DE COCO   	10	10	10	10	4	$ 7.500
ACEITES	ACEITE DE ROSA MOSQUETA  	10	10	10	10	4	$ 9.500
VARIOS	ADAPTADOR PARA HUMI   	20	20	20	20	5	$ 9.500
VARIOS	APAGA VELAS    	10	10	10	10	5	$ 4.900
VARIOS	FILTRO HUMIDIFICADOR    	30	30	30	30	10	$ 2.900
`.trim();

// Función para generar código de barras EAN-13 válido
function generarCodigoBarrasEAN13(secuencia) {
  const paisArg = '779'; // Argentina
  const empresa = '2025'; // Código empresa 2025
  const producto = secuencia.toString().padStart(5, '0');
  
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

// Función para procesar línea de datos
function procesarLineaProducto(linea, indice) {
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
  const stockMinimo = parseInt(partes[6]) || 0;
  const precioStr = partes[7].replace('$', '').replace('.', '').trim();
  const precio = parseFloat(precioStr) || 0;
  
  return {
    categoria,
    nombre,
    precio,
    stockMinimo,
    stockMaximoPorSucursal: {
      'Shopping Patagonia': shoppingPatagonia,
      'Alto Comahue': altoCamahue,
      'Mendoza Shopping': mendozaShopping,
      'Palmares': palmares
    }
  };
}

// Función para obtener ID de usuario admin
async function obtenerUsuarioAdmin() {
  const adminUser = await prisma.user.findFirst({
    where: {
      roleId: 'role-admin'
    }
  });
  
  if (!adminUser) {
    throw new Error('No se encontró usuario admin');
  }
  
  return adminUser.id;
}

// Función principal
async function cargarProductosReales() {
  console.log('🚀 === CARGA COMPLETA DE PRODUCTOS REALES 2025 ===\n');
  
  try {
    const adminUserId = await obtenerUsuarioAdmin();
    console.log(`✅ Usuario admin encontrado: ${adminUserId}`);
    
    // 1. Procesar datos de la planilla
    console.log('📋 Procesando datos de la planilla...');
    const lineas = productosData.split('\n').filter(l => l.trim());
    const productosProcessed = [];
    
    for (let i = 0; i < lineas.length; i++) {
      const producto = procesarLineaProducto(lineas[i], i);
      if (producto) {
        productosProcessed.push(producto);
      }
    }
    
    console.log(`   ✅ ${productosProcessed.length} productos procesados`);
    
    // 2. Obtener categorías existentes
    console.log('\n📂 Obteniendo categorías existentes...');
    const categorias = await prisma.categoria.findMany();
    const categoriaMap = new Map();
    
    categorias.forEach(cat => {
      categoriaMap.set(cat.nombre, cat.id);
    });
    
    console.log(`   ✅ ${categorias.length} categorías encontradas`);
    
    // 3. Obtener sucursales existentes
    console.log('\n🏢 Obteniendo sucursales existentes...');
    const sucursales = await prisma.ubicacion.findMany({
      where: { tipo: 'sucursal' }
    });
    const sucursalMap = new Map();
    
    sucursales.forEach(suc => {
      sucursalMap.set(suc.nombre, suc.id);
    });
    
    console.log(`   ✅ ${sucursales.length} sucursales encontradas:`, 
      Array.from(sucursalMap.keys()).join(', '));
    
    // 4. Verificar dependencias antes de limpiar
    console.log('\n🔍 Verificando dependencias de productos...');
    const ventasCount = await prisma.itemVenta.count();
    const stockCount = await prisma.stock.count({ where: { productoId: { not: null } } });
    const configsCount = await prisma.stockConfigSucursal.count();
    
    console.log(`   📊 Ventas: ${ventasCount}, Stock: ${stockCount}, Configs: ${configsCount}`);
    
    if (ventasCount > 0 || stockCount > 0) {
      console.log('\n⚠️ ADVERTENCIA: Hay datos existentes que se eliminarán');
      console.log('   Si deseas conservar las ventas, cancela ahora (Ctrl+C)');
      
      // Esperar confirmación (simulada)
      console.log('   Continuando en 3 segundos...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // 5. Limpiar datos existentes
    console.log('\n🧹 Limpiando productos existentes...');
    
    await prisma.$transaction(async (tx) => {
      // Eliminar configuraciones de stock
      await tx.stockConfigSucursal.deleteMany({});
      console.log('   ✅ Configuraciones de stock eliminadas');
      
      // Eliminar movimientos de stock de productos
      const stockIds = await tx.stock.findMany({
        where: { productoId: { not: null } },
        select: { id: true }
      });
      
      if (stockIds.length > 0) {
        await tx.movimientoStock.deleteMany({
          where: { stockId: { in: stockIds.map(s => s.id) } }
        });
        console.log('   ✅ Movimientos de stock eliminados');
      }
      
      // Eliminar stock de productos
      await tx.stock.deleteMany({
        where: { productoId: { not: null } }
      });
      console.log('   ✅ Stock de productos eliminado');
      
      // Eliminar recetas de productos
      await tx.productoReceta.deleteMany({});
      console.log('   ✅ Recetas de productos eliminadas');
      
      // Eliminar productos
      const productosEliminados = await tx.producto.deleteMany({});
      console.log(`   ✅ ${productosEliminados.count} productos eliminados`);
    });
    
    // 6. Crear nuevos productos
    console.log('\n📦 Creando productos nuevos...');
    
    let creados = 0;
    let errores = 0;
    const productosCreados = [];
    
    for (let i = 0; i < productosProcessed.length; i++) {
      const item = productosProcessed[i];
      
      try {
        // Obtener categoría
        const categoriaNombre = categoriasMapping[item.categoria] || item.categoria;
        const categoriaId = categoriaMap.get(categoriaNombre);
        
        if (!categoriaId) {
          throw new Error(`Categoría "${categoriaNombre}" no encontrada`);
        }
        
        // Generar código de barras único
        const codigoBarras = generarCodigoBarrasEAN13(i + 1);
        
        // Crear producto
        const producto = await prisma.producto.create({
          data: {
            nombre: item.nombre,
            descripcion: `${item.categoria} - Código: ${i + 1}`,
            precio: item.precio,
            codigoBarras: codigoBarras,
            categoriaId: categoriaId,
            stockMinimo: item.stockMinimo,
            activo: true
          }
        });
        
        productosCreados.push({
          ...producto,
          stockMaximoPorSucursal: item.stockMaximoPorSucursal
        });
        
        creados++;
        
        if (creados % 50 === 0) {
          console.log(`   📦 ${creados} productos creados...`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error con "${item.nombre}": ${error.message}`);
        errores++;
      }
    }
    
    console.log(`   ✅ ${creados} productos creados, ${errores} errores`);
    
    // 7. Configurar stock por sucursal
    console.log('\n⚙️ Configurando stock por sucursal...');
    
    let configsCreadas = 0;
    
    for (const producto of productosCreados) {
      for (const [nombreSucursal, stockMaximo] of Object.entries(producto.stockMaximoPorSucursal)) {
        const sucursalId = sucursalMap.get(nombreSucursal);
        
        if (!sucursalId) {
          console.warn(`   ⚠️ Sucursal "${nombreSucursal}" no encontrada`);
          continue;
        }
        
        if (stockMaximo === 0) {
          continue; // No crear config para stock 0
        }
        
        try {
          await prisma.stockConfigSucursal.create({
            data: {
              productoId: producto.id,
              sucursalId: sucursalId,
              stockMaximo: stockMaximo,
              stockMinimo: producto.stockMinimo,
              puntoReposicion: Math.ceil(stockMaximo * 0.3), // 30% como punto de reposición
              creadoPor: adminUserId,
              activo: true
            }
          });
          
          configsCreadas++;
          
        } catch (error) {
          console.error(`   ❌ Error config ${producto.nombre} - ${nombreSucursal}: ${error.message}`);
        }
      }
    }
    
    console.log(`   ✅ ${configsCreadas} configuraciones de stock creadas`);
    
    // 8. Mostrar resumen final
    console.log('\n📊 === RESUMEN FINAL ===');
    console.log(`✅ Productos creados: ${creados}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`⚙️ Configuraciones de stock: ${configsCreadas}`);
    console.log(`📂 Categorías utilizadas: ${new Set(productosProcessed.map(p => p.categoria)).size}`);
    
    // 9. Verificación de algunos productos
    console.log('\n🔍 Muestra de productos creados:');
    const muestra = await prisma.producto.findMany({
      take: 5,
      include: { 
        categoria: true,
        stockConfigs: {
          include: { sucursal: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    muestra.forEach(producto => {
      console.log(`   📦 ${producto.nombre} - ${producto.categoria.nombre} - $${producto.precio}`);
      console.log(`      Código: ${producto.codigoBarras}`);
      console.log(`      Configs: ${producto.stockConfigs.length} sucursales`);
    });
    
    console.log('\n🎉 === CARGA COMPLETADA EXITOSAMENTE ===');
    
    return {
      productosCreados: creados,
      errores,
      configuracionesStock: configsCreadas
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
  cargarProductosReales()
    .then((resultado) => {
      console.log(`\n🏁 Proceso completado: ${resultado.productosCreados} productos cargados`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error fatal:', error.message);
      process.exit(1);
    });
}

module.exports = { cargarProductosReales };