// scripts/insertar/recargar-productos-faltantes.js
const { PrismaClient } = require('@prisma/client');
const { capitalizarTexto } = require('./insertar-productos-finales');
const prisma = new PrismaClient();

// Misma configuración de categorías
const categoriasConfig = {
  'ACEITES': {
    nombre: 'Aceites Corporales',
    imagen: '/images/categorias/aceites.webp',
    prefijo: 'Aceite'
  },
  'AGUAS DE AZAHAR': {
    nombre: 'Aguas Aromáticas',
    imagen: '/images/categorias/aguas.webp',
    prefijo: 'Agua'
  },
  'BOMBAS ESFERVESCENTES': {
    nombre: 'Bombas de Baño',
    imagen: '/images/categorias/bombas-baño.webp',
    prefijo: 'Bomba'
  },
  'DIFUSORES DE AUTO': {
    nombre: 'Difusores para Auto',
    imagen: '/images/categorias/difusores-auto.webp',
    prefijo: 'Difusor Auto'
  },
  'DIFUSORES DE HOGAR': {
    nombre: 'Difusores de Hogar',
    imagen: '/images/categorias/difusores.webp',
    prefijo: 'Difusor'
  },
  'ESENCIAS DE HORNILLO': {
    nombre: 'Esencias para Hornillo',
    imagen: '/images/categorias/esencia-humi.webp',
    prefijo: 'Esencia Hornillo'
  },
  'ESENCIAS HUMIDIFICADORES': {
    nombre: 'Esencias para Humidificador',
    imagen: '/images/categorias/esencia-humi.webp',
    prefijo: 'Esencia Humidificador'
  },
  'ESPUMAS DE BAÑO': {
    nombre: 'Espumas de Baño',
    imagen: '/images/categorias/espuma-baño.webp',
    prefijo: 'Espuma de Baño'
  },
  'FRAGANCIAS TEXTILES': {
    nombre: 'Fragancias Textiles',
    imagen: '/images/categorias/fragancia.webp',
    prefijo: 'Fragancia Textil'
  },
  'HOME SPRAY': {
    nombre: 'Home Sprays',
    imagen: '/images/categorias/home-spray.webp',
    prefijo: 'Home Spray'
  },
  'HUMIDIFICADOR CON FILTRO': {
    nombre: 'Humidificadores con Filtro',
    imagen: '/images/categorias/humidificadores.jpg',
    prefijo: 'Humidificador'
  },
  'HUMIDIFICADORES GRANDES': {
    nombre: 'Humidificadores Grandes',
    imagen: '/images/categorias/humidificadores-grandes.jpg',
    prefijo: 'Humidificador'
  },
  'HUMIDIFICADORES MEDIANOS': {
    nombre: 'Humidificadores Medianos',
    imagen: '/images/categorias/humidificadores-medianos.jpg',
    prefijo: 'Humidificador'
  },
  'JABONES LIQUIDOS Y SOLIDOS': {
    nombre: 'Jabones',
    imagen: '/images/categorias/jabones.jpg',
    prefijo: 'Jabón'
  },
  'SALES DE BAÑO': {
    nombre: 'Sales de Baño',
    imagen: '/images/categorias/sales.webp',
    prefijo: 'Sales de Baño'
  },
  'VARIOS': {
    nombre: 'Accesorios',
    imagen: '/images/categorias/accesorios.jpg',
    prefijo: 'Accesorio'
  },
  'VELAS DE SOJA': {
    nombre: 'Velas de Soja',
    imagen: '/images/categorias/velas.jpg',
    prefijo: 'Vela'
  }
};

// Función para procesar nombres y extraer aroma + formato
function procesarNombreProducto(nombreOriginal, categoria) {
  const config = categoriasConfig[categoria];
  if (!config) return null;

  let aroma = '';
  let formato = config.prefijo;
  
  // Limpiar el nombre original
  let nombreLimpio = nombreOriginal
    .replace(/^(ACEITE DE|AGUA DE|BOMBA ESF\.|ES\. HORNI\.|ES\.HUMI\.|ESP\. DE BAÑO|F\. TEXTIL|HOME SPRAY|HUMIDIF\.|JABON LIQUIDO|JABON SOLIDO|SAL DE BAÑO|VELA DE SOJA|DIFUSOR|REC\. DIFU\. AUTO|REC\.DIFU\. AUTO)/i, '')
    .trim();

  // Casos especiales por categoría (mismo código que antes)
  switch (categoria) {
    case 'ACEITES':
      aroma = nombreLimpio.replace(/^DE\s+/, '');
      formato = 'Aceite Corporal';
      break;
      
    case 'AGUAS DE AZAHAR':
      aroma = nombreLimpio.replace(/^DE\s+/, '');
      formato = 'Agua Aromática';
      break;
      
    case 'BOMBAS ESFERVESCENTES':
      aroma = nombreLimpio;
      formato = 'Bomba de Baño';
      break;
      
    case 'DIFUSORES DE AUTO':
      if (nombreOriginal.includes('REC.')) {
        aroma = nombreLimpio;
        formato = 'Recambio Difusor Auto';
      } else {
        aroma = 'Auto Nuevo';
        formato = 'Difusor Auto';
      }
      break;
      
    case 'DIFUSORES DE HOGAR':
      aroma = nombreLimpio;
      formato = 'Difusor';
      break;
      
    case 'ESENCIAS DE HORNILLO':
      aroma = nombreLimpio;
      formato = 'Esencia Hornillo';
      break;
      
    case 'ESENCIAS HUMIDIFICADORES':
      aroma = nombreLimpio;
      formato = 'Esencia Humidificador';
      break;
      
    case 'ESPUMAS DE BAÑO':
      aroma = nombreLimpio;
      formato = 'Espuma de Baño';
      break;
      
    case 'FRAGANCIAS TEXTILES':
      aroma = nombreLimpio;
      formato = 'Fragancia Textil';
      break;
      
    case 'HOME SPRAY':
      aroma = nombreLimpio;
      formato = 'Home Spray';
      break;
      
    case 'SALES DE BAÑO':
      aroma = nombreLimpio;
      formato = 'Sales de Baño';
      break;
      
    case 'JABONES LIQUIDOS Y SOLIDOS':
      aroma = nombreLimpio;
      formato = nombreOriginal.includes('LIQUIDO') ? 'Jabón Líquido' : 'Jabón Sólido';
      break;
      
    case 'VELAS DE SOJA':
      aroma = '';
      formato = nombreLimpio.replace(/^DE SOJA\s+/, '');
      break;
      
    case 'HUMIDIFICADOR CON FILTRO':
    case 'HUMIDIFICADORES GRANDES':
    case 'HUMIDIFICADORES MEDIANOS':
      aroma = '';
      formato = nombreLimpio;
      break;
      
    case 'VARIOS':
      aroma = '';
      formato = nombreLimpio;
      break;
      
    default:
      aroma = nombreLimpio;
      formato = config.prefijo;
  }

  const nombreFinal = aroma ? 
    `${capitalizarTexto(aroma)} ${formato}` : 
    capitalizarTexto(formato);

  return {
    nombre: nombreFinal,
    nombreOriginal: nombreOriginal,
    aroma: aroma ? capitalizarTexto(aroma) : null,
    formato: formato,
    categoria: config.nombre,
    imagen: config.imagen
  };
}

// Función para generar código de barras EAN-13
function generarCodigoBarras(codigo) {
  const paisArg = '779';
  const empresa = '2024';
  const producto = codigo.toString().padStart(4, '0');
  const base = paisArg + empresa + producto;
  
  let suma = 0;
  for (let i = 0; i < 12; i++) {
    const digito = parseInt(base[i]);
    suma += (i % 2 === 0) ? digito : digito * 3;
  }
  
  const digitoVerificador = (10 - (suma % 10)) % 10;
  return base + digitoVerificador;
}

// Función para procesar los datos (copia de insertar-productos-finales.js)
function procesarProductosDefinitivos() {
  const productosRaw = `ACEITES	ACEITES
ACEITE DE ALMENDRAS   	ACEITES
ACEITE DE COCO   	ACEITES
ACEITE DE ROSA MOSQUETA  	ACEITES
ACEITE DE RICINO   	ACEITES
AGUAS DE AZAHAR   	AGUAS DE AZAHAR   
AGUA DE AZAHAR   	AGUAS DE AZAHAR   
AGUA DE ROSAS   	AGUAS DE AZAHAR   
BOMBAS ESFERVESCENTES	BOMBAS ESFERVESCENTES
BOMBA ESF. ALMENDRA   	BOMBAS ESFERVESCENTES
BOMBA ESF. CHICLE   	BOMBAS ESFERVESCENTES
BOMBA ESF. COCO VAINILLA  	BOMBAS ESFERVESCENTES
BOMBA ESF. FLORAL   	BOMBAS ESFERVESCENTES
BOMBA ESF. FRUTOS ROJOS  	BOMBAS ESFERVESCENTES
BOMBA ESF. JAZMIN   	BOMBAS ESFERVESCENTES
BOMBA ESF. LAVANDA   	BOMBAS ESFERVESCENTES
BOMBA ESF. ROSA MOSQUETA  	BOMBAS ESFERVESCENTES
DIFUSORES DE AUTO	DIFUSORES DE AUTO
DIFUSOR DE AUTO   	DIFUSORES DE AUTO
REC. DIFU. AUTO AUTO NUEVO 	DIFUSORES DE AUTO
REC. DIFU. AUTO BAMBU  	DIFUSORES DE AUTO
REC. DIFU. AUTO FLORES BLANCAS 	DIFUSORES DE AUTO
REC. DIFU. AUTO FRUTOS ROJOS 	DIFUSORES DE AUTO
REC. DIFU. AUTO LEMON GRASS 	DIFUSORES DE AUTO
REC. DIFU. AUTO LIMON Y JENGIBRE	DIFUSORES DE AUTO
REC. DIFU. AUTO MANGO  	DIFUSORES DE AUTO
REC. DIFU. AUTO NARANJA Y CANELA	DIFUSORES DE AUTO
REC. DIFU. AUTO NARANJA Y JENGIBRE	DIFUSORES DE AUTO
REC. DIFU. AUTO NARANJA Y PIMIENTA	DIFUSORES DE AUTO
REC. DIFU. AUTO PERAS Y FLORES	DIFUSORES DE AUTO
REC. DIFU. AUTO ROSAS  	DIFUSORES DE AUTO
REC. DIFU. AUTO SANDALO  	DIFUSORES DE AUTO
REC. DIFU. AUTO TE VERDE 	DIFUSORES DE AUTO
REC. DIFU. AUTO VAINICOCO  	DIFUSORES DE AUTO
REC. DIFU. AUTO VAINILLA  	DIFUSORES DE AUTO
REC.DIFU. AUTO LAVANDA   	DIFUSORES DE AUTO
DIFUSORES DE HOGAR	DIFUSORES DE HOGAR
DIFUSOR ALMENDRAS    	DIFUSORES DE HOGAR
DIFUSOR BAMBU    	DIFUSORES DE HOGAR
DIFUSOR BERGAMOTA    	DIFUSORES DE HOGAR
DIFUSOR CALOR DE HOGAR  	DIFUSORES DE HOGAR
DIFUSOR CITRONELLA    	DIFUSORES DE HOGAR
DIFUSOR FLORES BLANCAS   	DIFUSORES DE HOGAR
DIFUSOR FRUTOS ROJOS   	DIFUSORES DE HOGAR
DIFUSOR GARDENIA    	DIFUSORES DE HOGAR
DIFUSOR JAZMIN    	DIFUSORES DE HOGAR
DIFUSOR LAVANDA Y ROMERO  	DIFUSORES DE HOGAR
DIFUSOR LEMONGRASS    	DIFUSORES DE HOGAR
DIFUSOR LIMON Y JENGIBRE  	DIFUSORES DE HOGAR
DIFUSOR MADERAS DEL ORIENTE  	DIFUSORES DE HOGAR
DIFUSOR MANGO    	DIFUSORES DE HOGAR
DIFUSOR MANGO Y MARACUYA  	DIFUSORES DE HOGAR
DIFUSOR NAGCHAMPA    	DIFUSORES DE HOGAR
DIFUSOR NARANJA CANELA   	DIFUSORES DE HOGAR
DIFUSOR NARANJA Y JENGIBRE  	DIFUSORES DE HOGAR
DIFUSOR NARANJA Y PIMIENTA  	DIFUSORES DE HOGAR
DIFUSOR ORANGE    	DIFUSORES DE HOGAR
DIFUSOR PALO SANTO   	DIFUSORES DE HOGAR
DIFUSOR PERAS Y FLORES  	DIFUSORES DE HOGAR
DIFUSOR ROSAS    	DIFUSORES DE HOGAR
DIFUSOR SAI BABA   	DIFUSORES DE HOGAR
DIFUSOR SANDALO    	DIFUSORES DE HOGAR
DIFUSOR TE VERDE   	DIFUSORES DE HOGAR
DIFUSOR TILO    	DIFUSORES DE HOGAR
DIFUSOR VAINICOCO    	DIFUSORES DE HOGAR
DIFUSOR VAINILLA    	DIFUSORES DE HOGAR
DIFUSOR VERBENA    	DIFUSORES DE HOGAR
DIFUSOR WANAMA    	DIFUSORES DE HOGAR
ESENCIAS DE HORNILLO	ESENCIAS DE HORNILLO
ES. HORNI. BEBE   	ESENCIAS DE HORNILLO
ES. HORNI. BERGAMOTA   	ESENCIAS DE HORNILLO
ES. HORNI. CEREZA   	ESENCIAS DE HORNILLO
ES. HORNI. CHERRY   	ESENCIAS DE HORNILLO
ES. HORNI. CITRONELLA   	ESENCIAS DE HORNILLO
ES. HORNI. COCO   	ESENCIAS DE HORNILLO
ES. HORNI. EUCALIPTO   	ESENCIAS DE HORNILLO
ES. HORNI. FLORAL   	ESENCIAS DE HORNILLO
ES. HORNI. FLORES BLANCAS  	ESENCIAS DE HORNILLO
ES. HORNI. FRESIAS   	ESENCIAS DE HORNILLO
ES. HORNI. INCIENSO   	ESENCIAS DE HORNILLO
ES. HORNI. LAVANDA   	ESENCIAS DE HORNILLO
ES. HORNI. LEMON GRASS  	ESENCIAS DE HORNILLO
ES. HORNI. MADERAS DE ORIENTE 	ESENCIAS DE HORNILLO
ES. HORNI. MANZANA   	ESENCIAS DE HORNILLO
ES. HORNI. MELON   	ESENCIAS DE HORNILLO
ES. HORNI. MIEL   	ESENCIAS DE HORNILLO
ES. HORNI. MIRRA   	ESENCIAS DE HORNILLO
ES. HORNI. NAG CHAMPA  	ESENCIAS DE HORNILLO
ES. HORNI. NARANJA CANELA  	ESENCIAS DE HORNILLO
ES. HORNI. NARANJA JENGIBRE  	ESENCIAS DE HORNILLO
ES. HORNI. NARDO   	ESENCIAS DE HORNILLO
ES. HORNI. PATCHULI   	ESENCIAS DE HORNILLO
ES. HORNI. ROMERO   	ESENCIAS DE HORNILLO
ES. HORNI. ROSAS   	ESENCIAS DE HORNILLO
ES. HORNI. SANDALO   	ESENCIAS DE HORNILLO
ES. HORNI. SANDALO HINDU  	ESENCIAS DE HORNILLO
ES. HORNI. TE VERDE  	ESENCIAS DE HORNILLO
ES. HORNI. TILO   	ESENCIAS DE HORNILLO
ES. HORNI. VAINICOCO   	ESENCIAS DE HORNILLO
ES. HORNI. VAINILLA   	ESENCIAS DE HORNILLO
ES. HORNI. VERBENA   	ESENCIAS DE HORNILLO
ESENCIAS HUMIDIFICADORES	ESENCIAS HUMIDIFICADORES
ES.HUMI.AKITA     	ESENCIAS HUMIDIFICADORES
ES.HUMI.AMSTERDAM     	ESENCIAS HUMIDIFICADORES
ES.HUMI.APHRODITA     	ESENCIAS HUMIDIFICADORES
ES.HUMI.BELICE     	ESENCIAS HUMIDIFICADORES
ES.HUMI.BERGAMOTA     	ESENCIAS HUMIDIFICADORES
ES.HUMI.CALIFORNIA     	ESENCIAS HUMIDIFICADORES
ES.HUMI.CANCUN     	ESENCIAS HUMIDIFICADORES
ES.HUMI.CARIBEAN     	ESENCIAS HUMIDIFICADORES
ES.HUMI.CHANDAL     	ESENCIAS HUMIDIFICADORES
ES.HUMI.CHICLE     	ESENCIAS HUMIDIFICADORES
ES.HUMI.DELICATEZA     	ESENCIAS HUMIDIFICADORES
ES.HUMI.EUCALIPTO     	ESENCIAS HUMIDIFICADORES
ES.HUMI.GINGER     	ESENCIAS HUMIDIFICADORES
ES.HUMI.GREEN TEA    	ESENCIAS HUMIDIFICADORES
ES.HUMI.GROSEILLE     	ESENCIAS HUMIDIFICADORES
ES.HUMI.KANNAUJ     	ESENCIAS HUMIDIFICADORES
ES.HUMI.LAVANDA     	ESENCIAS HUMIDIFICADORES
ES.HUMI.LEMON     	ESENCIAS HUMIDIFICADORES
ES.HUMI.LOTUS FRESH    	ESENCIAS HUMIDIFICADORES
ES.HUMI.MADRE SELVA    	ESENCIAS HUMIDIFICADORES
ES.HUMI.MALASIA     	ESENCIAS HUMIDIFICADORES
ES.HUMI.MANGO Y MARACUYA   	ESENCIAS HUMIDIFICADORES
ES.HUMI.MONASTRELL     	ESENCIAS HUMIDIFICADORES
ES.HUMI.NARANJA Y PIMIENTA   	ESENCIAS HUMIDIFICADORES
ES.HUMI.OCEAN     	ESENCIAS HUMIDIFICADORES
ES.HUMI.ORANGE     	ESENCIAS HUMIDIFICADORES
ES.HUMI.ORQUIDEA NEGRA    	ESENCIAS HUMIDIFICADORES
ES.HUMI.PARADISE     	ESENCIAS HUMIDIFICADORES
ES.HUMI.PITANGA     	ESENCIAS HUMIDIFICADORES
ES.HUMI.POMELO BLUEBERRY    	ESENCIAS HUMIDIFICADORES
ES.HUMI.ROMANTIC WISH    	ESENCIAS HUMIDIFICADORES
ES.HUMI.SAI BABA    	ESENCIAS HUMIDIFICADORES
ES.HUMI.TAHITI     	ESENCIAS HUMIDIFICADORES
ES.HUMI.TE VERDE Y JENGIBRE  	ESENCIAS HUMIDIFICADORES
ES.HUMI.ULTRA VIOLET    	ESENCIAS HUMIDIFICADORES
ES.HUMI.UVA Y FRUTOS ROJOS  	ESENCIAS HUMIDIFICADORES
ES.HUMI.VAINILLA CARAMELO    	ESENCIAS HUMIDIFICADORES
ES.HUMI.VAINILLA CEDRO    	ESENCIAS HUMIDIFICADORES
ES.HUMI.VAINILLA COCO    	ESENCIAS HUMIDIFICADORES
ESPUMAS DE BAÑO	ESENCIAS HUMIDIFICADORES
ESP. DE BAÑO ALMENDRAS  	ESENCIAS HUMIDIFICADORES
ESP. DE BAÑO EUCALIPTO  	ESENCIAS HUMIDIFICADORES
ESP. DE BAÑO FLORAL  	ESENCIAS HUMIDIFICADORES
ESP. DE BAÑO FRUTAL  	ESENCIAS HUMIDIFICADORES
ESP. DE BAÑO FRUTOS ROJOS 	ESENCIAS HUMIDIFICADORES
ESP. DE BAÑO LAVANDA  	ESENCIAS HUMIDIFICADORES
ESP. DE BAÑO ROSA MOSQUETA 	ESENCIAS HUMIDIFICADORES
ESP. DE BAÑO ROSAS  	ESENCIAS HUMIDIFICADORES
ESP. DE BAÑO TILO  	ESENCIAS HUMIDIFICADORES
ESP. DE BAÑO VAINICOCO  	ESENCIAS HUMIDIFICADORES
FRAGANCIAS TEXTILES	FRAGANCIAS TEXTILES
F. TEXTIL AKIA   	FRAGANCIAS TEXTILES
F. TEXTIL CHER   	FRAGANCIAS TEXTILES
F. TEXTIL CONI   	FRAGANCIAS TEXTILES
F. TEXTIL CROMBIE   	FRAGANCIAS TEXTILES
F. TEXTIL FRESH   	FRAGANCIAS TEXTILES
F. TEXTIL KOSIUK   	FRAGANCIAS TEXTILES
F. TEXTIL MILLON   	FRAGANCIAS TEXTILES
F. TEXTIL TOMY   	FRAGANCIAS TEXTILES
F. TEXTIL WANA   	FRAGANCIAS TEXTILES
F. TEXTIL YAPA   	FRAGANCIAS TEXTILES
HOME SPRAY	HOME SPRAY
HOME SPRAY CALM   	HOME SPRAY
HOME SPRAY CARIBEAN   	HOME SPRAY
HOME SPRAY DREAMS   	HOME SPRAY
HOME SPRAY FLOWERS   	HOME SPRAY
HOME SPRAY GLAMOUR   	HOME SPRAY
HOME SPRAY HARMONY   	HOME SPRAY
HOME SPRAY INTENSE   	HOME SPRAY
HOME SPRAY LIVE   	HOME SPRAY
HOME SPRAY LOVE   	HOME SPRAY
HOME SPRAY PEACE   	HOME SPRAY
HOME SPRAY PURO   	HOME SPRAY
HOME SPRAY QUINTANA ROO  	HOME SPRAY
HOME SPRAY RELAX   	HOME SPRAY
HOME SPRAY SER   	HOME SPRAY
HOME SPRAY SWEET   	HOME SPRAY
HUMIDIFICADOR CON FILTRO	HUMIDIFICADOR CON FILTRO
HUMIDIF. BASICO    	HUMIDIFICADOR CON FILTRO
HUMIDIF. FLORERO CHICO CON FILTRO 	HUMIDIFICADOR CON FILTRO
HUMIDIF. FLORERO CON FILTRO  	HUMIDIFICADOR CON FILTRO
HUMIDIF. HUMIDIFIER    	HUMIDIFICADOR CON FILTRO
HUMIDIF. HUMIDIFIER PRO   	HUMIDIFICADOR CON FILTRO
HUMIDIF. REDONDO CON FILTRO  	HUMIDIFICADOR CON FILTRO
HUMIDIF. VELADOR LUNA   	HUMIDIFICADOR CON FILTRO
HUMIDIF. PLANETA    	HUMIDIFICADOR CON FILTRO
HUMIDIF. VOLCAN CON FILTRO  	HUMIDIFICADOR CON FILTRO
HUMIDIFICADORES GRANDES	HUMIDIFICADORES GRANDES
HUMIDIF. BASE MADERA PUNTA BLANCA GRANDE	HUMIDIFICADORES GRANDES
HUMIDIF. BASE MADERA REDONDO GRANDE 500	HUMIDIFICADORES GRANDES
HUMIDIF. BLANCO GRANDE PUNTA MEDIA 	HUMIDIFICADORES GRANDES
HUMIDIF. CON BLUETOOTH   	HUMIDIFICADORES GRANDES
HUMIDIF. FLORERO GRANDE 500ML BLANCO 	HUMIDIFICADORES GRANDES
HUMIDIF. FLORERO GRANDE 500ML MADERA 	HUMIDIFICADORES GRANDES
HUMIDIF. FLORERO GRANDE 500ML OSCURO 	HUMIDIFICADORES GRANDES
HUMIDIF. FLORISTA MADERA CLARA  	HUMIDIFICADORES GRANDES
HUMIDIF. FLORISTA MADERA OSCURA  	HUMIDIFICADORES GRANDES
HUMIDIF. FOGATA GRANDE   	HUMIDIFICADORES GRANDES
HUMIDIF. FUEGO    	HUMIDIFICADORES GRANDES
HUMIDIF. GRANDE LAUREL CLARO  	HUMIDIFICADORES GRANDES
HUMIDIF. GRANDE LAUREL OSCURO  	HUMIDIFICADORES GRANDES
HUMIDIF. MADERA BLANCA PUNTA BLANCA 500	HUMIDIFICADORES GRANDES
HUMIDIF. MADERA GRANDE PUNTA MEDIA 	HUMIDIFICADORES GRANDES
HUMIDIF. MADERA OSCURA PUNTA BLANCA 	HUMIDIFICADORES GRANDES
HUMIDIF. NOTAS MUSICALES CLARO  	HUMIDIFICADORES GRANDES
HUMIDIF. NOTAS MUSICALES OSCURO  	HUMIDIFICADORES GRANDES
HUMIDIF. OSCURO GRANDE PUNTA MEDIA 	HUMIDIFICADORES GRANDES
HUMIDIF. PICO LARGO   	HUMIDIFICADORES GRANDES
HUMIDIF. REDONDO CALADO   	HUMIDIFICADORES GRANDES
HUMIDIF. REDONDO SIN BLUETHOO  	HUMIDIFICADORES GRANDES
HUMIDIF. REJAS GRANDE CLARO  	HUMIDIFICADORES GRANDES
HUMIDIF. REJAS GRANDE OSCURO  	HUMIDIFICADORES GRANDES
HUMIDIF. SIMIL MADERA GRANDE  	HUMIDIFICADORES GRANDES
HUMIDIF. RELOJ/ALARMA    	HUMIDIFICADORES GRANDES
HUMIDIF. VOLCAN    	HUMIDIFICADORES GRANDES
HUMIDIF. y LAMPARA DE SAL 	HUMIDIFICADORES GRANDES
HUMIDIFICADORES MEDIANOS	HUMIDIFICADORES MEDIANOS
HUMIDIF. 125ML    	HUMIDIFICADORES MEDIANOS
HUMIDIF. 300ML PRO   	HUMIDIFICADORES MEDIANOS
HUMIDIF. AJO BASE MADERA  	HUMIDIFICADORES MEDIANOS
HUMIDIF. ALARGADO TIPO FLORERO  	HUMIDIFICADORES MEDIANOS
HUMIDIF. AROMA DIFUSER   	HUMIDIFICADORES MEDIANOS
HUMIDIF. BASE MADERA BLANCO 300ML 	HUMIDIFICADORES MEDIANOS
HUMIDIF. FLORERO SIN FILTRO  	HUMIDIFICADORES MEDIANOS
HUMIDIF. FLORERO USB grande  	HUMIDIFICADORES MEDIANOS
HUMIDIF. GOTA GRANDE   	HUMIDIFICADORES MEDIANOS
HUMIDIF. GOTA PEQUEA   	HUMIDIFICADORES MEDIANOS
HUMIDIF. HUEVITO BASE MADERA  	HUMIDIFICADORES MEDIANOS
HUMIDIF. HUEVO GRANDE   	HUMIDIFICADORES MEDIANOS
HUMIDIF. LLUVIA    	HUMIDIFICADORES MEDIANOS
HUMIDIF. MANCHADO    	HUMIDIFICADORES MEDIANOS
HUMIDIF. MINI FUEGO   	HUMIDIFICADORES MEDIANOS
HUMIDIF. MINION BLANCO   	HUMIDIFICADORES MEDIANOS
HUMIDIF. MOOD    	HUMIDIFICADORES MEDIANOS
HUMIDIF. PLATITO VOLADOR   	HUMIDIFICADORES MEDIANOS
HUMIDIF. QUIMICO    	HUMIDIFICADORES MEDIANOS
HUMIDIF. REDONDO CON ABERTURA 120ML 	HUMIDIFICADORES MEDIANOS
HUMIDIF. REDONDO SIN FILTRO  	HUMIDIFICADORES MEDIANOS
HUMIDIF. SR. HUEVO   	HUMIDIFICADORES MEDIANOS
HUMIDIF. TRANSPARENTE ARRIBA   	HUMIDIFICADORES MEDIANOS
HUMIDIF. GOTA LARGA   	HUMIDIFICADORES MEDIANOS
HUMIDIF. REJAS CHICO   	HUMIDIFICADORES MEDIANOS
HUMIDIF. REJAS MEDIANO   	HUMIDIFICADORES MEDIANOS
JABONES LIQUIDOS Y SOLIDOS	JABONES LIQUIDOS Y SOLIDOS
JABON LIQUIDO ALOE   	JABONES LIQUIDOS Y SOLIDOS
JABON LIQUIDO CANCUN   	JABONES LIQUIDOS Y SOLIDOS
JABON LIQUIDO CHANDAL   	JABONES LIQUIDOS Y SOLIDOS
JABON LIQUIDO HIBISCUS   	JABONES LIQUIDOS Y SOLIDOS
JABON LIQUIDO MANGO Y MARACUYA 	JABONES LIQUIDOS Y SOLIDOS
JABON LIQUIDO PARADISE   	JABONES LIQUIDOS Y SOLIDOS
JABON LIQUIDO VAINILLA COCO  	JABONES LIQUIDOS Y SOLIDOS
JABON SOLIDO AVENA Y COCO 	JABONES LIQUIDOS Y SOLIDOS
JABON SOLIDO CACAO   	JABONES LIQUIDOS Y SOLIDOS
JABON SOLIDO CALENDULA   	JABONES LIQUIDOS Y SOLIDOS
JABON SOLIDO CARBON ACTIVADO  	JABONES LIQUIDOS Y SOLIDOS
JABON SOLIDO LAVANDA   	JABONES LIQUIDOS Y SOLIDOS
JABON SOLIDO MALBEC   	JABONES LIQUIDOS Y SOLIDOS
JABON SOLIDO MANZANILLA   	JABONES LIQUIDOS Y SOLIDOS
JABON SOLIDO OLIVA   	JABONES LIQUIDOS Y SOLIDOS
JABON SOLIDO ROSA MOSQUETA  	JABONES LIQUIDOS Y SOLIDOS
JABON SOLIDO CAFE   	JABONES LIQUIDOS Y SOLIDOS
JABON SOLIDO CENTELLA ASIATICA  	JABONES LIQUIDOS Y SOLIDOS
SALES DE BAÑO	SALES DE BAÑO
SAL DE BAÑO COCO VAINILLA 	SALES DE BAÑO
SAL DE BAÑO EUCALIPTO  	SALES DE BAÑO
SAL DE BAÑO FRUTOS ROJOS 	SALES DE BAÑO
SAL DE BAÑO LAVANDA  	SALES DE BAÑO
SAL DE BAÑO MARINA  	SALES DE BAÑO
SAL DE BAÑO ROSAS  	SALES DE BAÑO
SAL DE BAÑO TILO  	SALES DE BAÑO
SAL DE BAÑO VAINILLA  	SALES DE BAÑO
VARIOS	VARIOS
ADAPTADOR PARA HUMI   	VARIOS
APAGA VELAS    	VARIOS
FILTRO HUMIDIFICADOR    	VARIOS
VELAS DE SOJA	VELAS DE SOJA
VELA DE SOJA BOMBE CON FRASE	VELAS DE SOJA
VELA DE SOJA CARAMELERA  	VELAS DE SOJA
VELA DE SOJA CATEDRAL GRANDE 	VELAS DE SOJA
VELA DE SOJA ECO CON TAPA	VELAS DE SOJA
VELA DE SOJA ECO SIN TAPA	VELAS DE SOJA
VELA DE SOJA GEOGLIFICA  	VELAS DE SOJA
VELA DE SOJA URSULA COLOR CON	VELAS DE SOJA
VELA DE SOJA URSULA SIN TAPA	VELAS DE SOJA
VELA DE SOJA URSULA VIDRIO CON	VELAS DE SOJA
VELA DE SOJA ACANALADA  	VELAS DE SOJA
VELA DE SOJA CERAMICA  	VELAS DE SOJA
VELA DE SOJA REDONDA GRANDE 	VELAS DE SOJA
VELA DE SOJA RELIEVE  	VELAS DE SOJA
VELA DE SOJA ROMBOS  	VELAS DE SOJA
VELA DE SOJA TRIANGULO GRANDE 	VELAS DE SOJA`;

  const lineas = productosRaw.split('\n').filter(linea => linea.trim());
  const productos = [];
  let codigoSecuencial = 1000;

  lineas.forEach(linea => {
    const partes = linea.split('\t').map(p => p.trim());
    if (partes.length >= 2) {
      const nombreOriginal = partes[0];
      const categoria = partes[1];
      
      if (nombreOriginal !== categoria) {
        const productoData = procesarNombreProducto(nombreOriginal, categoria);
        if (productoData) {
          productos.push({
            ...productoData,
            codigo: ++codigoSecuencial,
            categoriaOriginal: categoria
          });
        }
      }
    }
  });

  return productos;
}

// Función para obtener categorías existentes
async function obtenerCategorias() {
  const categorias = await prisma.categoria.findMany();
  const categoriaMap = new Map();
  
  categorias.forEach(categoria => {
    categoriaMap.set(categoria.nombre, categoria.id);
  });
  
  return categoriaMap;
}

// Función para identificar productos faltantes
async function identificarProductosFaltantes() {
  console.log('🔍 Identificando productos faltantes...\n');
  
  // Obtener productos esperados
  const productosEsperados = procesarProductosDefinitivos();
  console.log(`📋 Total productos esperados: ${productosEsperados.length}`);
  
  // Obtener productos existentes
  const productosExistentes = await prisma.producto.findMany({
    select: { nombre: true, codigoBarras: true }
  });
  console.log(`📦 Productos existentes en BD: ${productosExistentes.length}`);
  
  // Crear sets para comparación rápida
  const nombresExistentes = new Set(productosExistentes.map(p => p.nombre));
  const codigosExistentes = new Set(productosExistentes.map(p => p.codigoBarras).filter(Boolean));
  
  // Identificar faltantes
  const productosFaltantes = productosEsperados.filter(producto => {
    const codigoBarras = generarCodigoBarras(producto.codigo);
    return !nombresExistentes.has(producto.nombre) && !codigosExistentes.has(codigoBarras);
  });
  
  console.log(`❌ Productos faltantes: ${productosFaltantes.length}`);
  
  if (productosFaltantes.length > 0) {
    console.log('\n📝 Algunos productos faltantes:');
    productosFaltantes.slice(0, 10).forEach(p => {
      console.log(`   - ${p.nombre} (${p.categoria})`);
    });
    if (productosFaltantes.length > 10) {
      console.log(`   ... y ${productosFaltantes.length - 10} más`);
    }
  }
  
  return productosFaltantes;
}

// Función principal para recargar productos faltantes
async function recargarProductosFaltantes() {
  console.log('🔄 === RECARGA DE PRODUCTOS FALTANTES ===\n');
  
  try {
    // 1. Obtener categorías
    const categoriaMap = await obtenerCategorias();
    console.log(`📂 Categorías disponibles: ${categoriaMap.size}`);
    
    // 2. Identificar productos faltantes
    const productosFaltantes = await identificarProductosFaltantes();
    
    if (productosFaltantes.length === 0) {
      console.log('\n✅ No hay productos faltantes. Todos están cargados.');
      return { success: true, message: 'Todos los productos están cargados' };
    }
    
    console.log(`\n🚀 Insertando ${productosFaltantes.length} productos faltantes...\n`);
    
    let insertados = 0;
    let actualizados = 0;
    let errores = 0;
    const erroresDetalle = [];
    
    // 3. Procesar cada producto faltante con UPSERT
    for (const producto of productosFaltantes) {
      try {
        const categoriaId = categoriaMap.get(producto.categoria);
        
        if (!categoriaId) {
          throw new Error(`Categoría no encontrada: ${producto.categoria}`);
        }
        
        const codigoBarras = generarCodigoBarras(producto.codigo);
        
        // 🔧 USAR UPSERT para manejar duplicados
        const resultado = await prisma.producto.upsert({
          where: { codigoBarras: codigoBarras },
          update: {
            // Si existe, solo actualizar campos no críticos
            descripcion: `${producto.formato}${producto.aroma ? ` con aroma a ${producto.aroma}` : ''}`,
            activo: true
          },
          create: {
            // Si no existe, crear completo
            nombre: producto.nombre,
            descripcion: `${producto.formato}${producto.aroma ? ` con aroma a ${producto.aroma}` : ''}`,
            precio: 15000,
            codigoBarras: codigoBarras,
            imagen: producto.imagen,
            categoriaId: categoriaId,
            stockMinimo: 5,
            activo: true
          }
        });
        
        // Determinar si fue creado o actualizado comparando timestamps
        if (resultado.createdAt.getTime() === resultado.updatedAt.getTime()) {
          console.log(`   ✅ ${resultado.nombre} (creado)`);
          insertados++;
        } else {
          console.log(`   🔄 ${resultado.nombre} (actualizado)`);
          actualizados++;
        }
        
      } catch (error) {
        console.error(`   ❌ Error con ${producto.nombre}: ${error.message}`);
        errores++;
        erroresDetalle.push(`${producto.nombre}: ${error.message}`);
      }
    }
    
    // 4. Mostrar resumen
    console.log('\n📊 === RESUMEN DE RECARGA ===');
    console.log(`✅ Productos insertados: ${insertados}`);
    console.log(`🔄 Productos actualizados: ${actualizados}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📋 Total procesados: ${productosFaltantes.length}`);
    
    if (errores > 0) {
      console.log('\n❌ Errores detallados:');
      erroresDetalle.slice(0, 10).forEach(error => console.log(`   - ${error}`));
      if (erroresDetalle.length > 10) {
        console.log(`   ... y ${erroresDetalle.length - 10} errores más`);
      }
    }
    
    // 5. Verificación final
    const totalProductosFinales = await prisma.producto.count({ where: { activo: true } });
    console.log(`\n📦 Total productos activos finales: ${totalProductosFinales}`);
    
    return {
      success: true,
      insertados,
      actualizados,
      errores,
      totalFinal: totalProductosFinales
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
  recargarProductosFaltantes()
    .then((resultado) => {
      console.log('\n🎉 === RECARGA COMPLETADA ===');
      if (resultado.success) {
        console.log(`✅ ${resultado.insertados} productos insertados`);
        console.log(`🔄 ${resultado.actualizados} productos actualizados`);
        console.log(`📦 Total productos finales: ${resultado.totalFinal}`);
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 === ERROR EN LA RECARGA ===');
      console.error(error);
      process.exit(1);
    });
}

module.exports = { 
  recargarProductosFaltantes,
  identificarProductosFaltantes
};