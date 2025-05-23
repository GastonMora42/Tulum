import { NextRequest, NextResponse } from 'next/server';
import { AfipSoapClient } from '@/lib/afip/afipSoapClient';

export async function POST(req: NextRequest) {
  try {
    const { cuit } = await req.json();
    
    const client = new AfipSoapClient(cuit || process.env.AFIP_CUIT || '');
    
    // Test del nuevo método para obtener condiciones IVA
    const auth = await client.getAuth();
    const soapClient = await require('soap').createClientAsync(
      process.env.AFIP_ENV === 'production' 
        ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL'
        : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL'
    );
    
    const result = await soapClient.FEParamGetCondicionIvaReceptorAsync({
      Auth: auth
    });
    
    return NextResponse.json({
      success: true,
      condicionesIVA: result[0]?.FEParamGetCondicionIvaReceptorResult?.ResultGet || [],
      message: 'Condiciones IVA obtenidas correctamente'
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error obteniendo condiciones IVA'
    }, { status: 500 });
  }
}