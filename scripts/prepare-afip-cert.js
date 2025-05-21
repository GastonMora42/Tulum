// scripts/prepare-afip-cert.js
const fs = require('fs');

// Ruta a tus archivos
const CERT_PATH = './afip_certificados/tulum-arca.crt'; // Ajusta a la ruta correcta
const KEY_PATH = './afip_certificados/privada';

try {
  // Leer archivos
  const certContent = fs.readFileSync(CERT_PATH, 'utf8');
  const keyContent = fs.readFileSync(KEY_PATH, 'utf8');
  
  // Convertir a base64
  const certBase64 = Buffer.from(certContent).toString('base64');
  const keyBase64 = Buffer.from(keyContent).toString('base64');
  
  console.log('# Añade estas líneas a tu archivo .env:');
  console.log(`AFIP_CERT=${certBase64}`);
  console.log(`AFIP_KEY=${keyBase64}`);
  
  // Guardar en archivos (opcional)
  fs.writeFileSync('./afip_certificados/cert_base64.txt', certBase64);
  fs.writeFileSync('./afip_certificados/key_base64.txt', keyBase64);
  console.log('# También se guardaron en cert_base64.txt y key_base64.txt');
} catch (error) {
  console.error('Error:', error.message);
}