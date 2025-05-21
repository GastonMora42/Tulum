// test-cert.js
require('dotenv').config();
const forge = require('node-forge');

try {
  const certPem = Buffer.from(process.env.AFIP_CERT, 'base64').toString('utf8');
  const keyPem = Buffer.from(process.env.AFIP_KEY, 'base64').toString('utf8');
  
  console.log("Certificado:", certPem.substring(0, 100) + "...");
  console.log("Clave:", keyPem.substring(0, 100) + "...");
  
  // Intentar cargar el certificado
  const certificate = forge.pki.certificateFromPem(certPem);
  console.log("Certificado cargado correctamente");
  
  // Intentar cargar la clave
  const privateKey = forge.pki.privateKeyFromPem(keyPem);
  console.log("Clave privada cargada correctamente");
} catch (error) {
  console.error("Error:", error);
}