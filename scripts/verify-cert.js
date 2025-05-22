// scripts/verify-cert.js
require('dotenv').config();
const forge = require('node-forge');

try {
  if (!process.env.AFIP_CERT) {
    console.error('❌ Variable AFIP_CERT no encontrada');
    process.exit(1);
  }

  const certPem = Buffer.from(process.env.AFIP_CERT, 'base64').toString('utf8');
  console.log("📄 Certificado encontrado");
  
  // Cargar certificado
  const certificate = forge.pki.certificateFromPem(certPem);
  
  console.log("✅ Certificado válido");
  console.log("📅 Válido desde:", certificate.validity.notBefore);
  console.log("📅 Válido hasta:", certificate.validity.notAfter);
  console.log("🏢 Emisor:", certificate.issuer.getField('CN').value);
  console.log("👤 Sujeto:", certificate.subject.getField('CN').value);
  
  // Verificar si está expirado
  const now = new Date();
  if (now < certificate.validity.notBefore) {
    console.log("⚠️  Certificado aún no es válido");
  } else if (now > certificate.validity.notAfter) {
    console.log("❌ Certificado EXPIRADO");
  } else {
    console.log("✅ Certificado está VIGENTE");
  }
  
  // Verificar CUIT en el certificado
  const serialNumber = certificate.subject.getField('serialNumber');
  if (serialNumber) {
    console.log("🆔 CUIT en certificado:", serialNumber.value);
  }
  
} catch (error) {
  console.error("❌ Error al verificar certificado:", error.message);
}