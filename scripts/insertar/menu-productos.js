// scripts/insertar/menu-productos.js - MENÚ INTERACTIVO PRINCIPAL
const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');
const { promisify } = require('util');
const prisma = new PrismaClient();
const execAsync = promisify(exec);

// Banner principal
function mostrarBanner() {
  console.clear();
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🌿 TULUM AROMATERAPIA 🌿                  ║
║                                                              ║
║              Sistema de Gestión de Productos                 ║
║                     Menú Interactivo                         ║
║                                                              ║
║                      Versión 2.0                            ║
╚══════════════════════════════════════════════════════════════╝
`);
}

// Función para obtener estado del sistema
async function obtenerEstadoSistema() {
  try {
    const stats = {
      productos: await prisma.producto.count({ where: { activo: true } }),
      categorias: await prisma.categoria.count(),
      stock: await prisma.stock.count({ where: { productoId: { not: null } } }),
      ventas: await prisma.itemVenta.count()
    };
    
    return stats;
  } catch (error) {
    return { productos: 0, categorias: 0, stock: 0, ventas: 0, error: true };
  }
}

// Función para mostrar estado actual
async function mostrarEstadoActual() {
  console.log('📊 Estado actual del sistema:\n');
  
  const estado = await obtenerEstadoSistema();
  
  if (estado.error) {
    console.log('   ❌ Error conectando a la base de datos');
    console.log('   💡 Verificar conexión y variables de entorno\n');
    return false;
  }
  
  console.log(`   📦 Productos activos: ${estado.productos}`);
  console.log(`   📂 Categorías: ${estado.categorias}`);
  console.log(`   📊 Registros de stock: ${estado.stock}`);
  console.log(`   🛒 Ventas registradas: ${estado.ventas}`);
  
  // Determinar estado general
  let estadoGeneral = '🔴 VACÍO';
  if (estado.productos > 0 && estado.categorias > 0) {
    estadoGeneral = estado.ventas > 0 ? '🟢 OPERATIVO' : '🟡 CONFIGURADO';
  }
  
  console.log(`   🎯 Estado: ${estadoGeneral}\n`);
  
  return true;
}

// Función para ejecutar comando con feedback
async function ejecutarComando(comando, descripcion) {
  console.log(`\n🚀 ${descripcion}...`);
  console.log(`📝 Comando: ${comando}\n`);
  
  try {
    const { stdout, stderr } = await execAsync(comando, { 
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    if (stdout) console.log(stdout);
    if (stderr) console.log('⚠️ Warnings:', stderr);
    
    return true;
  } catch (error) {
    console.error('❌ Error ejecutando comando:', error.message);
    return false;
  }
}

// Función para pausar y continuar
function pausar(mensaje = '\nPresiona Enter para continuar...') {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(mensaje, () => {
      rl.close();
      resolve();
    });
  });
}

// Menú principal
async function mostrarMenuPrincipal() {
  mostrarBanner();
  
  const conectado = await mostrarEstadoActual();
  
  if (!conectado) {
    console.log('❌ No se puede conectar a la base de datos');
    console.log('💡 Verificar configuración antes de continuar\n');
  }
  
  console.log('🎯 Selecciona una opción:\n');
  console.log('   1️⃣  Setup completo (nuevo sistema)');
  console.log('   2️⃣  Reset completo + Setup automático (NUEVO)');
  console.log('   3️⃣  Insertar/actualizar productos');
  console.log('   4️⃣  Gestionar precios');
  console.log('   5️⃣  Gestionar imágenes');
  console.log('   6️⃣  Crear recetas y asociaciones (NUEVO)');
  console.log('   7️⃣  Auditoría del sistema');
  console.log('   8️⃣  Cargar stock inicial');
  console.log('   9️⃣  Herramientas avanzadas');
  console.log('   🔥  Reset del sistema (PELIGROSO)');
  console.log('   📚  Ayuda y documentación');
  console.log('   0️⃣  Salir\n');
  
  return obtenerOpcion('Selecciona una opción: ');
}

// Función para obtener input del usuario
function obtenerOpcion(mensaje) {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(mensaje, (respuesta) => {
      rl.close();
      resolve(respuesta.trim());
    });
  });
}

// Opción 1: Setup completo
async function setupCompleto() {
  console.clear();
  console.log('🚀 === SETUP COMPLETO ===\n');
  
  console.log('Este proceso configurará el sistema completo con:');
  console.log('✅ 16 categorías con imágenes');
  console.log('✅ 300+ productos optimizados');
  console.log('✅ Precios por categoría');
  console.log('✅ Sistema de imágenes');
  
  const confirmar = await obtenerOpcion('\n¿Continuar? (s/N): ');
  
  if (confirmar.toLowerCase() === 's' || confirmar.toLowerCase() === 'si') {
    const exito = await ejecutarComando(
      'node scripts/insertar/setup-completo-productos.js --si',
      'Ejecutando setup completo'
    );
    
    if (exito) {
      console.log('\n🎉 Setup completado exitosamente!');
      console.log('💡 Próximos pasos:');
      console.log('   1. Subir imágenes reales a public/images/categorias/');
      console.log('   2. Cargar stock inicial por sucursal');
      console.log('   3. Verificar resultado con auditoría');
    }
  } else {
    console.log('❌ Setup cancelado');
  }
  
  await pausar();
}

// Opción 2: Reset completo + Setup automático
async function resetCompletoYSetup() {
  console.clear();
  console.log('🔥 === RESET COMPLETO + SETUP AUTOMÁTICO ===\n');
  
  console.log('⚠️ ATENCIÓN: Esta opción es MUY DESTRUCTIVA');
  console.log('🗑️ Eliminará COMPLETAMENTE:');
  console.log('   • Todas las ventas y facturas');
  console.log('   • Todas las contingencias y conciliaciones'); 
  console.log('   • Todos los productos, categorías y recetas');
  console.log('   • Todo el stock y movimientos');
  console.log('   • TODO el contenido del sistema\n');
  
  console.log('✅ Y después creará DESDE CERO:');
  console.log('   • 17 categorías con imágenes');
  console.log('   • 300+ productos optimizados');
  console.log('   • Precios por categoría');
  console.log('   • Sistema de imágenes configurado\n');
  
  const confirmar = await obtenerOpcion('⚠️ ¿Está SEGURO? Escriba "RESET COMPLETO": ');
  
  if (confirmar === 'RESET COMPLETO') {
    const exito = await ejecutarComando(
      'node scripts/insertar/reset-completo-y-setup.js',
      'Ejecutando reset completo y setup automático'
    );
    
    if (exito) {
      console.log('\n🎉 Reset completo y setup finalizados!');
      console.log('💡 Próximo paso recomendado:');
      console.log('   Crear recetas: Opción 6 del menú');
    }
  } else {
    console.log('❌ Reset cancelado - confirmación incorrecta');
  }
  
  await pausar();
}

// Opción 6: Crear recetas
async function crearRecetas() {
  console.clear();
  console.log('🧪 === CREAR RECETAS Y ASOCIACIONES ===\n');
  
  console.log('Este proceso creará:');
  console.log('✅ Recetas de producción para cada producto');
  console.log('✅ Ingredientes y cantidades necesarias');
  console.log('✅ Asociaciones producto-receta automáticas');
  console.log('⚠️ Limpiará recetas existentes primero\n');
  
  const confirmar = await obtenerOpcion('¿Continuar con la creación de recetas? (s/N): ');
  
  if (confirmar.toLowerCase() === 's' || confirmar.toLowerCase() === 'si') {
    const exito = await ejecutarComando(
      'node scripts/insertar/crear-recetas-productos.js',
      'Creando recetas y asociaciones'
    );
    
    if (exito) {
      console.log('\n🎉 Recetas creadas exitosamente!');
      console.log('💡 Ahora puedes:');
      console.log('   1. Cargar materia prima (insumos)');
      console.log('   2. Cargar stock inicial');
      console.log('   3. Comenzar a producir');
    }
  } else {
    console.log('❌ Creación de recetas cancelada');
  }
  
  await pausar();
}
async function insertarProductos() {
  console.clear();
  console.log('📦 === INSERTAR/ACTUALIZAR PRODUCTOS ===\n');
  
  console.log('Opciones disponibles:');
  console.log('1. Insertar productos definitivos');
  console.log('2. Solo crear categorías');
  console.log('3. Volver al menú principal');
  
  const opcion = await obtenerOpcion('\nSelecciona (1-3): ');
  
  switch (opcion) {
    case '1':
      await ejecutarComando(
        'node scripts/insertar/insertar-productos-finales.js',
        'Insertando productos definitivos'
      );
      break;
      
    case '2':
      await ejecutarComando(
        'node scripts/insertar/insertar-categorias.js',
        'Creando categorías'
      );
      break;
      
    case '3':
      return;
      
    default:
      console.log('❌ Opción inválida');
  }
  
  await pausar();
}

// Opción 3: Gestionar precios
async function gestionarPrecios() {
  console.clear();
  console.log('💰 === GESTIONAR PRECIOS ===\n');
  
  console.log('Opciones disponibles:');
  console.log('1. Verificar precios actuales');
  console.log('2. Actualizar precios');
  console.log('3. Generar reporte de precios');
  console.log('4. Volver al menú principal');
  
  const opcion = await obtenerOpcion('\nSelecciona (1-4): ');
  
  switch (opcion) {
    case '1':
      await ejecutarComando(
        'node scripts/insertar/migrar-precios-productos.js --verificar',
        'Verificando precios actuales'
      );
      break;
      
    case '2':
      await ejecutarComando(
        'node scripts/insertar/migrar-precios-productos.js --actualizar',
        'Actualizando precios'
      );
      break;
      
    case '3':
      await ejecutarComando(
        'node scripts/insertar/migrar-precios-productos.js --reporte',
        'Generando reporte de precios'
      );
      break;
      
    case '4':
      return;
      
    default:
      console.log('❌ Opción inválida');
  }
  
  await pausar();
}

// Opción 4: Gestionar imágenes
async function gestionarImagenes() {
  console.clear();
  console.log('🖼️ === GESTIONAR IMÁGENES ===\n');
  
  console.log('Opciones disponibles:');
  console.log('1. Configurar sistema de imágenes completo');
  console.log('2. Verificar imágenes existentes');
  console.log('3. Sincronizar productos con imágenes');
  console.log('4. Generar placeholders temporales');
  console.log('5. Volver al menú principal');
  
  const opcion = await obtenerOpcion('\nSelecciona (1-5): ');
  
  switch (opcion) {
    case '1':
      await ejecutarComando(
        'node scripts/insertar/gestionar-imagenes-categorias.js',
        'Configurando sistema de imágenes'
      );
      break;
      
    case '2':
      await ejecutarComando(
        'node scripts/insertar/gestionar-imagenes-categorias.js --verificar',
        'Verificando imágenes existentes'
      );
      break;
      
    case '3':
      await ejecutarComando(
        'node scripts/insertar/gestionar-imagenes-categorias.js --sincronizar-productos',
        'Sincronizando productos con imágenes'
      );
      break;
      
    case '4':
      await ejecutarComando(
        'node scripts/insertar/gestionar-imagenes-categorias.js --generar-placeholders',
        'Generando script de placeholders'
      );
      break;
      
    case '5':
      return;
      
    default:
      console.log('❌ Opción inválida');
  }
  
  await pausar();
}

// Opción 5: Auditoría
async function auditoriaSistema() {
  console.clear();
  console.log('🔍 === AUDITORÍA DEL SISTEMA ===\n');
  
  console.log('Opciones disponibles:');
  console.log('1. Verificación rápida');
  console.log('2. Auditoría completa');
  console.log('3. Exportar reporte completo');
  console.log('4. Volver al menú principal');
  
  const opcion = await obtenerOpcion('\nSelecciona (1-4): ');
  
  switch (opcion) {
    case '1':
      await ejecutarComando(
        'node scripts/insertar/auditoria-productos.js --rapido',
        'Ejecutando verificación rápida'
      );
      break;
      
    case '2':
      await ejecutarComando(
        'node scripts/insertar/auditoria-productos.js --completo',
        'Ejecutando auditoría completa'
      );
      break;
      
    case '3':
      await ejecutarComando(
        'node scripts/insertar/auditoria-productos.js --exportar',
        'Exportando reporte completo'
      );
      break;
      
    case '4':
      return;
      
    default:
      console.log('❌ Opción inválida');
  }
  
  await pausar();
}

// Opción 6: Cargar stock
async function cargarStock() {
  console.clear();
  console.log('📦 === CARGAR STOCK INICIAL ===\n');
  
  console.log('Este proceso cargará stock inicial para todos los productos activos.');
  console.log('⚠️ Verificar que los productos estén configurados primero.\n');
  
  const confirmar = await obtenerOpcion('¿Continuar con la carga de stock? (s/N): ');
  
  if (confirmar.toLowerCase() === 's' || confirmar.toLowerCase() === 'si') {
    await ejecutarComando(
      'node scripts/insertar/cargar-stock-inicial.js',
      'Cargando stock inicial'
    );
  } else {
    console.log('❌ Carga de stock cancelada');
  }
  
  await pausar();
}

// Opción 7: Herramientas avanzadas
async function herramientasAvanzadas() {
  console.clear();
  console.log('🔧 === HERRAMIENTAS AVANZADAS ===\n');
  
  console.log('Opciones disponibles:');
  console.log('1. Insertar materia prima (insumos)');
  console.log('2. Insertar insumos PDV');
  console.log('3. Crear recetas de productos');
  console.log('4. Generar usuarios y roles');
  console.log('5. Configurar sucursales');
  console.log('6. Volver al menú principal');
  
  const opcion = await obtenerOpcion('\nSelecciona (1-6): ');
  
  switch (opcion) {
    case '1':
      await ejecutarComando(
        'node scripts/insertar/insertar-materia-prima.js',
        'Insertando materia prima'
      );
      break;
      
    case '2':
      await ejecutarComando(
        'node scripts/insertar/insertar-insumos-pdv.js',
        'Insertando insumos PDV'
      );
      break;
      
    case '3':
      await ejecutarComando(
        'node scripts/insertar/insertar-recetas.js',
        'Creando recetas de productos'
      );
      break;
      
    case '4':
      await ejecutarComando(
        'node prisma/seed2.js',
        'Generando usuarios y roles básicos'
      );
      break;
      
    case '5':
      console.log('💡 Las sucursales se configuran desde el panel de administración');
      console.log('   Ir a /admin/ubicaciones una vez que el sistema esté funcionando');
      break;
      
    case '6':
      return;
      
    default:
      console.log('❌ Opción inválida');
  }
  
  await pausar();
}

// Opción 8: Reset del sistema
async function resetSistema() {
  console.clear();
  console.log('🚨 === RESET DEL SISTEMA ===\n');
  
  console.log('⚠️  ADVERTENCIA: Esta operación es DESTRUCTIVA\n');
  
  console.log('Opciones disponibles:');
  console.log('1. Reset selectivo mejorado (recomendado)');
  console.log('2. Reset completo SIN ventas');
  console.log('3. Reset completo CON ventas (PELIGROSO)');
  console.log('4. Reset de emergencia (fuerza eliminación)');
  console.log('5. Volver al menú principal (recomendado)');
  
  const opcion = await obtenerOpcion('\nSelecciona (1-5): ');
  
  switch (opcion) {
    case '1':
      await ejecutarComando(
        'node scripts/insertar/reset-sistema-productos.js --selectivo',
        'Ejecutando reset selectivo mejorado'
      );
      break;
      
    case '2':
      console.log('\n⚠️ Confirmación requerida para reset completo');
      const confirmar = await obtenerOpcion('Escriba "CONFIRMAR RESET" para continuar: ');
      
      if (confirmar === 'CONFIRMAR RESET') {
        await ejecutarComando(
          'node scripts/insertar/reset-sistema-productos.js --forzar',
          'Ejecutando reset completo sin ventas'
        );
      } else {
        console.log('❌ Reset cancelado - confirmación incorrecta');
      }
      break;
      
    case '3':
      console.log('\n🚨 PELIGRO: Esto eliminará TODO incluyendo ventas');
      const confirmarPeligroso = await obtenerOpcion('Escriba "ELIMINAR TODO" para continuar: ');
      
      if (confirmarPeligroso === 'ELIMINAR TODO') {
        await ejecutarComando(
          'node scripts/insertar/reset-sistema-productos.js --forzar --incluir-ventas',
          'Ejecutando reset completo con ventas'
        );
      } else {
        console.log('❌ Reset cancelado - confirmación incorrecta');
      }
      break;
      
    case '4':
      console.log('\n🚨 RESET DE EMERGENCIA: Deshabilita foreign keys temporalmente');
      const confirmarEmergencia = await obtenerOpcion('Escriba "RESET EMERGENCIA" para continuar: ');
      
      if (confirmarEmergencia === 'RESET EMERGENCIA') {
        await ejecutarComando(
          'node scripts/insertar/reset-sistema-productos.js --emergencia',
          'Ejecutando reset de emergencia'
        );
      } else {
        console.log('❌ Reset de emergencia cancelado');
      }
      break;
      
    case '5':
      return;
      
    default:
      console.log('❌ Opción inválida');
  }
  
  await pausar();
}

// Opción 9: Ayuda
async function mostrarAyuda() {
  console.clear();
  console.log('📚 === AYUDA Y DOCUMENTACIÓN ===\n');
  
  console.log('🎯 Workflows recomendados:\n');
  
  console.log('📋 Para sistema NUEVO:');
  console.log('   1. Setup completo');
  console.log('   2. Subir imágenes a public/images/categorias/');
  console.log('   3. Cargar stock inicial');
  console.log('   4. Verificar con auditoría\n');
  
  console.log('🔄 Para sistema EXISTENTE:');
  console.log('   1. Auditoría del sistema');
  console.log('   2. Insertar/actualizar productos');
  console.log('   3. Gestionar precios');
  console.log('   4. Verificar con auditoría\n');
  
  console.log('🛠️ Comandos manuales útiles:\n');
  console.log('   # Verificación rápida');
  console.log('   node scripts/insertar/auditoria-productos.js --rapido\n');
  
  console.log('   # Setup completo automático');
  console.log('   node scripts/insertar/setup-completo-productos.js --si\n');
  
  console.log('   # Verificar imágenes');
  console.log('   node scripts/insertar/gestionar-imagenes-categorias.js --verificar\n');
  
  console.log('📁 Archivos importantes:');
  console.log('   • public/images/README.md - Guía de imágenes');
  console.log('   • scripts/insertar/ - Todos los scripts');
  console.log('   • prisma/schema.prisma - Esquema de base de datos\n');
  
  console.log('🆘 En caso de problemas:');
  console.log('   1. Verificar conexión a BD: npm run db:status');
  console.log('   2. Ejecutar auditoría: opción 5 del menú');
  console.log('   3. Consultar documentación completa');
  console.log('   4. Hacer backup antes de reset\n');
  
  await pausar();
}

// Función principal del menú
async function ejecutarMenu() {
  let continuar = true;
  
  while (continuar) {
    try {
      const opcion = await mostrarMenuPrincipal();
      
      switch (opcion) {
        case '1':
          await setupCompleto();
          break;
          
        case '2':
          await insertarProductos();
          break;
          
        case '3':
          await gestionarPrecios();
          break;
          
        case '4':
          await gestionarImagenes();
          break;
          
        case '5':
          await auditoriaSistema();
          break;
          
        case '6':
          await cargarStock();
          break;
          
        case '7':
          await herramientasAvanzadas();
          break;
          
        case '8':
          await resetSistema();
          break;
          
        case '9':
          await mostrarAyuda();
          break;
          
        case '0':
          continuar = false;
          console.log('\n👋 ¡Hasta luego! Sistema de productos Tulum');
          break;
          
        default:
          console.log('\n❌ Opción inválida. Intenta nuevamente.');
          await pausar();
      }
      
    } catch (error) {
      console.error('\n💥 Error en el menú:', error.message);
      await pausar('\nPresiona Enter para continuar...');
    }
  }
}

// Función de inicio
async function iniciar() {
  try {
    // Verificar si estamos en el directorio correcto
    const fs = require('fs');
    if (!fs.existsSync('package.json')) {
      console.error('❌ Error: Ejecutar desde el directorio raíz del proyecto');
      process.exit(1);
    }
    
    // Ejecutar menú principal
    await ejecutarMenu();
    
  } catch (error) {
    console.error('💥 Error crítico:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  // Verificar argumentos para modo directo
  const args = process.argv.slice(2);
  
  if (args.includes('--ayuda') || args.includes('--help')) {
    console.log(`
📚 Menú Interactivo de Productos Tulum

🚀 Uso:
   node scripts/insertar/menu-productos.js

🎯 Funcionalidades:
   • Setup completo del sistema
   • Gestión de productos y categorías
   • Manejo de precios e imágenes
   • Auditoría y mantenimiento
   • Herramientas avanzadas
   • Reset seguro del sistema

💡 Para usar comandos individuales:
   node scripts/insertar/[script-especifico].js --ayuda
`);
    process.exit(0);
  }
  
  // Iniciar menú interactivo
  iniciar();
}

module.exports = { 
  ejecutarMenu,
  mostrarBanner,
  obtenerEstadoSistema
};