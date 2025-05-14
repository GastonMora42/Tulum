const jwt = require('jsonwebtoken');
const fs = require('fs');

// Configura esto según tu sistema de usuarios
const adminPayload = {
  id: 'admin-user-id',
  email: 'admin@tuempresa.com',
  name: 'Administrador',
  roleId: 'role-admin',
  role: {
    name: 'Administrador',
    permissions: ['*']  // Permisos de comodín - acceso a todo
  },
  // Sin expiración para un token de sistema
};

// Clave secreta - en producción usa una clave segura y guárdala de forma segura
const SECRET_KEY = process.env.JWT_SECRET || 'tu-clave-super-secreta-cambia-esto-en-produccion';

// Generar token sin fecha de expiración para tareas automatizadas
const token = jwt.sign(adminPayload, SECRET_KEY);

console.log('Admin Token generado:');
console.log(token);

// Opcional: Guardar en un archivo
fs.writeFileSync('.admin-token', token);
console.log('Token guardado en archivo .admin-token');