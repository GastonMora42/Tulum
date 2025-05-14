// src/app/api/pdv/facturas/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import prisma from '@/server/db/client';
import { facturasPdfService } from '@/server/services/facturacion/facturasPDFService';

interface RouteParams {
  params: {
    id: string;
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  // Autenticar
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const { id } = params;
    
    // Verificar que la factura existe
    const factura = await prisma.facturaElectronica.findUnique({
      where: { id }
    });
    
    if (!factura) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }
    
    // Verificar acceso a la sucursal
    const user = (req as any).user;
    if (user.sucursalId && user.sucursalId !== factura.sucursalId && user.roleId !== 'role-admin') {
      return NextResponse.json({ 
        error: 'No tiene permisos para acceder a esta factura' 
      }, { status: 403 });
    }
    
    // Generar PDF
    const pdfBuffer = await facturasPdfService.generarPdf(id);
    
    // Crear respuesta con PDF
    const response = new NextResponse(pdfBuffer);
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set('Content-Disposition', `inline; filename=factura_${factura.numeroFactura}.pdf`);
    return response;
  } catch (error) {
    console.error('Error al generar PDF de factura:', error);
    return NextResponse.json(
      { error: 'Error al generar PDF de factura' },
      { status: 500 }
    );
  }
}