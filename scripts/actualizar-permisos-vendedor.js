const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function actualizarPermisoVendedor() {
  try {
    console.log('Buscando rol vendedor...');
    const rolVendedor = await prisma.role.findFirst({
      where: { name: 'vendedor' }
    });
    
    if (!rolVendedor) {
      console.error('❌ No se encontró el rol vendedor');
      return;
    }
    
    console.log('Permisos actuales:', rolVendedor.permissions);
    
    // Obtener permisos actualess
    let permisos = rolVendedor.permissions;
    if (typeof permisos === 'string') {
      permisos = JSON.parse(permisos);
    }
    
    // Añadir los permisos necesarios si no existen
    if (!permisos.includes('envio:recibir')) {
      permisos.push('envio:recibir');
      console.log('Añadido permiso envio:recibir');
    }
    
    if (!permisos.includes('envio:ver')) {
      permisos.push('envio:ver');
      console.log('Añadido permiso envio:ver');
    }
    
    // Actualizar el rol
    await prisma.role.update({
      where: { id: rolVendedor.id },
      data: { permissions: permisos }
    });
    
    console.log('✅ Rol vendedor actualizado exitosamente');
    console.log('Nuevos permisos:', permisos);
  } catch (error) {
    console.error('❌ Error al actualizar rol vendedor:', error);
  } finally {
    await prisma.$disconnect();
  }
}

actualizarPermisoVendedor()
  .then(() => console.log('Proceso completado'))
  .catch(console.error);