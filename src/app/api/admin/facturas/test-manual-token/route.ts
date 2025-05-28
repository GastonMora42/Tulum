// src/app/api/admin/facturas/test-manual-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import prisma from '@/server/db/client';
import * as soap from 'soap';

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;

  try {
    const body = await req.json();
    const { token, sign, cuit = '27285773658' } = body;
    
    if (!token || !sign) {
      return NextResponse.json({
        error: 'Token y Sign son requeridos'
      }, { status: 400 });
    }

    console.log('[TEST-MANUAL] Iniciando test con token manual');
    console.log('[TEST-MANUAL] CUIT:', cuit);

    // 1. Conectar al servicio
    const wsfeUrl = process.env.AFIP_ENV === 'production' 
      ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL'
      : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL';

    const client = await soap.createClientAsync(wsfeUrl);
    
    // 2. Verificar servidor
    const dummyResult = await client.FEDummyAsync({});
    console.log('[TEST-MANUAL] Dummy result:', JSON.stringify(dummyResult[0]));

    // 3. Obtener último comprobante
    const auth = {
      Token: token,
      Sign: sign,
      Cuit: cuit.replace(/-/g, '')
    };

    const ultimoResult = await client.FECompUltimoAutorizadoAsync({
      Auth: auth,
      PtoVta: 1,
      CbteTipo: 6 // Factura B
    });

    const ultimoNumero = ultimoResult[0]?.FECompUltimoAutorizadoResult?.CbteNro || 0;
    const nuevoNumero = ultimoNumero + 1;

    console.log('[TEST-MANUAL] Último comprobante:', ultimoNumero);
    console.log('[TEST-MANUAL] Nuevo número:', nuevoNumero);

    // 4. Crear factura de prueba CORREGIDA
    const importeTotal = 121.00; // Total con IVA
    const importeNeto = 100.00;  // Neto sin IVA
    const importeIVA = 21.00;    // IVA 21%

    const facturaTest = {
      Auth: auth,
      FeCAEReq: {
        FeCabReq: {
          CantReg: 1,
          PtoVta: 1,
          CbteTipo: 6 // Factura B
        },
        FeDetReq: {
          FECAEDetRequest: [{  // IMPORTANTE: Debe ser un array
            Concepto: 1, // Productos
            DocTipo: 99, // Consumidor Final
            DocNro: 0,
            CbteDesde: nuevoNumero,
            CbteHasta: nuevoNumero,
            CbteFch: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
            ImpTotal: importeTotal,
            ImpTotConc: 0,  // Conceptos no gravados
            ImpNeto: importeNeto,
            ImpOpEx: 0,     // Operaciones exentas
            ImpIVA: importeIVA,
            ImpTrib: 0,     // Otros tributos
            MonId: 'PES',
            MonCotiz: 1,
            // NUEVO CAMPO OBLIGATORIO
            CondicionIVAReceptorId: 5, // Consumidor Final
            // ARRAY IVA OBLIGATORIO
            Iva: {
              AlicIva: [{
                Id: 5,  // 21%
                BaseImp: importeNeto,
                Importe: importeIVA
              }]
            }
          }]
        }
      }
    };

    console.log('[TEST-MANUAL] Request:', JSON.stringify(facturaTest, null, 2));

    const facturaResult = await client.FECAESolicitarAsync(facturaTest);
    const response = facturaResult[0]?.FECAESolicitarResult;
    
    console.log('[TEST-MANUAL] Factura result:', JSON.stringify(response, null, 2));

    // Extraer CAE si existe
    let cae = null;
    let fechaVtoCae = null;
    
    if (response?.FeDetResp?.FECAEDetResponse) {
      const detResp = Array.isArray(response.FeDetResp.FECAEDetResponse) 
        ? response.FeDetResp.FECAEDetResponse[0] 
        : response.FeDetResp.FECAEDetResponse;
      
      if (detResp.Resultado === 'A') {
        cae = detResp.CAE;
        fechaVtoCae = detResp.CAEFchVto;
      }
    }

    // Si obtuvimos CAE, guardar el token en la BD para uso futuro
    if (cae && cuit) {
      try {
        // Calcular expiración (12 horas desde ahora)
        const expirationTime = new Date();
        expirationTime.setHours(expirationTime.getHours() + 12);

        // Buscar token existente
        const existingToken = await prisma.tokenAFIP.findFirst({
          where: { cuit: cuit }
        });

        if (existingToken) {
          await prisma.tokenAFIP.update({
            where: { id: existingToken.id },
            data: {
              token,
              sign,
              expirationTime
            }
          });
        } else {
          await prisma.tokenAFIP.create({
            data: {
              cuit,
              token,
              sign,
              expirationTime
            }
          });
        }
        console.log('[TEST-MANUAL] Token guardado en BD para uso futuro');
      } catch (dbError) {
        console.error('[TEST-MANUAL] Error guardando token:', dbError);
      }
    }

    return NextResponse.json({
      success: true,
      cae: cae,
      fechaVtoCae: fechaVtoCae,
      tests: {
        dummy: dummyResult[0]?.FEDummyResult,
        ultimoComprobante: {
          numero: ultimoNumero,
          proximoNumero: nuevoNumero
        },
        factura: response,
        auth: {
          cuit,
          tokenLength: token.length,
          signLength: sign.length
        }
      }
    });

  } catch (error) {
    console.error('[TEST-MANUAL] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}