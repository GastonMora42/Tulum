// src/lib/utils/afipTester.ts
export class AfipTester {
  
    static async testCompleteConnection(cuit: string): Promise<{
      success: boolean;
      tests: Record<string, any>;
      recommendations: string[];
    }> {
      const tests: Record<string, any> = {};
      const recommendations: string[] = [];
  
      // 1. Test de URLs
      tests.urls = await this.testUrls();
      
      // 2. Test de certificados
      tests.certificates = await this.testCertificates();
      
      // 3. Test de autenticación
      tests.authentication = await this.testAuthentication(cuit);
      
      // 4. Test de último comprobante
      tests.lastInvoice = await this.testLastInvoice(cuit);
      
      // 5. Generar recomendaciones
      if (!tests.urls.wsfe) {
        recommendations.push('🔴 No se puede conectar a WSFEv1. Verificar URLs.');
      }
      
      if (!tests.certificates.valid) {
        recommendations.push('🔴 Certificados inválidos. Verificar formato PEM.');
      }
      
      if (!tests.authentication.success) {
        recommendations.push('🔴 Falla autenticación. Verificar CUIT y certificados.');
      }
  
      const success = tests.urls.wsfe && tests.certificates.valid && tests.authentication.success;
      
      return { success, tests, recommendations };
    }
    static testLastInvoice(cuit: string): any {
        throw new Error("Method not implemented.");
    }
    static testAuthentication(cuit: string): any {
        throw new Error("Method not implemented.");
    }
  
    private static async testUrls() {
      const isProduction = process.env.AFIP_ENV === 'production';
      const urls = {
        wsaa: isProduction 
          ? 'https://wsaa.afip.gob.ar/ws/services/LoginCms'
          : 'https://wsaahomo.afip.gob.ar/ws/services/LoginCms',
        wsfe: isProduction
          ? 'https://servicios1.afip.gob.ar/wsfev1/service.asmx'
          : 'https://wswhomo.afip.gob.ar/wsfev1/service.asmx'
      };
  
      const results: Record<string, boolean> = {};
      
      for (const [name, url] of Object.entries(urls)) {
        try {
          const response = await fetch(url + '?WSDL', { 
            method: 'GET',
          });
          results[name] = response.ok;
        } catch {
          results[name] = false;
        }
      }
      
      return results;
    }
  
    private static async testCertificates() {
      try {
        const cert = process.env.AFIP_CERT;
        const key = process.env.AFIP_KEY;
        
        if (!cert || !key) {
          return { valid: false, error: 'Certificados no configurados' };
        }
  
        const certPem = Buffer.from(cert, 'base64').toString('utf8');
        const keyPem = Buffer.from(key, 'base64').toString('utf8');
        
        const certValid = certPem.includes('BEGIN CERTIFICATE');
        const keyValid = keyPem.includes('BEGIN PRIVATE KEY');
        
        return {
          valid: certValid && keyValid,
          cert: certValid,
          key: keyValid
        };
      } catch (error) {
        return { valid: false, error: error instanceof Error ? error.message : 'Error desconocido' };
      }
    }
  }