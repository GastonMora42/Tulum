import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { barcodeService } from '@/server/services/producto/barcodeService';

export async function POST(req: NextRequest) {
  // Verificar autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const body = await req.json();
    const { productIds } = body;
    
    if (!productIds || productIds.length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron IDs de productos' },
        { status: 400 }
      );
    }
    
    console.log(`Generando PDF para ${productIds.length} productos`);
    
    // Generar PDF con códigos de barras
    try {
      const pdfBuffer = await barcodeService.printBarcodes(productIds);
      
      // Configurar encabezados de respuesta para PDF
      const headers = new Headers();
      headers.set('Content-Type', 'application/pdf');
      headers.set('Content-Disposition', 'attachment; filename="codigos_barras.pdf"');
      
      // Crear respuesta binaria
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers
      });
    } catch (barcodeError) {
      console.error('Error específico al generar PDF:', barcodeError);
      return NextResponse.json(
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error general al generar PDF de códigos de barras:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar PDF de códigos de barras' },
      { status: 500 }
    );
  }
}