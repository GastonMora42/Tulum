

// =================================================================
// NUEVO ENDPOINT: src/app/api/pdv/facturas/[id]/validate/route.ts
// =================================================================

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { getFacturacionService } from '@/server/services/facturacion/factoryService';

interface RouteParams {
  params: {
    id: string;
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const { id } = params;
    
    console.log(`🔍 [VALIDATE] Validando factura: ${id}`);
    
    // Obtener servicio de facturación
    const facturacionService = await getFacturacionService('default');
    
    // Verificar estado
    const estado = await facturacionService.verificarEstadoFactura(id);
    
    console.log(`📊 [VALIDATE] Resultado:`, estado);
    
    return NextResponse.json({
      facturaId: id,
      ...estado,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ [VALIDATE] Error validando factura:`, error);
    return NextResponse.json(
      { 
        error: 'Error de validación',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
