// scripts/admin/eliminar-usuarios-simplificado.js
const { PrismaClient } = require('@prisma/client');
const readline = require('readline');
const prisma = new PrismaClient();

// IDs de usuarios a analizar/eliminar
const USUARIOS_A_ELIMINAR = [
  '319b05a0-00d1-70dd-da98-8a66b88ac54b',
  '519b95c0-e081-7098-ccd6-948dfb4e55f2',
  '686dc1b7-cb01-4707-ab07-7b1209fb81ab',
  '78326cf3-5c6e-4963-93cf-4e6b8f6c35af',
  '918b75d0-b0c1-7065-d4bf-870cc24c8547',
  'c9728bdb-5d66-48b9-89bd-16ead5940176',
  'd79da4c9-ed3e-4eaf-98f2-c5fae4a34bae',
  'd92b99fb-6aea-4955-b1f6-e06a4c764142',
  'fabb38bc-6826-4527-97b2-711cbb388947'
];

// Función para crear readline interface
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Función para hacer preguntas
function pregunta(rl, texto) {
  return new Promise((resolve) => {
    rl.question(texto, (respuesta) => {
      resolve(respuesta.trim());
    });
  });
}

// Función para obtener información de usuarios
async function obtenerInfoUsuarios(userIds) {
  console.log('📋 Obteniendo información de usuarios...\n');
  
  const usuarios = await prisma.user.findMany({
    where: { id: { in: userIds } },
    include: { role: true, sucursal: true }
  });
  
  const usuariosEncontrados = usuarios.map(u => u.id);
  const usuariosNoEncontrados = userIds.filter(id => !usuariosEncontrados.includes(id));
  
  console.log('👥 Usuarios encontrados:');
  usuarios.forEach(usuario => {
    console.log(`   ✅ ${usuario.name} (${usuario.email})`);
    console.log(`      ID: ${usuario.id}`);
    console.log(`      Rol: ${usuario.role?.name || 'Sin rol'}`);
    console.log(`      Sucursal: ${usuario.sucursal?.nombre || 'Sin sucursal'}`);
    console.log(`      Creado: ${usuario.createdAt.toLocaleDateString()}\n`);
  });
  
  if (usuariosNoEncontrados.length > 0) {
    console.log('❌ Usuarios NO encontrados:');
    usuariosNoEncontrados.forEach(id => {
      console.log(`   ❌ ${id}`);
    });
    console.log('');
  }
  
  return { usuarios, usuariosNoEncontrados };
}

// Función para analizar dependencias de un usuario específico
async function analizarDependenciasUsuario(userId) {
  const dependencias = {
    // Dependencias directas de usuario
    ventas: 0,
    envios: 0,
    producciones: 0,
    contingencias: 0,
    conciliaciones: 0,
    movimientosStock: 0,
    cajaEgresos: 0,
    cierresCaja: 0,
    configuraciones: 0,
    
    // Dependencias indirectas (a través de ventas/envíos)
    itemsVenta: 0,
    pagos: 0,
    facturasElectronicas: 0,
    itemsEnvio: 0,
    
    // Otros
    otros: 0
  };
  
  try {
    // Contar dependencias directas
    dependencias.ventas = await prisma.venta.count({ where: { usuarioId: userId } });
    dependencias.envios = await prisma.envio.count({ where: { usuarioId: userId } });
    dependencias.producciones = await prisma.production.count({ where: { usuarioId: userId } });
    
    dependencias.contingencias = await prisma.contingencia.count({
      where: {
        OR: [
          { creadoPor: userId },
          { resueltoPor: userId }
        ]
      }
    });
    
    dependencias.conciliaciones = await prisma.conciliacion.count({ where: { usuarioId: userId } });
    dependencias.movimientosStock = await prisma.movimientoStock.count({ where: { usuarioId: userId } });
    dependencias.cajaEgresos = await prisma.cajaEgreso.count({ where: { usuarioId: userId } });
    
    dependencias.cierresCaja = await prisma.cierreCaja.count({
      where: {
        OR: [
          { usuarioApertura: userId },
          { usuarioCierre: userId }
        ]
      }
    });
    
    // Configuraciones
    const configs = await Promise.all([
      prisma.puntoEquilibrioConfig.count({ where: { creadoPor: userId } }),
      prisma.configuracionCierre.count({ where: { creadoPor: userId } }),
      prisma.stockConfigSucursal.count({ where: { creadoPor: userId } }),
      prisma.cargaMasivaStock.count({ where: { usuarioId: userId } })
    ]);
    dependencias.configuraciones = configs.reduce((sum, count) => sum + count, 0);
    
    // Contar dependencias indirectas - Items de ventas del usuario
    if (dependencias.ventas > 0) {
      const ventasIds = await prisma.venta.findMany({
        where: { usuarioId: userId },
        select: { id: true }
      });
      const ventasIdsArray = ventasIds.map(v => v.id);
      
      dependencias.itemsVenta = await prisma.itemVenta.count({
        where: { ventaId: { in: ventasIdsArray } }
      });
      
      dependencias.pagos = await prisma.pago.count({
        where: { ventaId: { in: ventasIdsArray } }
      });
      
      dependencias.facturasElectronicas = await prisma.facturaElectronica.count({
        where: { ventaId: { in: ventasIdsArray } }
      });
    }
    
    // Items de envíos del usuario
    if (dependencias.envios > 0) {
      const enviosIds = await prisma.envio.findMany({
        where: { usuarioId: userId },
        select: { id: true }
      });
      const enviosIdsArray = enviosIds.map(e => e.id);
      
      dependencias.itemsEnvio = await prisma.itemEnvio.count({
        where: { envioId: { in: enviosIdsArray } }
      });
    }
    
    // Otros registros varios
    const otros = await Promise.all([
      prisma.facturaReintento.count({ where: { usuarioId: userId } }),
      prisma.movimientoStockInsumoPdv.count({ where: { usuarioId: userId } }),
      prisma.solicitudInsumoPdv.count({
        where: {
          OR: [
            { usuarioId: userId },
            { respondioPor: userId }
          ]
        }
      }),
      prisma.egresoInsumoPdv.count({ where: { usuarioId: userId } }),
      prisma.envioInsumoPdv.count({
        where: {
          OR: [
            { usuarioEnvio: userId },
            { usuarioRecepcion: userId }
          ]
        }
      }),
      prisma.recuperoFondo.count({ where: { usuarioId: userId } })
    ]);
    dependencias.otros = otros.reduce((sum, count) => sum + count, 0);
    
  } catch (error) {
    console.error(`Error analizando dependencias para usuario ${userId}:`, error.message);
  }
  
  return dependencias;
}

// Función para mostrar análisis completo
async function mostrarAnalisisCompleto(usuarios) {
  console.log('📊 === ANÁLISIS DETALLADO DE DEPENDENCIAS ===\n');
  
  const analisisCompleto = {};
  let totalGeneral = 0;
  
  for (const usuario of usuarios) {
    console.log(`👤 ${usuario.name} (${usuario.email})`);
    console.log(`   ID: ${usuario.id}`);
    
    const deps = await analizarDependenciasUsuario(usuario.id);
    analisisCompleto[usuario.id] = deps;
    
    const totalUsuario = Object.values(deps).reduce((sum, count) => sum + count, 0);
    totalGeneral += totalUsuario;
    
    if (totalUsuario === 0) {
      console.log('   ✅ Sin dependencias - SEGURO para eliminar\n');
    } else {
      console.log(`   📋 Total registros: ${totalUsuario}`);
      console.log('   📄 Desglose:');
      
      if (deps.ventas > 0) console.log(`      💰 Ventas: ${deps.ventas}`);
      if (deps.itemsVenta > 0) console.log(`      📦 Items de venta: ${deps.itemsVenta}`);
      if (deps.pagos > 0) console.log(`      💳 Pagos: ${deps.pagos}`);
      if (deps.facturasElectronicas > 0) console.log(`      🧾 Facturas: ${deps.facturasElectronicas}`);
      
      if (deps.envios > 0) console.log(`      🚚 Envíos: ${deps.envios}`);
      if (deps.itemsEnvio > 0) console.log(`      📦 Items de envío: ${deps.itemsEnvio}`);
      
      if (deps.producciones > 0) console.log(`      🏭 Producciones: ${deps.producciones}`);
      if (deps.contingencias > 0) console.log(`      ⚠️ Contingencias: ${deps.contingencias}`);
      if (deps.conciliaciones > 0) console.log(`      ✅ Conciliaciones: ${deps.conciliaciones}`);
      if (deps.movimientosStock > 0) console.log(`      📊 Movimientos stock: ${deps.movimientosStock}`);
      if (deps.cajaEgresos > 0) console.log(`      💸 Egresos caja: ${deps.cajaEgresos}`);
      if (deps.cierresCaja > 0) console.log(`      🔒 Cierres caja: ${deps.cierresCaja}`);
      if (deps.configuraciones > 0) console.log(`      ⚙️ Configuraciones: ${deps.configuraciones}`);
      if (deps.otros > 0) console.log(`      📝 Otros: ${deps.otros}`);
      
      console.log('');
    }
  }
  
  console.log(`🎯 TOTAL GENERAL: ${totalGeneral} registros dependientes\n`);
  return { analisisCompleto, totalGeneral };
}

// Función para eliminar todas las dependencias de un usuario
async function eliminarTodasLasDependenciasUsuario(userId, deps) {
  console.log(`🗑️ Eliminando todas las dependencias de usuario ${userId}...\n`);
  
  let totalEliminado = 0;
  
  try {
    // 1. Eliminar dependencias de ventas (en orden)
    if (deps.ventas > 0) {
      console.log('   📄 Eliminando dependencias de ventas...');
      
      const ventasIds = await prisma.venta.findMany({
        where: { usuarioId: userId },
        select: { id: true }
      });
      const ventasIdsArray = ventasIds.map(v => v.id);
      
      // Eliminar facturas y reintentos primero
      const facturas = await prisma.facturaElectronica.findMany({
        where: { ventaId: { in: ventasIdsArray } },
        select: { id: true }
      });
      
      if (facturas.length > 0) {
        const facturasIds = facturas.map(f => f.id);
        const reintentos = await prisma.facturaReintento.deleteMany({
          where: { facturaId: { in: facturasIds } }
        });
        console.log(`      ✅ Reintentos eliminados: ${reintentos.count}`);
        totalEliminado += reintentos.count;
        
        const facturasElim = await prisma.facturaElectronica.deleteMany({
          where: { id: { in: facturasIds } }
        });
        console.log(`      ✅ Facturas eliminadas: ${facturasElim.count}`);
        totalEliminado += facturasElim.count;
      }
      
      // Eliminar pagos
      const pagos = await prisma.pago.deleteMany({
        where: { ventaId: { in: ventasIdsArray } }
      });
      console.log(`      ✅ Pagos eliminados: ${pagos.count}`);
      totalEliminado += pagos.count;
      
      // Eliminar items de venta
      const items = await prisma.itemVenta.deleteMany({
        where: { ventaId: { in: ventasIdsArray } }
      });
      console.log(`      ✅ Items de venta eliminados: ${items.count}`);
      totalEliminado += items.count;
      
      // Finalmente eliminar ventas
      const ventas = await prisma.venta.deleteMany({
        where: { usuarioId: userId }
      });
      console.log(`      ✅ Ventas eliminadas: ${ventas.count}`);
      totalEliminado += ventas.count;
    }
    
    // 2. Eliminar dependencias de envíos
    if (deps.envios > 0) {
      console.log('   📦 Eliminando dependencias de envíos...');
      
      const enviosIds = await prisma.envio.findMany({
        where: { usuarioId: userId },
        select: { id: true }
      });
      const enviosIdsArray = enviosIds.map(e => e.id);
      
      // Eliminar items de envío
      const itemsEnvio = await prisma.itemEnvio.deleteMany({
        where: { envioId: { in: enviosIdsArray } }
      });
      console.log(`      ✅ Items de envío eliminados: ${itemsEnvio.count}`);
      totalEliminado += itemsEnvio.count;
      
      // Eliminar envíos
      const envios = await prisma.envio.deleteMany({
        where: { usuarioId: userId }
      });
      console.log(`      ✅ Envíos eliminados: ${envios.count}`);
      totalEliminado += envios.count;
    }
    
    // 3. Eliminar producciones
    if (deps.producciones > 0) {
      const producciones = await prisma.production.deleteMany({
        where: { usuarioId: userId }
      });
      console.log(`   🏭 Producciones eliminadas: ${producciones.count}`);
      totalEliminado += producciones.count;
    }
    
    // 4. Eliminar contingencias
    if (deps.contingencias > 0) {
      const contingencias = await prisma.contingencia.deleteMany({
        where: {
          OR: [
            { creadoPor: userId },
            { resueltoPor: userId }
          ]
        }
      });
      console.log(`   ⚠️ Contingencias eliminadas: ${contingencias.count}`);
      totalEliminado += contingencias.count;
    }
    
    // 5. Eliminar resto de dependencias
    const operaciones = [
      { modelo: 'conciliacion', where: { usuarioId: userId }, nombre: 'Conciliaciones' },
      { modelo: 'movimientoStock', where: { usuarioId: userId }, nombre: 'Movimientos stock' },
      { modelo: 'cajaEgreso', where: { usuarioId: userId }, nombre: 'Egresos caja' },
      { modelo: 'recuperoFondo', where: { usuarioId: userId }, nombre: 'Recuperos fondo' },
      { 
        modelo: 'cierreCaja', 
        where: { 
          OR: [
            { usuarioApertura: userId },
            { usuarioCierre: userId }
          ]
        }, 
        nombre: 'Cierres caja' 
      },
      { modelo: 'puntoEquilibrioConfig', where: { creadoPor: userId }, nombre: 'Configs punto equilibrio' },
      { modelo: 'configuracionCierre', where: { creadoPor: userId }, nombre: 'Configs cierre' },
      { modelo: 'stockConfigSucursal', where: { creadoPor: userId }, nombre: 'Configs stock' },
      { modelo: 'cargaMasivaStock', where: { usuarioId: userId }, nombre: 'Cargas masivas' },
      { modelo: 'movimientoStockInsumoPdv', where: { usuarioId: userId }, nombre: 'Movimientos PDV' },
      { modelo: 'egresoInsumoPdv', where: { usuarioId: userId }, nombre: 'Egresos PDV' },
      { 
        modelo: 'solicitudInsumoPdv', 
        where: { 
          OR: [
            { usuarioId: userId },
            { respondioPor: userId }
          ]
        }, 
        nombre: 'Solicitudes PDV' 
      },
      { 
        modelo: 'envioInsumoPdv', 
        where: { 
          OR: [
            { usuarioEnvio: userId },
            { usuarioRecepcion: userId }
          ]
        }, 
        nombre: 'Envíos PDV' 
      }
    ];
    
    for (const op of operaciones) {
      try {
        const resultado = await prisma[op.modelo].deleteMany({ where: op.where });
        if (resultado.count > 0) {
          console.log(`   📝 ${op.nombre} eliminados: ${resultado.count}`);
          totalEliminado += resultado.count;
        }
      } catch (error) {
        console.log(`   ❌ Error eliminando ${op.nombre}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error(`   ❌ Error general eliminando dependencias: ${error.message}`);
  }
  
  console.log(`   📊 Total eliminado: ${totalEliminado} registros\n`);
  return totalEliminado;
}

// Función principal
async function main() {
  console.log('🗑️ === SCRIPT SIMPLIFICADO DE ELIMINACIÓN DE USUARIOS ===\n');
  
  const rl = createReadlineInterface();
  
  try {
    // 1. Verificar usuarios
    const { usuarios, usuariosNoEncontrados } = await obtenerInfoUsuarios(USUARIOS_A_ELIMINAR);
    
    if (usuarios.length === 0) {
      console.log('❌ No se encontraron usuarios válidos para eliminar.');
      return;
    }
    
    // 2. Analizar dependencias
    const { analisisCompleto, totalGeneral } = await mostrarAnalisisCompleto(usuarios);
    
    // 3. Preguntar si continuar
    if (totalGeneral > 0) {
      console.log('⚠️ ATENCIÓN: Se encontraron dependencias que serán eliminadas.');
      console.log('Esta operación es IRREVERSIBLE y eliminará:');
      console.log(`   📊 ${totalGeneral} registros dependientes`);
      console.log(`   👥 ${usuarios.length} usuarios\n`);
      
      const respuesta = await pregunta(rl, '¿Está seguro de continuar? Escriba "ELIMINAR TODO": ');
      
      if (respuesta !== 'ELIMINAR TODO') {
        console.log('❌ Operación cancelada por el usuario.');
        return;
      }
    } else {
      const respuesta = await pregunta(rl, 'No se encontraron dependencias. ¿Continuar con eliminación? (s/N): ');
      
      if (respuesta.toLowerCase() !== 's' && respuesta.toLowerCase() !== 'si') {
        console.log('❌ Operación cancelada por el usuario.');
        return;
      }
    }
    
    // 4. Realizar eliminación
    console.log('\n🚀 Iniciando proceso de eliminación...\n');
    
    let totalRegistrosEliminados = 0;
    let usuariosEliminados = 0;
    
    for (const usuario of usuarios) {
      const deps = analisisCompleto[usuario.id];
      
      console.log(`🔄 Procesando usuario: ${usuario.name} (${usuario.email})`);
      
      // Eliminar todas las dependencias
      const eliminados = await eliminarTodasLasDependenciasUsuario(usuario.id, deps);
      totalRegistrosEliminados += eliminados;
      
      // Eliminar usuario
      try {
        await prisma.user.delete({
          where: { id: usuario.id }
        });
        console.log(`   ✅ Usuario eliminado: ${usuario.name}\n`);
        usuariosEliminados++;
      } catch (error) {
        console.log(`   ❌ Error eliminando usuario ${usuario.name}: ${error.message}\n`);
      }
    }
    
    // 5. Resumen final
    console.log('🎉 === ELIMINACIÓN COMPLETADA ===');
    console.log(`✅ Usuarios eliminados: ${usuariosEliminados}/${usuarios.length}`);
    console.log(`📊 Registros dependientes eliminados: ${totalRegistrosEliminados}`);
    
    if (usuariosNoEncontrados.length > 0) {
      console.log(`⚠️ Usuarios no encontrados: ${usuariosNoEncontrados.length}`);
    }
    
  } catch (error) {
    console.error('❌ Error durante el proceso:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Función solo para análisis
async function soloAnalisis() {
  console.log('🔍 === ANÁLISIS DE DEPENDENCIAS ===\n');
  
  try {
    const { usuarios } = await obtenerInfoUsuarios(USUARIOS_A_ELIMINAR);
    await mostrarAnalisisCompleto(usuarios);
    
    console.log('💡 Para proceder con la eliminación, ejecute:');
    console.log('   node scripts/admin/eliminar-usuarios-simplificado.js --eliminar\n');
    
  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Determinar modo de ejecución
const args = process.argv.slice(2);
const eliminar = args.includes('--eliminar');

if (eliminar) {
  main();
} else {
  soloAnalisis();
}