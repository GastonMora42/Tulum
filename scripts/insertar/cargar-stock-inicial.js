// scripts/insertar/cargar-stock-inicial.js - VERSIÓN CORREGIDA PARA SUCURSAL EXISTENTE
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configuración del stock inicial - ACTUALIZADA
const CONFIGURACION = {
  sucursalId: 'sucursal-bariloche', // 🔥 ID específico de la sucursal
  sucursalNombre: 'Sucursal Bariloche', // 🔥 Nombre exacto
  cantidadPorProducto: 1,
  motivo: 'Stock inicial para pruebas',
  // Puedes cambiar estas cantidades por categoría si quieres
  cantidadPorCategoria: {
    'Aceites Corporales': 2,
    'Difusores': 3,
    'Velas de Soja': 2,
    'Jabones': 5,
    // El resto usará cantidadPorProducto por defecto
  }
};

// Función CORREGIDA para obtener la sucursal existente
async function obtenerSucursalExistente() {
  console.log(`🏢 Buscando sucursal: ${CONFIGURACION.sucursalNombre} (ID: ${CONFIGURACION.sucursalId})`);
  
  try {
    // 🔥 OPCIÓN 1: Buscar por ID específico (más confiable)
    let sucursal = await prisma.ubicacion.findUnique({
      where: { id: CONFIGURACION.sucursalId }
    });
    
    if (sucursal) {
      console.log(`   ✅ Sucursal encontrada por ID: ${sucursal.nombre} (${sucursal.id})`);
      console.log(`   📍 Dirección: ${sucursal.direccion}`);
      console.log(`   📞 Teléfono: ${sucursal.telefono}`);
      return sucursal;
    }
    
    // 🔥 OPCIÓN 2: Buscar por nombre exacto como fallback
    sucursal = await prisma.ubicacion.findFirst({
      where: { 
        nombre: CONFIGURACION.sucursalNombre,
        tipo: 'sucursal'
      }
    });
    
    if (sucursal) {
      console.log(`   ✅ Sucursal encontrada por nombre: ${sucursal.nombre} (${sucursal.id})`);
      console.log(`   📍 Dirección: ${sucursal.direccion}`);
      return sucursal;
    }
    
    // 🔥 ERROR: No se encontró la sucursal
    console.error('❌ Sucursal no encontrada. Opciones:');
    console.error('   1. Ejecutar primero el script de creación de sucursales');
    console.error('   2. Verificar que el ID o nombre sean correctos');
    
    // Mostrar sucursales disponibles
    const sucursalesDisponibles = await prisma.ubicacion.findMany({
      where: { tipo: 'sucursal' },
      select: { id: true, nombre: true, activo: true }
    });
    
    if (sucursalesDisponibles.length > 0) {
      console.error('   📋 Sucursales disponibles:');
      sucursalesDisponibles.forEach(suc => {
        console.error(`      - ${suc.nombre} (ID: ${suc.id}) ${suc.activo ? '✅' : '❌'}`)
      });
    }
    
    throw new Error(`Sucursal no encontrada: ${CONFIGURACION.sucursalNombre}`);
    
  } catch (error) {
    console.error('❌ Error al buscar sucursal:', error.message);
    throw error;
  }
}

// Función para obtener todos los productos activos
async function obtenerProductosActivos() {
  console.log('📦 Obteniendo productos activos...');
  
  try {
    const productos = await prisma.producto.findMany({
      where: { activo: true },
      include: { categoria: true },
      orderBy: [
        { categoria: { nombre: 'asc' } },
        { nombre: 'asc' }
      ]
    });
    
    console.log(`   📋 Encontrados ${productos.length} productos activos`);
    
    if (productos.length === 0) {
      console.log('⚠️ No hay productos activos. ¿Ejecutaste el script de carga de productos?');
      return [];
    }
    
    // Mostrar resumen por categoría
    const resumenCategorias = productos.reduce((acc, producto) => {
      const categoria = producto.categoria.nombre;
      acc[categoria] = (acc[categoria] || 0) + 1;
      return acc;
    }, {});
    
    console.log('   📂 Productos por categoría:');
    Object.entries(resumenCategorias).forEach(([categoria, cantidad]) => {
      const cantidadStock = CONFIGURACION.cantidadPorCategoria[categoria] || CONFIGURACION.cantidadPorProducto;
      console.log(`      ${categoria}: ${cantidad} productos (${cantidadStock} unid. c/u)`);
    });
    
    return productos;
    
  } catch (error) {
    console.error('❌ Error al obtener productos:', error);
    throw error;
  }
}

// Función para verificar stock existente
async function verificarStockExistente(sucursalId) {
  console.log('🔍 Verificando stock existente...');
  
  try {
    const stockExistente = await prisma.stock.findMany({
      where: { 
        ubicacionId: sucursalId,
        productoId: { not: null } // Solo productos, no insumos
      },
      include: { 
        producto: { include: { categoria: true } }
      }
    });
    
    console.log(`   📊 Stock existente: ${stockExistente.length} productos`);
    
    if (stockExistente.length > 0) {
      console.log('   🔍 Resumen de stock actual por categoría:');
      const stockPorCategoria = stockExistente.reduce((acc, stock) => {
        if (stock.producto) {
          const categoria = stock.producto.categoria.nombre;
          if (!acc[categoria]) {
            acc[categoria] = { productos: 0, unidades: 0 };
          }
          acc[categoria].productos++;
          acc[categoria].unidades += stock.cantidad;
        }
        return acc;
      }, {});
      
      Object.entries(stockPorCategoria).forEach(([categoria, datos]) => {
        console.log(`      ${categoria}: ${datos.productos} productos, ${datos.unidades} unidades`);
      });
    }
    
    return stockExistente;
    
  } catch (error) {
    console.error('❌ Error al verificar stock existente:', error);
    return [];
  }
}

// Función para crear stock para un producto
async function crearStockProducto(sucursalId, producto, cantidad, usuarioId) {
  try {
    // Verificar si ya existe stock para este producto
    const stockExistente = await prisma.stock.findFirst({
      where: {
        ubicacionId: sucursalId,
        productoId: producto.id
      }
    });
    
    if (stockExistente) {
      // Actualizar stock existente
      const stockActualizado = await prisma.stock.update({
        where: { id: stockExistente.id },
        data: { 
          cantidad: stockExistente.cantidad + cantidad,
          ultimaActualizacion: new Date()
        }
      });
      
      // Crear movimiento de stock
      await prisma.movimientoStock.create({
        data: {
          stockId: stockActualizado.id,
          tipoMovimiento: 'entrada',
          cantidad: cantidad,
          motivo: CONFIGURACION.motivo,
          usuarioId: usuarioId,
          fecha: new Date()
        }
      });
      
      return { 
        tipo: 'actualizado', 
        stockAnterior: stockExistente.cantidad, 
        stockNuevo: stockActualizado.cantidad,
        cantidadAgregada: cantidad
      };
    } else {
      // Crear nuevo stock
      const nuevoStock = await prisma.stock.create({
        data: {
          ubicacionId: sucursalId,
          productoId: producto.id,
          cantidad: cantidad,
          ultimaActualizacion: new Date()
        }
      });
      
      // Crear movimiento de stock
      await prisma.movimientoStock.create({
        data: {
          stockId: nuevoStock.id,
          tipoMovimiento: 'entrada',
          cantidad: cantidad,
          motivo: CONFIGURACION.motivo,
          usuarioId: usuarioId,
          fecha: new Date()
        }
      });
      
      return { tipo: 'creado', stockNuevo: cantidad };
    }
    
  } catch (error) {
    console.error(`❌ Error creando stock para ${producto.nombre}:`, error);
    throw error;
  }
}

// Función para obtener o crear usuario admin para los movimientos
async function obtenerUsuarioAdmin() {
  try {
    let usuario = await prisma.user.findFirst({
      where: { 
        roleId: 'role-admin',
        email: 'admin@test.com'
      }
    });
    
    if (!usuario) {
      // Si no existe, buscar cualquier admin
      usuario = await prisma.user.findFirst({
        where: { roleId: 'role-admin' }
      });
    }
    
    if (!usuario) {
      throw new Error('No se encontró usuario admin. Ejecuta primero el script de seed de usuarios.');
    }
    
    return usuario;
  } catch (error) {
    console.error('❌ Error al obtener usuario admin:', error);
    throw error;
  }
}

// Función principal para cargar stock
async function cargarStockInicial(sobreescribir = false) {
  console.log('📦 === CARGA DE STOCK INICIAL PARA SUCURSAL BARILOCHE ===\n');
  
  try {
    // 1. 🔥 CORREGIDO: Obtener sucursal existente
    const sucursal = await obtenerSucursalExistente();
    
    // 2. Obtener usuario admin
    const usuario = await obtenerUsuarioAdmin();
    console.log(`👤 Usuario para movimientos: ${usuario.name} (${usuario.email})`);
    
    // 3. Verificar stock existente
    const stockExistente = await verificarStockExistente(sucursal.id);
    
    if (stockExistente.length > 0 && !sobreescribir) {
      console.log('\n⚠️ Ya existe stock en esta sucursal.');
      console.log('💡 Opciones:');
      console.log('   1. Ejecutar con --sobreescribir para sumar al stock existente');
      console.log('   2. Limpiar el stock primero con --limpiar');
      return { resultado: 'cancelado', motivo: 'stock_existente' };
    }
    
    // 4. Obtener productos
    const productos = await obtenerProductosActivos();
    
    if (productos.length === 0) {
      console.log('❌ No se encontraron productos activos para cargar stock');
      console.log('💡 Ejecuta primero: node scripts/insertar/insertar-productos-completos.js');
      return { resultado: 'error', motivo: 'sin_productos' };
    }
    
    // 5. Cargar stock para cada producto
    console.log('\n📦 Cargando stock inicial...');
    
    let creados = 0;
    let actualizados = 0;
    let errores = 0;
    let totalUnidadesAgregadas = 0;
    const erroresDetalle = [];
    
    for (const producto of productos) {
      try {
        // Determinar cantidad según categoría
        const categoria = producto.categoria.nombre;
        const cantidad = CONFIGURACION.cantidadPorCategoria[categoria] || CONFIGURACION.cantidadPorProducto;
        
        // Crear/actualizar stock
        const resultado = await crearStockProducto(sucursal.id, producto, cantidad, usuario.id);
        
        if (resultado.tipo === 'creado') {
          console.log(`   ✅ ${producto.nombre}: ${cantidad} unidades (nuevo)`);
          creados++;
        } else {
          console.log(`   🔄 ${producto.nombre}: ${resultado.stockAnterior} → ${resultado.stockNuevo} unidades (+${resultado.cantidadAgregada})`);
          actualizados++;
        }
        
        totalUnidadesAgregadas += cantidad;
        
      } catch (error) {
        console.error(`   ❌ Error con ${producto.nombre}: ${error.message}`);
        errores++;
        erroresDetalle.push(`${producto.nombre}: ${error.message}`);
      }
    }
    
    // 6. Mostrar resumen
    console.log('\n📊 === RESUMEN DE CARGA DE STOCK ===');
    console.log(`🏢 Sucursal: ${sucursal.nombre} (${sucursal.id})`);
    console.log(`✅ Stock creado: ${creados} productos`);
    console.log(`🔄 Stock actualizado: ${actualizados} productos`);
    console.log(`📦 Total unidades agregadas: ${totalUnidadesAgregadas}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📋 Total procesado: ${productos.length} productos`);
    
    if (errores > 0) {
      console.log('\n❌ Errores detallados:');
      erroresDetalle.forEach(error => console.log(`   - ${error}`));
    }
    
    // 7. Verificar el stock final por categoría
    console.log('\n📂 Stock final por categoría:');
    const stockFinal = await prisma.stock.findMany({
      where: { 
        ubicacionId: sucursal.id,
        productoId: { not: null }
      },
      include: { 
        producto: { 
          include: { categoria: true }
        }
      }
    });
    
    const resumenStockFinal = stockFinal.reduce((acc, stock) => {
      if (stock.producto) {
        const categoria = stock.producto.categoria.nombre;
        if (!acc[categoria]) {
          acc[categoria] = { productos: 0, totalUnidades: 0 };
        }
        acc[categoria].productos++;
        acc[categoria].totalUnidades += stock.cantidad;
      }
      return acc;
    }, {});
    
    Object.entries(resumenStockFinal).forEach(([categoria, datos]) => {
      console.log(`   ${categoria}: ${datos.productos} productos, ${datos.totalUnidades} unidades totales`);
    });
    
    // 8. Muestra de productos con más stock
    console.log('\n🔝 Top 5 productos con más stock:');
    const topStock = stockFinal
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
    
    topStock.forEach((stock, index) => {
      if (stock.producto) {
        console.log(`   ${index + 1}. ${stock.producto.nombre}: ${stock.cantidad} unidades`);
      }
    });
    
    return {
      resultado: 'exitoso',
      sucursal: sucursal.nombre,
      sucursalId: sucursal.id,
      creados,
      actualizados,
      errores,
      totalProcesado: productos.length,
      totalUnidadesAgregadas
    };
    
  } catch (error) {
    console.error('❌ Error general:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función para limpiar stock existente
async function limpiarStock() {
  console.log(`🧹 Limpiando stock de ${CONFIGURACION.sucursalNombre}...`);
  
  try {
    const sucursal = await obtenerSucursalExistente();
    
    // Eliminar movimientos de stock
    const movimientos = await prisma.movimientoStock.deleteMany({
      where: {
        stock: { 
          ubicacionId: sucursal.id,
          productoId: { not: null } // Solo productos
        }
      }
    });
    
    // Eliminar stock
    const stock = await prisma.stock.deleteMany({
      where: { 
        ubicacionId: sucursal.id,
        productoId: { not: null } // Solo productos
      }
    });
    
    console.log(`   ✅ Eliminados ${movimientos.count} movimientos`);
    console.log(`   ✅ Eliminados ${stock.count} registros de stock`);
    
  } catch (error) {
    console.error('❌ Error limpiando stock:', error);
    throw error;
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const args = process.argv.slice(2);
  const sobreescribir = args.includes('--sobreescribir');
  const limpiar = args.includes('--limpiar');
  
  if (limpiar) {
    console.log('🧹 MODO LIMPIAR ACTIVADO');
    limpiarStock()
      .then(() => {
        console.log('\n✅ Stock limpiado correctamente');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Error limpiando stock:', error);
        process.exit(1);
      });
  } else {
    if (sobreescribir) {
      console.log('🔄 MODO SOBREESCRIBIR ACTIVADO - Se sumará al stock existente');
    }
    
    cargarStockInicial(sobreescribir)
      .then((resultado) => {
        if (resultado.resultado === 'exitoso') {
          console.log('\n🎉 === CARGA DE STOCK COMPLETADA ===');
          console.log(`📦 ${resultado.totalUnidadesAgregadas} unidades agregadas en ${resultado.sucursal}`);
          console.log(`✅ ${resultado.creados + resultado.actualizados} productos procesados`);
        } else {
          console.log(`\n⚠️ Carga cancelada: ${resultado.motivo}`);
        }
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n💥 === ERROR EN LA CARGA DE STOCK ===');
        console.error(error);
        process.exit(1);
      });
  }
}

module.exports = { 
  cargarStockInicial,
  limpiarStock,
  obtenerSucursalExistente
};