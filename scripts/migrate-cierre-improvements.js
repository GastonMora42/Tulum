// scripts/migrate-cierre-improvements.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando migración de mejoras en cierres...');

  try {
    // 1. Crear configuraciones por defecto para sucursales existentes
    console.log('📋 Creando configuraciones de cierre por defecto...');
    
    const sucursales = await prisma.ubicacion.findMany({
      where: { tipo: 'sucursal' }
    });
    
    console.log(`Encontradas ${sucursales.length} sucursales`);
    
    // Buscar un usuario admin para asignar como creador
    const adminUser = await prisma.user.findFirst({
      where: { roleId: 'role-admin' }
    });
    
    if (!adminUser) {
      console.error('❌ No se encontró usuario admin. Creando uno por defecto...');
      
      // Crear rol admin si no existe
      const adminRole = await prisma.role.upsert({
        where: { name: 'admin' },
        update: {},
        create: {
          id: 'role-admin',
          name: 'admin',
          permissions: ['*']
        },
      });
      
      // Crear usuario admin por defecto
      const newAdminUser = await prisma.user.create({
        data: {
          email: 'admin@sistema.com',
          name: 'Administrador del Sistema',
          roleId: adminRole.id
        }
      });
      
      console.log('✅ Usuario admin creado:', newAdminUser.email);
    }
    
    const userToAssign = adminUser || await prisma.user.findFirst({
      where: { roleId: 'role-admin' }
    });
    
    let configuracionesCreadas = 0;
    
    for (const sucursal of sucursales) {
      try {
        // Verificar si ya existe configuración
        const existeConfig = await prisma.configuracionCierre.findUnique({
          where: { sucursalId: sucursal.id }
        });
        
        if (!existeConfig) {
          await prisma.configuracionCierre.create({
            data: {
              sucursalId: sucursal.id,
              montoFijo: 10000, // Valor por defecto
              creadoPor: userToAssign.id
            }
          });
          configuracionesCreadas++;
          console.log(`✅ Configuración creada para ${sucursal.nombre}`);
        } else {
          console.log(`ℹ️  Configuración ya existe para ${sucursal.nombre}`);
        }
      } catch (error) {
        console.error(`❌ Error creando configuración para ${sucursal.nombre}:`, error.message);
      }
    }
    
    console.log(`📊 Se crearon ${configuracionesCreadas} configuraciones de cierre`);
    
    // 2. Actualizar cierres existentes con valores por defecto para los nuevos campos
    console.log('🔄 Actualizando cierres existentes...');
    
    const cierresExistentes = await prisma.cierreCaja.findMany({
      where: {
        fechaCierre: { not: null }, // Solo cierres completados
        montoFijoReferencia: null   // Que no tengan el nuevo campo
      }
    });
    
    console.log(`Encontrados ${cierresExistentes.length} cierres para actualizar`);
    
    let cierresActualizados = 0;
    
    for (const cierre of cierresExistentes) {
      try {
        // Obtener configuración de la sucursal (o crear si no existe)
        let config = await prisma.configuracionCierre.findUnique({
          where: { sucursalId: cierre.sucursalId }
        });
        
        if (!config) {
          config = await prisma.configuracionCierre.create({
            data: {
              sucursalId: cierre.sucursalId,
              montoFijo: 10000,
              creadoPor: userToAssign.id
            }
          });
        }
        
        // Actualizar el cierre con los nuevos campos
        await prisma.cierreCaja.update({
          where: { id: cierre.id },
          data: {
            montoFijoReferencia: config.montoFijo,
            requiereRecuperoProximo: cierre.montoFinal ? cierre.montoFinal < config.montoFijo : false,
            esCierreConDiferencias: cierre.estado === 'con_contingencia',
            alertaMontoInsuficiente: cierre.montoFinal && cierre.montoFinal < config.montoFijo 
              ? `Efectivo final menor al monto fijo. Quedaron $${cierre.montoFinal.toFixed(2)} de $${config.montoFijo.toFixed(2)} requeridos.`
              : null
          }
        });
        
        cierresActualizados++;
        
        if (cierresActualizados % 10 === 0) {
          console.log(`📈 Actualizados ${cierresActualizados}/${cierresExistentes.length} cierres...`);
        }
      } catch (error) {
        console.error(`❌ Error actualizando cierre ${cierre.id}:`, error.message);
      }
    }
    
    console.log(`📊 Se actualizaron ${cierresActualizados} cierres existentes`);
    
    // 3. Verificar integridad de datos
    console.log('🔍 Verificando integridad de datos...');
    
    const estadisticas = await prisma.$transaction([
      // Contar configuraciones
      prisma.configuracionCierre.count(),
      
      // Contar cierres con nuevos campos
      prisma.cierreCaja.count({
        where: {
          fechaCierre: { not: null },
          montoFijoReferencia: { not: null }
        }
      }),
      
      // Contar cierres que requieren recupero
      prisma.cierreCaja.count({
        where: {
          requiereRecuperoProximo: true,
          fechaCierre: { not: null }
        }
      })
    ]);
    
    console.log('\n📊 ESTADÍSTICAS FINALES:');
    console.log(`✅ Configuraciones de cierre: ${estadisticas[0]}`);
    console.log(`✅ Cierres actualizados: ${estadisticas[1]}`);
    console.log(`⚠️  Cierres que requieren recupero: ${estadisticas[2]}`);
    
    // 4. Crear datos de prueba si estamos en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('\n🧪 Creando datos de prueba adicionales...');
      
      try {
        // Buscar una sucursal para crear un cierre de prueba
        const sucursalPrueba = sucursales[0];
        if (sucursalPrueba) {
          // Verificar si no hay caja abierta
          const cajaAbierta = await prisma.cierreCaja.findFirst({
            where: {
              sucursalId: sucursalPrueba.id,
              estado: 'abierto'
            }
          });
          
          if (!cajaAbierta) {
            const cierrePrueba = await prisma.cierreCaja.create({
              data: {
                sucursalId: sucursalPrueba.id,
                montoInicial: 8000, // Menor al monto fijo para pruebas
                usuarioApertura: userToAssign.id,
                estado: 'abierto',
                montoFijoReferencia: 10000
              }
            });
            
            console.log(`✅ Creado cierre de prueba en ${sucursalPrueba.nombre} (ID: ${cierrePrueba.id})`);
          } else {
            console.log('ℹ️  Ya existe una caja abierta, no se creará cierre de prueba');
          }
        }
      } catch (error) {
        console.error('❌ Error creando datos de prueba:', error.message);
      }
    }
    
    console.log('\n🎉 Migración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

// Función para rollback (opcional)
async function rollback() {
  console.log('🔄 Iniciando rollback de la migración...');
  
  try {
    // Eliminar configuraciones creadas
    await prisma.configuracionCierre.deleteMany({});
    
    // Resetear campos en cierres (opcional, comentado por seguridad)
    /*
    await prisma.cierreCaja.updateMany({
      data: {
        montoFijoReferencia: null,
        requiereRecuperoProximo: false,
        alertaMontoInsuficiente: null,
        esCierreConDiferencias: false,
        razonCierreForzado: null
      }
    });
    */
    
    console.log('✅ Rollback completado');
  } catch (error) {
    console.error('❌ Error durante rollback:', error);
    throw error;
  }
}

// Ejecutar migración
main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('🔌 Conexión a base de datos cerrada');
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('💥 Error fatal:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

module.exports = { main, rollback };