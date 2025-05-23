// src/app/api/admin/facturas/test-cert/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import * as forge from 'node-forge';

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;

  try {
    const resultado: any = {
      timestamp: new Date().toISOString(),
      certificados: {}
    };

    // Verificar variables de entorno
    resultado.variables = {
      AFIP_ENV: process.env.AFIP_ENV,
      AFIP_CUIT: process.env.AFIP_CUIT,
      AFIP_CERT_EXISTS: !!process.env.AFIP_CERT,
      AFIP_KEY_EXISTS: !!process.env.AFIP_KEY,
      AFIP_CERT_LENGTH: process.env.AFIP_CERT?.length || 0,
      AFIP_KEY_LENGTH: process.env.AFIP_KEY?.length || 0
    };

    if (!process.env.AFIP_CERT || !process.env.AFIP_KEY) {
      resultado.error = 'Certificados AFIP no configurados en variables de entorno';
      return NextResponse.json(resultado);
    }

    try {
      // Decodificar certificados
      const certPem = Buffer.from(process.env.AFIP_CERT, 'base64').toString('utf8');
      const keyPem = Buffer.from(process.env.AFIP_KEY, 'base64').toString('utf8');
      
      resultado.certificados.cert_preview = certPem.substring(0, 200);
      resultado.certificados.key_preview = keyPem.substring(0, 200);
      
      // Validar formato
      resultado.certificados.cert_format_valid = 
        certPem.includes('-----BEGIN CERTIFICATE-----') && 
        certPem.includes('-----END CERTIFICATE-----');
        
      resultado.certificados.key_format_valid = 
        keyPem.includes('-----BEGIN PRIVATE KEY-----') && 
        keyPem.includes('-----END PRIVATE KEY-----');

      if (resultado.certificados.cert_format_valid) {
        // Parsear certificado
        const certificate = forge.pki.certificateFromPem(certPem);
        
        resultado.certificados.cert_info = {
          subject: certificate.subject.getField('CN')?.value || 'N/A',
          issuer: certificate.issuer.getField('CN')?.value || 'N/A',
          valid_from: certificate.validity.notBefore,
          valid_to: certificate.validity.notAfter,
          is_expired: new Date() > certificate.validity.notAfter,
          serial_number: certificate.serialNumber
        };
      }

      if (resultado.certificados.key_format_valid) {
        // Validar clave privada
        const privateKey = forge.pki.privateKeyFromPem(keyPem);
        resultado.certificados.key_info = {
          valid: true,
          bits: (privateKey as any).n?.bitLength() || 'unknown'
        };
      }

    } catch (error) {
      resultado.certificados.parse_error = error instanceof Error ? error.message : 'Error desconocido';
    }

    return NextResponse.json(resultado);
    
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}