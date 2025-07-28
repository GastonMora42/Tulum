// scripts/insertar/completar-productos-automatico.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const prisma = new PrismaClient();

// 🔧 CONFIGURACIÓN
const CONFIG = {
  // Prefijo para códigos de barras (EAN-13)
  codigoBarras: {
    pais: '779',        // Argentina
    empresa: '1000',    // Código empresa genérico
    inicioSecuencia: 1  // Número inicial para productos
  },
  
  // Configuración de descripciones automáticas
  descripcion: {
    incluirCategoria: true,
    incluirCaracteristicas: true,
    maxLength: 255
  },
  
  // Configuración del proceso
  procesamiento: {
    batchSize: 50,        // Procesar de a 50 productos
    pausaEntreBatch: 1000 // 1 segundo entre batches
  }
};

// 🏷️ PATRONES PARA GENERAR DESCRIPCIONES INTELIGENTES
const PATRONES_DESCRIPCION = {
  // Palabras clave para diferentes tipos de productos
  palabrasClave: {
    'difusor': ['aromaterapia', 'difusor', 'aceites esenciales', 'ambientador'],
    'humidificador': ['humidificador', 'vapor', 'ultrasónico', 'aromaterapia'],
    'esencia': ['esencia', 'aceite esencial', 'aromaterapia', 'fragancia'],
    'jabón': ['jabón', 'higiene personal', 'cuidado corporal'],
    'sal': ['sal', 'baño', 'relajante', 'terapéutico'],
    'bomba': ['bomba efervescente', 'baño', 'relajante'],
    'aceite': ['aceite', 'cosmético', 'cuidado personal'],
    'vela': ['vela', 'aromática', 'decoración'],
    'incienso': ['incienso', 'sahumerio', 'relajación']
  },
  
  // Frases descriptivas según categoría
  frasesPorCategoria: {
    'difusores': 'Difusor de aromas para ambientar espacios con aceites esenciales',
    'humidificadores': 'Humidificador ultrasónico con función de aromaterapia',
    'esencias': 'Esencia concentrada para difusores y humidificadores',
    'jabones': 'Jabón artesanal para higiene y cuidado personal',
    'sales': 'Sales de baño terapéuticas para relajación',
    'aceites': 'Aceite natural para cuidado corporal y aromaterapia',
    'velas': 'Vela aromática decorativa de cera natural',
    'incienso': 'Sahumerio natural para meditación y relajación'
  }
};

// 🔢 FUNCIÓN PARA GENERAR CÓDIGO DE BARRAS EAN-13
function generarCodigoBarrasEAN13(secuencia) {
  const { pais, empresa } = CONFIG.codigoBarras;
  const numeroProducto = secuencia.toString().padStart(5, '0');
  
  // Construir los primeros 12 dígitos
  const base = pais + empresa + numeroProducto;
  
  // Calcular dígito verificador
  let suma = 0;
  for (let i = 0; i < 12; i++) {
    const digito = parseInt(base[i]);
    // Posiciones impares (1,3,5...) se multiplican por 1, pares por 3
    suma += (i % 2 === 0) ? digito : digito * 3;
  }
  
  const digitoVerificador = (10 - (suma % 10)) % 10;
  
  return base + digitoVerificador;
}

// 🔍 FUNCIÓN PARA VERIFICAR UNICIDAD DEL CÓDIGO
async function verificarCodigoUnico(codigo) {
  const existente = await prisma.producto.findFirst({
    where: { codigoBarras: codigo }
  });
  return !existente;
}

// 🔢 FUNCIÓN PARA GENERAR CÓDIGO ÚNICO
async function generarCodigoUnico(secuenciaInicial) {
  let secuencia = secuenciaInicial;
  let intentos = 0;
  const maxIntentos = 10000; // Evitar bucle infinito
  
  while (intentos < maxIntentos) {
    const codigo = generarCodigoBarrasEAN13(secuencia);
    
    if (await verificarCodigoUnico(codigo)) {
      return { codigo, secuenciaUsada: secuencia };
    }
    
    secuencia++;
    intentos++;
  }
  
  throw new Error('No se pudo generar un código de barras único después de 10000 intentos');
}

// 📝 FUNCIÓN PARA GENERAR DESCRIPCIÓN AUTOMÁTICA
function generarDescripcionAutomatica(producto) {
  const { nombre, categoria } = producto;
  const nombreLower = nombre.toLowerCase();
  const categoriaNombre = categoria?.nombre?.toLowerCase() || '';
  
  console.log(`   📝 Generando descripción para: ${nombre} (${categoriaNombre})`);
  
  // 1. Buscar patrón específico en el nombre
  let descripcionBase = '';
  
  for (const [tipo, palabras] of Object.entries(PATRONES_DESCRIPCION.palabrasClave)) {
    if (nombreLower.includes(tipo) || palabras.some(palabra => nombreLower.includes(palabra))) {
      if (PATRONES_DESCRIPCION.frasesPorCategoria[tipo]) {
        descripcionBase = PATRONES_DESCRIPCION.frasesPorCategoria[tipo];
        break;
      }
    }
  }
  
  // 2. Si no encontramos patrón específico, usar categoría
  if (!descripcionBase && categoriaNombre) {
    for (const [categoria, frase] of Object.entries(PATRONES_DESCRIPCION.frasesPorCategoria)) {
      if (categoriaNombre.includes(categoria.slice(0, -1))) { // Quitar 's' final
        descripcionBase = frase;
        break;
      }
    }
  }
  
  // 3. Descripción genérica si no hay coincidencias
  if (!descripcionBase) {
    descripcionBase = `Producto de ${categoria?.nombre || 'aromaterapia'} para uso personal y del hogar`;
  }
  
  // 4. Agregar características específicas del nombre
  let caracteristicas = [];
  
  // Extraer características del nombre
  const palabrasNombre = nombre.split(/[\s\-_]+/).map(p => p.trim()).filter(p => p.length > 2);
  
  // Buscar aromas/fragancias
  const aromas = ['lavanda', 'eucalipto', 'rosa', 'limón', 'naranja', 'vainilla', 'coco', 'mango', 
                 'bergamota', 'sandalo', 'citronella', 'jazmin', 'manzanilla', 'romero', 'menta'];
  
  const aromasEncontrados = aromas.filter(aroma => 
    nombreLower.includes(aroma)
  );
  
  if (aromasEncontrados.length > 0) {
    caracteristicas.push(`fragancia ${aromasEncontrados.join(' y ')}`);
  }
  
  // Buscar tamaños
  if (nombreLower.includes('chico') || nombreLower.includes('pequeño')) {
    caracteristicas.push('tamaño compacto');
  } else if (nombreLower.includes('grande') || nombreLower.includes('xl')) {
    caracteristicas.push('tamaño grande');
  }
  
  // Buscar materiales
  if (nombreLower.includes('madera')) {
    caracteristicas.push('acabado en madera');
  }
  
  // Buscar colores
  const colores = ['blanco', 'negro', 'claro', 'oscuro', 'dorado', 'plateado'];
  const colorEncontrado = colores.find(color => nombreLower.includes(color));
  if (colorEncontrado) {
    caracteristicas.push(`color ${colorEncontrado}`);
  }
  
  // 5. Construir descripción final
  let descripcionFinal = descripcionBase;
  
  if (caracteristicas.length > 0 && CONFIG.descripcion.incluirCaracteristicas) {
    descripcionFinal += `. Presenta ${caracteristicas.join(', ')}`;
  }
  
  // Agregar nombre del producto al final si es diferente
  if (!descripcionFinal.toLowerCase().includes(nombre.toLowerCase().substring(0, 10))) {
    descripcionFinal += `. Modelo: ${nombre}`;
  }
  
  // Limitar longitud
  if (descripcionFinal.length > CONFIG.descripcion.maxLength) {
    descripcionFinal = descripcionFinal.substring(0, CONFIG.descripcion.maxLength - 3) + '...';
  }
  
  return descripcionFinal;
}

// 🔍 FUNCIÓN PARA DETECTAR PRODUCTOS INCOMPLETOS
async function detectarProductosIncompletos() {
  console.log('🔍 === DETECTANDO PRODUCTOS INCOMPLETOS ===\n');
  
  try {
    // Buscar productos sin código de barras O sin descripción
    const productos = await prisma.producto.findMany({
      where: {
        activo: true,
        OR: [
          { codigoBarras: null },
          { codigoBarras: '' },
          { descripcion: null },
          { descripcion: '' }
        ]
      },
      include: {
        categoria: true
      },
      orderBy: [
        { categoria: { nombre: 'asc' } },
        { nombre: 'asc' }
      ]
    });
    
    console.log(`📋 Total de productos incompletos encontrados: ${productos.length}`);
    
    // Clasificar por tipo de problema
    const sinCodigoBarras = productos.filter(p => !p.codigoBarras || p.codigoBarras.trim() === '');
    const sinDescripcion = productos.filter(p => !p.descripcion || p.descripcion.trim() === '');
    const sinAmbos = productos.filter(p => 
      (!p.codigoBarras || p.codigoBarras.trim() === '') && 
      (!p.descripcion || p.descripcion.trim() === '')
    );
    
    console.log(`   📊 Sin código de barras: ${sinCodigoBarras.length}`);
    console.log(`   📊 Sin descripción: ${sinDescripcion.length}`);
    console.log(`   📊 Sin ambos: ${sinAmbos.length}`);
    
    // Agrupar por categoría
    const porCategoria = productos.reduce((acc, producto) => {
      const categoria = producto.categoria?.nombre || 'Sin categoría';
      if (!acc[categoria]) {
        acc[categoria] = [];
      }
      acc[categoria].push(producto);
      return acc;
    }, {});
    
    console.log('\n📂 Productos incompletos por categoría:');
    Object.entries(porCategoria).forEach(([categoria, prods]) => {
      console.log(`   ${categoria}: ${prods.length} productos`);
    });
    
    return {
      productos,
      estadisticas: {
        total: productos.length,
        sinCodigoBarras: sinCodigoBarras.length,
        sinDescripcion: sinDescripcion.length,
        sinAmbos: sinAmbos.length,
        porCategoria
      }
    };
  } catch (error) {
    console.error('❌ Error al detectar productos incompletos:', error);
    throw error;
  }
}

// ⚙️ FUNCIÓN PARA PROCESAR UN LOTE DE PRODUCTOS
async function procesarLoteProductos(productos, secuenciaInicial) {
  const resultados = [];
  let secuenciaActual = secuenciaInicial;
  
  for (const producto of productos) {
    const resultado = {
      id: producto.id,
      nombre: producto.nombre,
      categoria: producto.categoria?.nombre || 'Sin categoría',
      cambios: {},
      exito: false,
      error: null
    };
    
    try {
      console.log(`   🔄 Procesando: ${producto.nombre}`);
      
      const datosActualizacion = {};
      
      // Generar código de barras si no tiene
      if (!producto.codigoBarras || producto.codigoBarras.trim() === '') {
        console.log(`      🔢 Generando código de barras...`);
        const { codigo, secuenciaUsada } = await generarCodigoUnico(secuenciaActual);
        datosActualizacion.codigoBarras = codigo;
        resultado.cambios.codigoBarras = codigo;
        secuenciaActual = secuenciaUsada + 1;
        console.log(`      ✅ Código generado: ${codigo}`);
      }
      
      // Generar descripción si no tiene
      if (!producto.descripcion || producto.descripcion.trim() === '') {
        console.log(`      📝 Generando descripción...`);
        const descripcion = generarDescripcionAutomatica(producto);
        datosActualizacion.descripcion = descripcion;
        resultado.cambios.descripcion = descripcion;
        console.log(`      ✅ Descripción: ${descripcion.substring(0, 50)}...`);
      }
      
      // Actualizar producto si hay cambios
      if (Object.keys(datosActualizacion).length > 0) {
        await prisma.producto.update({
          where: { id: producto.id },
          data: datosActualizacion
        });
        
        resultado.exito = true;
        console.log(`      ✅ Producto actualizado correctamente`);
      } else {
        resultado.exito = true;
        console.log(`      ℹ️ Producto ya completo, no requiere cambios`);
      }
      
    } catch (error) {
      console.error(`      ❌ Error procesando ${producto.nombre}:`, error);
      resultado.error = error.message;
    }
    
    resultados.push(resultado);
  }
  
  return { resultados, secuenciaFinal: secuenciaActual };
}

// 🚀 FUNCIÓN PRINCIPAL PARA COMPLETAR PRODUCTOS
async function completarProductosAutomatico(opciones = {}) {
  console.log('🚀 === COMPLETAR PRODUCTOS AUTOMÁTICAMENTE ===\n');
  
  const {
    soloDetectar = false,
    categoria = null,
    limite = null,
    forzarActualizacion = false
  } = opciones;
  
  try {
    // 1. Detectar productos incompletos
    const { productos, estadisticas } = await detectarProductosIncompletos();
    
    if (productos.length === 0) {
      console.log('✅ ¡Todos los productos están completos! No hay nada que hacer.');
      return {
        success: true,
        mensaje: 'Todos los productos están completos',
        estadisticas
      };
    }
    
    if (soloDetectar) {
      console.log('\n📊 === MODO DETECCIÓN ÚNICAMENTE ===');
      console.log('Para procesar los productos, ejecuta sin el flag --solo-detectar');
      return {
        success: true,
        mensaje: 'Detección completada',
        estadisticas,
        productos: productos.map(p => ({
          id: p.id,
          nombre: p.nombre,
          categoria: p.categoria?.nombre,
          tieneCodigoBarras: !!p.codigoBarras,
          tieneDescripcion: !!p.descripcion
        }))
      };
    }
    
    // 2. Filtrar por categoría si se especifica
    let productosAProcesar = productos;
    if (categoria) {
      productosAProcesar = productos.filter(p => 
        p.categoria?.nombre?.toLowerCase().includes(categoria.toLowerCase())
      );
      console.log(`\n🏷️ Filtrando por categoría "${categoria}": ${productosAProcesar.length} productos`);
    }
    
    // 3. Limitar cantidad si se especifica
    if (limite && limite > 0) {
      productosAProcesar = productosAProcesar.slice(0, limite);
      console.log(`📊 Limitando a ${limite} productos`);
    }
    
    if (productosAProcesar.length === 0) {
      console.log('ℹ️ No hay productos que procesar con los filtros aplicados.');
      return {
        success: true,
        mensaje: 'No hay productos que procesar',
        estadisticas
      };
    }
    
    // 4. Obtener la siguiente secuencia disponible para códigos de barras
    console.log('\n🔢 Determinando secuencia inicial para códigos...');
    const ultimoCodigo = await prisma.producto.findFirst({
      where: {
        codigoBarras: {
          startsWith: CONFIG.codigoBarras.pais + CONFIG.codigoBarras.empresa
        }
      },
      orderBy: { codigoBarras: 'desc' }
    });
    
    let secuenciaInicial = CONFIG.codigoBarras.inicioSecuencia;
    if (ultimoCodigo?.codigoBarras) {
      const ultimaSecuencia = parseInt(ultimoCodigo.codigoBarras.substring(7, 12));
      secuenciaInicial = ultimaSecuencia + 1;
    }
    
    console.log(`   🔢 Secuencia inicial: ${secuenciaInicial}`);
    
    // 5. Procesar productos en lotes
    console.log(`\n⚙️ Procesando ${productosAProcesar.length} productos en lotes de ${CONFIG.procesamiento.batchSize}...`);
    
    const todosResultados = [];
    let secuenciaActual = secuenciaInicial;
    
    for (let i = 0; i < productosAProcesar.length; i += CONFIG.procesamiento.batchSize) {
      const lote = productosAProcesar.slice(i, i + CONFIG.procesamiento.batchSize);
      const numeroLote = Math.floor(i / CONFIG.procesamiento.batchSize) + 1;
      const totalLotes = Math.ceil(productosAProcesar.length / CONFIG.procesamiento.batchSize);
      
      console.log(`\n📦 Procesando lote ${numeroLote}/${totalLotes} (${lote.length} productos):`);
      
      const { resultados, secuenciaFinal } = await procesarLoteProductos(lote, secuenciaActual);
      todosResultados.push(...resultados);
      secuenciaActual = secuenciaFinal;
      
      // Pausa entre lotes para no sobrecargar la base de datos
      if (i + CONFIG.procesamiento.batchSize < productosAProcesar.length) {
        console.log(`   ⏳ Pausando ${CONFIG.procesamiento.pausaEntreBatch}ms antes del siguiente lote...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.procesamiento.pausaEntreBatch));
      }
    }
    
    // 6. Generar reporte final
    const exitosos = todosResultados.filter(r => r.exito).length;
    const conErrores = todosResultados.filter(r => !r.exito).length;
    
    console.log('\n📊 === REPORTE FINAL ===');
    console.log(`✅ Productos procesados exitosamente: ${exitosos}`);
    console.log(`❌ Productos con errores: ${conErrores}`);
    console.log(`📋 Total procesados: ${todosResultados.length}`);
    
    // Mostrar códigos de barras generados
    const codigosGenerados = todosResultados
      .filter(r => r.cambios.codigoBarras)
      .length;
    
    const descripcionesGeneradas = todosResultados
      .filter(r => r.cambios.descripcion)
      .length;
    
    console.log(`🔢 Códigos de barras generados: ${codigosGenerados}`);
    console.log(`📝 Descripciones generadas: ${descripcionesGeneradas}`);
    
    // Mostrar errores si los hay
    if (conErrores > 0) {
      console.log('\n❌ === ERRORES ENCONTRADOS ===');
      todosResultados
        .filter(r => !r.exito)
        .forEach((resultado, index) => {
          console.log(`${index + 1}. ${resultado.nombre}: ${resultado.error}`);
        });
    }
    
    return {
      success: exitosos > 0,
      mensaje: `Procesamiento completado: ${exitosos} exitosos, ${conErrores} errores`,
      estadisticas: {
        ...estadisticas,
        procesados: {
          total: todosResultados.length,
          exitosos,
          conErrores,
          codigosGenerados,
          descripcionesGeneradas
        }
      },
      resultados: todosResultados
    };
    
  } catch (error) {
    console.error('💥 Error general en el proceso:', error);
    throw error;
  }
}

// 📊 FUNCIÓN PARA EXPORTAR REPORTE
async function exportarReporte(resultados, nombreArchivo = null) {
  try {
    const fecha = new Date().toISOString().split('T')[0];
    const hora = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    
    const archivo = nombreArchivo || `completar-productos-${fecha}-${hora}.json`;
    
    await fs.writeFile(archivo, JSON.stringify(resultados, null, 2));
    console.log(`💾 Reporte exportado: ${archivo}`);
    
    // También generar versión CSV
    const archivoCSV = archivo.replace('.json', '.csv');
    let csvContent = 'ID,Nombre,Categoria,CodigoGenerado,DescripcionGenerada,Exito,Error\n';
    
    if (resultados.resultados) {
      resultados.resultados.forEach(r => {
        csvContent += `"${r.id}","${r.nombre}","${r.categoria}","${r.cambios.codigoBarras || ''}","${(r.cambios.descripcion || '').replace(/"/g, '""')}","${r.exito}","${r.error || ''}"\n`;
      });
    }
    
    await fs.writeFile(archivoCSV, csvContent);
    console.log(`📊 Reporte CSV exportado: ${archivoCSV}`);
    
    return { archivo, archivoCSV };
  } catch (error) {
    console.error('❌ Error exportando reporte:', error);
  }
}

// 📖 FUNCIÓN PARA MOSTRAR AYUDA
function mostrarAyuda() {
  console.log(`
🚀 Script para Completar Productos Automáticamente

📖 Uso:
   node scripts/insertar/completar-productos-automatico.js [opciones]

🔧 Opciones:
   --solo-detectar    Solo detectar productos incompletos (no procesar)
   --categoria NOMBRE Filtrar por categoría específica
   --limite NUMERO    Limitar cantidad de productos a procesar
   --exportar         Exportar reporte a archivos JSON y CSV
   --ayuda           Mostrar esta ayuda

📖 Ejemplos:
   # Detectar productos incompletos
   node scripts/insertar/completar-productos-automatico.js --solo-detectar
   
   # Procesar solo productos de difusores
   node scripts/insertar/completar-productos-automatico.js --categoria difusores
   
   # Procesar solo 10 productos
   node scripts/insertar/completar-productos-automatico.js --limite 10
   
   # Procesar todo y exportar reporte
   node scripts/insertar/completar-productos-automatico.js --exportar

🎯 Qué hace el script:
   ✅ Detecta productos sin código de barras
   ✅ Detecta productos sin descripción  
   ✅ Genera códigos de barras EAN-13 únicos
   ✅ Genera descripciones inteligentes basadas en:
      - Nombre del producto
      - Categoría
      - Patrones de palabras clave
      - Características detectadas (aromas, tamaños, colores)
   ✅ Actualiza productos en lotes para mejor rendimiento
   ✅ Genera reportes detallados

⚙️ Configuración:
   - Códigos EAN-13: 779 (Argentina) + 1000 (empresa)
   - Descripciones: máximo 255 caracteres
   - Procesamiento: lotes de 50 productos
`);
}

// 🏃 EJECUTAR SI ES LLAMADO DIRECTAMENTE
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--ayuda') || args.includes('--help')) {
    mostrarAyuda();
    process.exit(0);
  }
  
  const opciones = {
    soloDetectar: args.includes('--solo-detectar'),
    exportar: args.includes('--exportar'),
    categoria: null,
    limite: null
  };
  
  // Extraer categoría
  const categoriaIndex = args.indexOf('--categoria');
  if (categoriaIndex !== -1 && args[categoriaIndex + 1]) {
    opciones.categoria = args[categoriaIndex + 1];
  }
  
  // Extraer límite
  const limiteIndex = args.indexOf('--limite');
  if (limiteIndex !== -1 && args[limiteIndex + 1]) {
    opciones.limite = parseInt(args[limiteIndex + 1]);
  }
  
  console.log('🚀 Iniciando proceso de completar productos...\n');
  
  completarProductosAutomatico(opciones)
    .then(async (resultado) => {
      console.log('\n🎉 === PROCESO COMPLETADO ===');
      console.log(`✅ ${resultado.mensaje}`);
      
      if (opciones.exportar && resultado.resultados) {
        console.log('\n💾 Exportando reporte...');
        await exportarReporte(resultado);
      }
      
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 === ERROR FATAL ===');
      console.error(error.message);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

module.exports = { 
  completarProductosAutomatico,
  detectarProductosIncompletos,
  generarCodigoBarrasEAN13,
  generarDescripcionAutomatica,
  exportarReporte
};