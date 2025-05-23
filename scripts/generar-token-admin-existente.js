// scripts/generar-token-admin-existente.js
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const prisma = new PrismaClient();

async function generarTokenParaAdminExistente() {
  try {
    console.log('🔍 Buscando usuario admin existente...');
    
    // Buscar usuario admin (puede ser por rol o por email específico)
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { roleId: 'role-admin' },
          { 
            role: {
              name: 'admin'
            }
          },
          { 
            role: {
              permissions: {
                array_contains: '*'
              }
            }
          }
        ]
      },
      include: { role: true }
    });
    
    if (!adminUser) {
      console.log('❌ No se encontró usuario admin');
      
      // Mostrar todos los usuarios para que puedas elegir
      const todosLosUsuarios = await prisma.user.findMany({
        include: { role: true }
      });
      
      console.log('\n📋 Usuarios disponibles:');
      todosLosUsuarios.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.email} - ${u.name} (Rol: ${u.role?.name || u.roleId})`);
      });
      
      return;
    }
    
    console.log(`✅ Usuario admin encontrado:`);
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Nombre: ${adminUser.name}`);
    console.log(`   Rol: ${adminUser.role?.name || adminUser.roleId}`);
    
    // Generar token JWT
    const payload = {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      roleId: adminUser.roleId,
      role: {
        name: adminUser.role?.name || 'admin',
        permissions: adminUser.role?.permissions || ['*']
      },
      iat: Math.floor(Date.now() / 1000) // Timestamp actual
    };
    
    const SECRET_KEY = process.env.JWT_SECRET || 'tu-clave-super-secreta-cambia-esto-en-produccion';
    const token = jwt.sign(payload, SECRET_KEY);
    
    // Guardar en archivo
    fs.writeFileSync('.admin-token', token);
    
    console.log('\n🎉 ¡Token generado exitosamente!');
    console.log(`   Archivo: .admin-token`);
    console.log(`   Longitud: ${token.length} caracteres`);
    
    // Verificar que el token es válido
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      console.log('✅ Token verificado correctamente');
      console.log(`   Expira: ${decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'Nunca'}`);
    } catch (verifyError) {
      console.log('⚠️  Error verificando token:', verifyError.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generarTokenParaAdminExistente();