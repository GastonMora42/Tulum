// src/scripts/test-facturacion-completa.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFacturacionCompleta() {
  try {
    console.log('=== TEST DE FACTURACIÓN COMPLETA ===\n');
    
    // 1. Verificar configuración AFIP
    console.log('1. Verificando configuración AFIP...');
    const configs = await prisma.configuracionAFIP.findMany();
    
    console.log(`Configuraciones encontradas: ${configs.length}`);
    configs.forEach(config => {
      console.log(`- Sucursal: ${config.sucursalId}, CUIT: ${config.cuit}, PV: ${config.puntoVenta}`);
    });
    
    // 2. Actualizar CUIT si es necesario
    const configConCuitIncorrecto = configs.find(c => c.cuit === '30718236564');
    if (configConCuitIncorrecto) {
      console.log('\n⚠️  Encontrada configuración con CUIT incorrecto, actualizando...');
      await prisma.configuracionAFIP.update({
        where: { id: configConCuitIncorrecto.id },
        data: { cuit: '27285773658' }
      });
      console.log('✅ CUIT actualizado a 27285773658');
    }
    
    // 3. Verificar tokens existentes
    console.log('\n2. Verificando tokens AFIP...');
    const tokens = await prisma.tokenAFIP.findMany();
    
    tokens.forEach(token => {
      const ahora = new Date();
      const valido = token.expirationTime > ahora;
      console.log(`- CUIT: ${token.cuit}, Válido: ${valido ? 'Sí' : 'No'}, Expira: ${token.expirationTime}`);
    });
    
    // 4. Crear datos de prueba si no existen
    console.log('\n3. Verificando datos de prueba...');
    
    // Verificar sucursal
    let sucursal = await prisma.ubicacion.findFirst({
      where: { tipo: 'sucursal' }
    });
    
    if (!sucursal) {
      console.log('Creando sucursal de prueba...');
      sucursal = await prisma.ubicacion.create({
        data: {
          id: 'sucursal-test',
          nombre: 'Sucursal Test',
          tipo: 'sucursal',
          direccion: 'Test 123',
          activo: true
        }
      });
    }
    
    // Verificar producto
    let producto = await prisma.producto.findFirst();
    
    if (!producto) {
      console.log('Creando categoría y producto de prueba...');
      
      const categoria = await prisma.categoria.create({
        data: {
          nombre: 'General'
        }
      });
      
      producto = await prisma.producto.create({
        data: {
          nombre: 'Producto Test',
          precio: 100,
          categoriaId: categoria.id,
          activo: true
        }
      });
    }
    
    // Verificar usuario
    let usuario = await prisma.user.findFirst({
      where: { roleId: 'role-admin' }
    });
    
    if (!usuario) {
      console.log('Error: No hay usuario admin');
      return;
    }
    
    console.log('\n✅ Configuración lista para pruebas');
    console.log('\nPróximos pasos:');
    console.log('1. Ejecuta el script PowerShell para obtener token y sign');
    console.log('2. Usa el componente de Debug con "Test con Token Manual"');
    console.log('3. Pega el token y sign cuando te lo solicite');
    console.log('\nRecuerda usar CUIT: 27285773658');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFacturacionCompleta();