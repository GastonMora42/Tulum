require('dotenv').config();

async function checkAfipConnectivity() {
  console.log('🌐 VERIFICANDO CONECTIVIDAD CON AFIP\n');
  
  const urls = {
    'WSAA Producción': 'https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL',
    'WSFEv1 Producción': 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL',
    'WSAA Homologación': 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL',
    'WSFEv1 Homologación': 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL'
  };
  
  for (const [name, url] of Object.entries(urls)) {
    try {
      console.log(`Probando ${name}...`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'TulumApp/1.0' }
      });
      
      clearTimeout(timeout);
      
      const text = await response.text();
      const hasWSDL = text.includes('<wsdl:') || text.includes('<definitions');
      
      if (response.ok && hasWSDL) {
        console.log(`✅ ${name}: OK`);
      } else {
        console.log(`❌ ${name}: Status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
    }
  }
}

checkAfipConnectivity();
