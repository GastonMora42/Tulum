// scripts/insertar/cargar-imagenes-humidificadores.js
const { PrismaClient } = require('@prisma/client');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

// Configurar S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const bucketName = process.env.S3_BUCKET_NAME || 'tulum-app';
const imagenesPath = path.join(process.cwd(), 'public', 'humidificadores');

// Función para normalizar nombre de archivo (mejorada)
function normalizarNombre(nombre) {
  return nombre
    .replace(/HUMIDIFICADOR\s+/i, '') // Quitar "HUMIDIFICADOR "
    .replace(/[^\w\s\-]/g, '') // Mantener guiones
    .replace(/\s+/g, ' ') // Normalizar espacios
    .trim();
}

// Función para convertir HEIC usando node-heic-convert
async function convertirHEICConNodeHeic(inputBuffer) {
  try {
    const convert = require('heic-convert');
    
    console.log('   🔄 Convirtiendo HEIC con heic-convert...');
    const outputBuffer = await convert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 0.9
    });
    
    // Ahora usar Sharp para convertir a WebP y redimensionar
    return await sharp(outputBuffer)
      .resize({ width: 800, height: 800, fit: 'inside' })
      .webp({ quality: 85 })
      .toBuffer();
      
  } catch (error) {
    throw new Error(`heic-convert falló: ${error.message}`);
  }
}

// Función para convertir HEIC usando sips (macOS)
async function convertirHEICConSips(rutaArchivo) {
  try {
    console.log('   🔄 Convirtiendo HEIC con sips (macOS)...');
    
    const tempDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const tempJpeg = path.join(tempDir, `${uuidv4()}.jpg`);
    
    // Usar sips para convertir HEIC a JPEG
    execSync(`sips -s format jpeg "${rutaArchivo}" --out "${tempJpeg}"`);
    
    // Leer el archivo convertido
    const jpegBuffer = await fs.readFile(tempJpeg);
    
    // Limpiar archivo temporal
    await fs.unlink(tempJpeg);
    
    // Convertir a WebP con Sharp
    return await sharp(jpegBuffer)
      .resize({ width: 800, height: 800, fit: 'inside' })
      .webp({ quality: 85 })
      .toBuffer();
      
  } catch (error) {
    throw new Error(`sips falló: ${error.message}`);
  }
}

// Función para procesar imagen (maneja múltiples formatos y métodos)
async function procesarImagen(inputBuffer, rutaArchivo, extension) {
  try {
    const ext = extension.toLowerCase();
    
    if (ext === '.heic') {
      // Intentar múltiples métodos para HEIC
      const metodos = [
        () => convertirHEICConNodeHeic(inputBuffer),
        () => convertirHEICConSips(rutaArchivo)
      ];
      
      for (let i = 0; i < metodos.length; i++) {
        try {
          return await metodos[i]();
        } catch (error) {
          console.log(`   ⚠️ Método ${i + 1} falló: ${error.message}`);
          if (i === metodos.length - 1) {
            throw new Error(`Todos los métodos de conversión HEIC fallaron. Último error: ${error.message}`);
          }
        }
      }
    } else {
      // Para otros formatos, usar Sharp directamente
      console.log(`   🔄 Convirtiendo ${ext} a WebP...`);
      return await sharp(inputBuffer)
        .resize({ width: 800, height: 800, fit: 'inside' })
        .webp({ quality: 85 })
        .toBuffer();
    }
  } catch (error) {
    console.error('Error procesando imagen:', error);
    throw error;
  }
}

// Función para subir imagen a S3
async function subirImagenS3(buffer, filename) {
  const key = `productos/humidificadores/${filename}`;
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: 'image/webp',
    ACL: 'public-read'
  });
  
  await s3Client.send(command);
  
  return `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

// Función auxiliar para calcular similitud entre strings
function calcularSimilitud(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Algoritmo de distancia de Levenshtein
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Función mejorada para buscar archivo de imagen
async function buscarArchivoImagen(nombreProducto) {
  try {
    const archivos = await fs.readdir(imagenesPath);
    const nombreNormalizado = normalizarNombre(nombreProducto).toLowerCase();
    
    console.log(`   🔍 Buscando imagen para: "${nombreNormalizado}"`);
    
    // 1. Buscar coincidencia exacta
    let archivoEncontrado = archivos.find(archivo => {
      const nombreArchivo = path.parse(archivo).name.toLowerCase();
      return nombreArchivo === nombreNormalizado;
    });
    
    if (archivoEncontrado) {
      console.log(`   ✅ Coincidencia exacta: ${archivoEncontrado}`);
      return archivoEncontrado;
    }
    
    // 2. Buscar que el nombre del producto esté al inicio del archivo
    archivoEncontrado = archivos.find(archivo => {
      const nombreArchivo = path.parse(archivo).name.toLowerCase();
      return nombreArchivo.startsWith(nombreNormalizado);
    });
    
    if (archivoEncontrado) {
      console.log(`   ✅ Coincidencia por inicio: ${archivoEncontrado}`);
      return archivoEncontrado;
    }
    
    // 3. Buscar por palabras clave (mejorado)
    const palabrasProducto = nombreNormalizado
      .split(/[\s\-_]+/) // Dividir por espacios, guiones y guiones bajos
      .filter(palabra => palabra.length > 2);
    
    if (palabrasProducto.length > 0) {
      archivoEncontrado = archivos.find(archivo => {
        const nombreArchivo = path.parse(archivo).name.toLowerCase();
        // Todas las palabras del producto deben estar en el archivo
        return palabrasProducto.every(palabra => nombreArchivo.includes(palabra));
      });
      
      if (archivoEncontrado) {
        console.log(`   ✅ Coincidencia por palabras clave: ${archivoEncontrado}`);
        return archivoEncontrado;
      }
    }
    
    // 4. Buscar por similitud (más flexible)
    archivoEncontrado = archivos.find(archivo => {
      const nombreArchivo = path.parse(archivo).name.toLowerCase();
      const similitud = calcularSimilitud(nombreNormalizado, nombreArchivo);
      return similitud > 0.7; // 70% de similitud
    });
    
    if (archivoEncontrado) {
      console.log(`   ✅ Coincidencia por similitud: ${archivoEncontrado}`);
      return archivoEncontrado;
    }
    
    console.log(`   ❌ No se encontró imagen para: "${nombreNormalizado}"`);
    return null;
    
  } catch (error) {
    console.error('Error leyendo directorio:', error);
    return null;
  }
}

// Función para verificar herramientas disponibles
function verificarHerramientas() {
  const herramientas = [];
  
  // Verificar heic-convert
  try {
    require('heic-convert');
    herramientas.push('✅ heic-convert disponible');
  } catch (error) {
    herramientas.push('❌ heic-convert no instalado');
  }
  
  // Verificar sips (macOS)
  try {
    execSync('which sips', { stdio: 'ignore' });
    herramientas.push('✅ sips disponible (macOS)');
  } catch (error) {
    herramientas.push('❌ sips no disponible');
  }
  
  return herramientas;
}

// Función principal
async function cargarImagenesHumidificadores() {
  console.log('📸 === CARGA DE IMÁGENES DE HUMIDIFICADORES ===\n');
  
  try {
    // Verificar herramientas disponibles
    const herramientas = verificarHerramientas();
    console.log('🔧 Herramientas disponibles:');
    herramientas.forEach(h => console.log(`   ${h}`));
    console.log('');
    
    // Verificar directorio de imágenes
    try {
      const stats = await fs.stat(imagenesPath);
      if (!stats.isDirectory()) {
        throw new Error('La ruta no es un directorio');
      }
    } catch (error) {
      console.error(`❌ Error: Directorio ${imagenesPath} no encontrado`);
      return;
    }
    
    console.log(`📁 Directorio de imágenes: ${imagenesPath}`);
    
    // Obtener humidificadores sin imagen
    const humidificadores = await prisma.producto.findMany({
      where: {
        nombre: { startsWith: 'HUMIDIFICADOR' },
        imagen: null
      },
      orderBy: { nombre: 'asc' }
    });
    
    console.log(`🌊 ${humidificadores.length} humidificadores sin imagen encontrados\n`);
    
    if (humidificadores.length === 0) {
      console.log('✅ Todos los humidificadores ya tienen imagen asignada');
      return;
    }
    
    let procesados = 0;
    let exitosos = 0;
    let errores = 0;
    const resultados = [];
    
    for (const humidificador of humidificadores) {
      procesados++;
      console.log(`📸 [${procesados}/${humidificadores.length}] ${humidificador.nombre}`);
      
      try {
        // Buscar archivo de imagen
        const archivoImagen = await buscarArchivoImagen(humidificador.nombre);
        
        if (!archivoImagen) {
          console.log(`   ⚠️ No se encontró imagen para: ${humidificador.nombre}`);
          errores++;
          resultados.push({
            producto: humidificador.nombre,
            estado: 'sin_imagen',
            archivo: null
          });
          continue;
        }
        
        console.log(`   📁 Archivo encontrado: ${archivoImagen}`);
        
        // Leer archivo
        const rutaCompleta = path.join(imagenesPath, archivoImagen);
        const buffer = await fs.readFile(rutaCompleta);
        const extension = path.extname(archivoImagen);
        
        // Procesar imagen
        const bufferWebP = await procesarImagen(buffer, rutaCompleta, extension);
        
        // Generar nombre único para S3
        const nombreArchivo = `${uuidv4()}.webp`;
        
        // Subir a S3
        console.log(`   ☁️ Subiendo a S3...`);
        const urlImagen = await subirImagenS3(bufferWebP, nombreArchivo);
        
        // Actualizar producto
        await prisma.producto.update({
          where: { id: humidificador.id },
          data: { imagen: urlImagen }
        });
        
        console.log(`   ✅ Imagen asignada: ${urlImagen}`);
        exitosos++;
        
        resultados.push({
          producto: humidificador.nombre,
          estado: 'exitoso',
          archivo: archivoImagen,
          url: urlImagen
        });
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errores++;
        
        resultados.push({
          producto: humidificador.nombre,
          estado: 'error',
          error: error.message
        });
      }
      
      console.log(''); // Línea en blanco
    }
    
    // Resumen final
    console.log('📊 === RESUMEN ===');
    console.log(`✅ Exitosos: ${exitosos}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`⚠️ Sin imagen: ${resultados.filter(r => r.estado === 'sin_imagen').length}`);
    
    // Mostrar productos sin imagen
    const sinImagen = resultados.filter(r => r.estado === 'sin_imagen');
    if (sinImagen.length > 0) {
      console.log('\n⚠️ Productos sin imagen encontrada:');
      sinImagen.forEach(item => {
        console.log(`   - ${item.producto}`);
      });
    }
    
    // Mostrar errores
    const conErrores = resultados.filter(r => r.estado === 'error');
    if (conErrores.length > 0) {
      console.log('\n❌ Productos con errores:');
      conErrores.forEach(item => {
        console.log(`   - ${item.producto}: ${item.error}`);
      });
      
      console.log('\n💡 SOLUCIONES SUGERIDAS:');
      console.log('   1. Instalar heic-convert: npm install heic-convert');
      console.log('   2. Si estás en macOS, sips debería funcionar automáticamente');
      console.log('   3. Convertir manualmente los HEIC a JPEG con:');
      console.log('      - macOS: cd public/humidificadores && sips -s format jpeg *.HEIC');
      console.log('      - Online: convertir en https://heic.online');
    }
    
    // Verificación final
    const totalConImagen = await prisma.producto.count({
      where: {
        nombre: { startsWith: 'HUMIDIFICADOR' },
        imagen: { not: null }
      }
    });
    
    console.log(`\n🎯 Total humidificadores con imagen: ${totalConImagen}`);
    
    return {
      procesados,
      exitosos,
      errores,
      totalConImagen
    };
    
  } catch (error) {
    console.error('\n💥 === ERROR ===');
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  cargarImagenesHumidificadores()
    .then((resultado) => {
      if (resultado) {
        console.log(`\n🏁 Completado: ${resultado.exitosos}/${resultado.procesados} imágenes cargadas`);
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error fatal:', error.message);
      process.exit(1);
    });
}

module.exports = { cargarImagenesHumidificadores };