// scripts/insertar/gestionar-imagenes-categorias.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const prisma = new PrismaClient();

// Configuración de imágenes por categoría
const imagenesCategoria = {
  'Aceites Corporales': {
    archivo: 'aceites.webp',
    descripcion: 'Botellas de aceites corporales aromáticos',
    colores: ['#8B4513', '#CD853F'], // Marrones cálidos
    urlPlaceholder: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400'
  },
  'Aguas Aromáticas': {
    archivo: 'aguas.jpg', 
    descripcion: 'Frascos spray de aguas aromáticas',
    colores: ['#4682B4', '#87CEEB'], // Azules
    urlPlaceholder: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400'
  },
  'Bombas de Baño': {
    archivo: 'bombas-baño.webp',
    descripcion: 'Bombas efervescentes coloridas para baño',
    colores: ['#FF69B4', '#DDA0DD'], // Rosas y lilas
    urlPlaceholder: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400'
  },
  'Difusores para Auto': {
    archivo: 'difusores-auto.webp',
    descripcion: 'Difusores aromáticos para automóvil',
    colores: ['#2F4F4F', '#696969'], // Grises oscuros
    urlPlaceholder: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400'
  },
  'Difusores de Hogar': {
    archivo: 'difusores.webp',
    descripcion: 'Difusores con varillas de rattan para el hogar',
    colores: ['#DEB887', '#F5DEB3'], // Beiges y cremas
    urlPlaceholder: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=400'
  },
  'Esencias para Hornillo': {
    archivo: 'esencia-humi.webp',
    descripcion: 'Frascos pequeños de esencias para hornillo',
    colores: ['#8B0000', '#DC143C'], // Rojos
    urlPlaceholder: 'https://images.unsplash.com/photo-1574706909645-f29b26e0d5a4?w=400'
  },
  'Esencias para Humidificador': {
    archivo: 'esencia-humi.webp',
    descripcion: 'Botellas de esencias para humidificador',
    colores: ['#00CED1', '#48D1CC'], // Turquesas
    urlPlaceholder: 'https://images.unsplash.com/photo-1556760544-74068565f05c?w=400'
  },
  'Espumas de Baño': {
    archivo: 'espuma-baño.webp',
    descripcion: 'Botellas de espuma de baño aromática',
    colores: ['#9370DB', '#BA55D3'], // Púrpuras
    urlPlaceholder: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400'
  },
  'Fragancias Textiles': {
    archivo: 'fragancia.webp',
    descripcion: 'Sprays para perfumar textiles',
    colores: ['#32CD32', '#98FB98'], // Verdes
    urlPlaceholder: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400'
  },
  'Home Sprays': {
    archivo: 'home-spray.webp',
    descripcion: 'Sprays aromáticos para ambientes',
    colores: ['#FF6347', '#FFA07A'], // Naranjas
    urlPlaceholder: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=400'
  },
  'Humidificadores con Filtro': {
    archivo: 'humidificadores.webp',
    descripcion: 'Humidificadores aromáticos con filtro',
    colores: ['#4169E1', '#6495ED'], // Azules reales
    urlPlaceholder: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400'
  },
  'Humidificadores Grandes': {
    archivo: 'humidificadores-grandes.jpg',
    descripcion: 'Humidificadores de gran capacidad',
    colores: ['#2E8B57', '#3CB371'], // Verdes mar
    urlPlaceholder: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400'
  },
  'Humidificadores Medianos': {
    archivo: 'humidificadores-medianos.jpg',
    descripcion: 'Humidificadores de tamaño mediano',
    colores: ['#20B2AA', '#40E0D0'], // Turquesas claros
    urlPlaceholder: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400'
  },
  'Jabones': {
    archivo: 'jabones.jpg',
    descripcion: 'Jabones líquidos y sólidos aromáticos',
    colores: ['#DAA520', '#F0E68C'], // Dorados
    urlPlaceholder: 'https://images.unsplash.com/photo-1556229174-5e42a09e12ba?w=400'
  },
  'Sales de Baño': {
    archivo: 'sales.webp',
    descripcion: 'Sales de baño aromáticas en frascos',
    colores: ['#E6E6FA', '#DDA0DD'], // Lavandas
    urlPlaceholder: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400'
  },
  'Accesorios': {
    archivo: 'accesorios.jpg',
    descripcion: 'Accesorios y complementos para aromaterapia',
    colores: ['#808080', '#A9A9A9'], // Grises
    urlPlaceholder: 'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400'
  },
  'Velas de Soja': {
    archivo: 'velas.jpg',
    descripcion: 'Velas aromáticas de cera de soja',
    colores: ['#F5F5DC', '#FFFACD'], // Cremas claros
    urlPlaceholder: 'https://images.unsplash.com/photo-1602006832014-94ee0b4b0b67?w=400'
  }
};

// Función para crear directorio de imágenes
async function crearDirectorioImagenes() {
  console.log('📁 Creando estructura de directorios...');
  
  const directorios = [
    'public/images',
    'public/images/categorias',
    'public/images/productos'
  ];
  
  for (const dir of directorios) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`   ✅ ${dir}`);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.error(`   ❌ Error creando ${dir}:`, error.message);
      }
    }
  }
}

// Función para generar archivo README con instrucciones
async function generarInstruccionesImagenes() {
  console.log('📝 Generando instrucciones para imágenes...');
  
  const readme = `# Gestión de Imágenes - Tulum Aromaterapia

## Estructura de Directorios

\`\`\`
public/images/
├── categorias/          # Imágenes base para cada categoría
└── productos/           # Imágenes específicas de productos (opcional)
\`\`\`

## Imágenes de Categorías Requeridas

${Object.entries(imagenesCategoria).map(([categoria, config]) => 
`### ${categoria}
- **Archivo:** \`public/images/categorias/${config.archivo}\`
- **Descripción:** ${config.descripcion}
- **Colores sugeridos:** ${config.colores.join(', ')}
- **Placeholder temporal:** ${config.urlPlaceholder}
`).join('\n')}

## Implementación

1. **Imágenes por defecto:** Cada producto hereda la imagen de su categoría
2. **Imágenes específicas:** Se pueden asignar imágenes únicas por producto
3. **Fallback:** Si no existe la imagen, se muestra un placeholder

## Comandos Útiles

\`\`\`bash
# Actualizar categorías con imágenes
node scripts/insertar/gestionar-imagenes-categorias.js --actualizar-categorias

# Generar placeholders temporales
node scripts/insertar/gestionar-imagenes-categorias.js --generar-placeholders

# Verificar imágenes existentes
node scripts/insertar/gestionar-imagenes-categorias.js --verificar
\`\`\`

## Especificaciones Técnicas

- **Formato:** JPG, PNG, WebP
- **Tamaño:** 400x400px mínimo
- **Peso:** Máximo 200KB por imagen
- **Aspecto:** Cuadrado (1:1) preferible
`;

  try {
    await fs.writeFile('public/images/README.md', readme);
    console.log('   ✅ README.md generado en public/images/');
  } catch (error) {
    console.error('   ❌ Error generando README:', error.message);
  }
}

// Función para actualizar categorías con imágenes
async function actualizarCategoriasConImagenes() {
  console.log('🖼️ Actualizando categorías con rutas de imágenes...');
  
  let actualizadas = 0;
  let errores = 0;
  
  for (const [nombreCategoria, config] of Object.entries(imagenesCategoria)) {
    try {
      const resultado = await prisma.categoria.updateMany({
        where: { nombre: nombreCategoria },
        data: { imagen: `/images/categorias/${config.archivo}` }
      });
      
      if (resultado.count > 0) {
        console.log(`   ✅ ${nombreCategoria} -> ${config.archivo}`);
        actualizadas++;
      } else {
        console.log(`   ⚠️ Categoría no encontrada: ${nombreCategoria}`);
      }
    } catch (error) {
      console.error(`   ❌ Error actualizando ${nombreCategoria}:`, error.message);
      errores++;
    }
  }
  
  console.log(`\n📊 Categorías actualizadas: ${actualizadas}, Errores: ${errores}`);
  return { actualizadas, errores };
}

// Función para verificar imágenes existentes
async function verificarImagenesExistentes() {
  console.log('🔍 Verificando imágenes existentes...');
  
  const verificaciones = [];
  
  for (const [nombreCategoria, config] of Object.entries(imagenesCategoria)) {
    const rutaCompleta = path.join('public/images/categorias', config.archivo);
    
    try {
      await fs.access(rutaCompleta);
      verificaciones.push({
        categoria: nombreCategoria,
        archivo: config.archivo,
        existe: true,
        ruta: rutaCompleta
      });
      console.log(`   ✅ ${config.archivo}`);
    } catch {
      verificaciones.push({
        categoria: nombreCategoria,
        archivo: config.archivo,
        existe: false,
        ruta: rutaCompleta,
        placeholder: config.urlPlaceholder
      });
      console.log(`   ❌ ${config.archivo} (faltante)`);
    }
  }
  
  const existentes = verificaciones.filter(v => v.existe).length;
  const faltantes = verificaciones.filter(v => !v.existe).length;
  
  console.log(`\n📊 Imágenes: ${existentes} existentes, ${faltantes} faltantes`);
  
  if (faltantes > 0) {
    console.log('\n📋 Imágenes faltantes:');
    verificaciones
      .filter(v => !v.existe)
      .forEach(v => {
        console.log(`   - ${v.archivo} para ${v.categoria}`);
        console.log(`     Placeholder: ${v.placeholder}`);
      });
  }
  
  return verificaciones;
}

// Función para generar script de descarga de placeholders
async function generarScriptDescargaPlaceholders() {
  console.log('📥 Generando script de descarga de placeholders...');
  
  const script = `#!/bin/bash
# Script para descargar imágenes placeholder
echo "Descargando imágenes placeholder para categorías..."

cd public/images/categorias

${Object.entries(imagenesCategoria).map(([categoria, config]) => 
`# ${categoria}
echo "Descargando ${config.archivo}..."
curl -L "${config.urlPlaceholder}" -o "${config.archivo}"`
).join('\n\n')}

echo "✅ Descarga completada"
echo "💡 Reemplaza estas imágenes con fotos reales de tus productos"
`;

  try {
    await fs.writeFile('scripts/descargar-imagenes-placeholder.sh', script);
    console.log('   ✅ Script generado: scripts/descargar-imagenes-placeholder.sh');
    console.log('   💡 Ejecutar con: chmod +x scripts/descargar-imagenes-placeholder.sh && ./scripts/descargar-imagenes-placeholder.sh');
  } catch (error) {
    console.error('   ❌ Error generando script:', error.message);
  }
}

// Función para sincronizar productos con imágenes de categoría
async function sincronizarProductosConImagenes() {
  console.log('🔄 Sincronizando productos con imágenes de categoría...');
  
  try {
    // Obtener productos sin imagen específica
    const productosSinImagen = await prisma.producto.findMany({
      where: { 
        OR: [
          { imagen: null },
          { imagen: '' }
        ]
      },
      include: { categoria: true }
    });
    
    console.log(`   📋 Encontrados ${productosSinImagen.length} productos sin imagen`);
    
    let actualizados = 0;
    
    for (const producto of productosSinImagen) {
      if (producto.categoria.imagen) {
        await prisma.producto.update({
          where: { id: producto.id },
          data: { imagen: producto.categoria.imagen }
        });
        actualizados++;
      }
    }
    
    console.log(`   ✅ ${actualizados} productos actualizados con imagen de categoría`);
    return { actualizados };
    
  } catch (error) {
    console.error('❌ Error sincronizando productos:', error);
    throw error;
  }
}

// Función principal
async function gestionarImagenes(comando = null) {
  console.log('🖼️ === GESTIÓN DE IMÁGENES CATEGORÍAS ===\n');
  
  try {
    await crearDirectorioImagenes();
    
    switch (comando) {
      case '--actualizar-categorias':
        await actualizarCategoriasConImagenes();
        break;
        
      case '--verificar':
        await verificarImagenesExistentes();
        break;
        
      case '--generar-placeholders':
        await generarScriptDescargaPlaceholders();
        break;
        
      case '--sincronizar-productos':
        await sincronizarProductosConImagenes();
        break;
        
      default:
        // Ejecutar todo el flujo completo
        await generarInstruccionesImagenes();
        await actualizarCategoriasConImagenes();
        await verificarImagenesExistentes();
        await generarScriptDescargaPlaceholders();
        await sincronizarProductosConImagenes();
    }
    
    console.log('\n🎉 Gestión de imágenes completada');
    
  } catch (error) {
    console.error('❌ Error en gestión de imágenes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const comando = process.argv[2];
  
  gestionarImagenes(comando)
    .then(() => {
      console.log('\n✅ Proceso completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { 
  gestionarImagenes,
  imagenesCategoria,
  verificarImagenesExistentes,
  sincronizarProductosConImagenes
};