// src/app/api/pdv/facturas/retry/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { getFacturacionService } from '@/server/services/facturacion/factoryService';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Autenticar
  const authError = await authMiddleware(req);
  if (authError) return authError;

  console.log(`[FACTURA_RETRY] Iniciando reintento manual para factura ID: ${params.id}`);
  
  try {
    const { id } = params;
    const body = await req.json();
    const forceMode = body?.force === true;
    const user = (req as any).user;

    console.log(`[FACTURA_RETRY] Solicitado por: ${user?.name || 'Usuario desconocido'} (${user?.id || 'ID desconocido'})`);
    console.log(`[FACTURA_RETRY] Modo forzado: ${forceMode ? 'Sí' : 'No'}`);
    
    // Buscar factura con datos completos
    const factura = await prisma.facturaElectronica.findUnique({
      where: { id },
      include: { 
        venta: {
          include: {
            items: true,
            sucursal: true
          }
        },
        sucursal: true
      }
    });
    
    if (!factura) {
      console.error(`[FACTURA_RETRY] ERROR: Factura no encontrada con ID ${id}`);
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }
    
    console.log(`[FACTURA_RETRY] Factura encontrada - Estado actual: ${factura.estado}`);
    console.log(`[FACTURA_RETRY] Venta asociada: ${factura.ventaId}`);
    console.log(`[FACTURA_RETRY] Sucursal: ${factura.sucursal?.nombre || 'Desconocida'} (${factura.sucursalId})`);
    
    // Verificar que la factura está en estado de error o pendiente
    if (factura.estado !== 'error' && factura.estado !== 'pendiente' && !forceMode) {
      console.log(`[FACTURA_RETRY] ERROR: Intento de reintento para factura en estado ${factura.estado}`);
      return NextResponse.json(
        { error: 'Solo se pueden reintentar facturas en estado de error o pendiente' },
        { status: 400 }
      );
    }
    
    // Registrar evento de reintento
    const reintento = await prisma.facturaReintento.create({
      data: {
        facturaId: id,
        usuarioId: user.id,
        estadoAnterior: factura.estado,
        motivo: body?.motivo || 'Reintento manual desde administración',
        resultado: 'iniciado'
      }
    });
    
    console.log(`[FACTURA_RETRY] Registro de reintento creado: ${reintento.id}`);
    
    // Actualizar estado a procesando
    await prisma.facturaElectronica.update({
      where: { id },
      data: {
        estado: 'procesando',
        error: null,
        updatedAt: new Date()
      }
    });
    
    console.log(`[FACTURA_RETRY] Estado de factura actualizado a 'procesando'`);
    
    // Obtener servicio de facturación
    console.log(`[FACTURA_RETRY] Obteniendo servicio de facturación para sucursal ${factura.sucursalId}`);
    
    try {
      const facturacionService = await getFacturacionService(factura.sucursalId);
      console.log(`[FACTURA_RETRY] Servicio de facturación obtenido correctamente`);
      
      // Iniciar proceso de facturación
      console.log(`[FACTURA_RETRY] Llamando a generarFactura con ventaId: ${factura.ventaId}`);
      
      const resultado = await facturacionService.generarFactura(factura.ventaId);
      
      // Actualizar registro de reintento
      await prisma.facturaReintento.update({
        where: { id: reintento.id },
        data: {
          resultado: resultado.success ? 'exitoso' : 'fallido',
          error: resultado.success ? null : JSON.stringify(resultado.error),
          cae: resultado.cae,
          completadoEn: new Date()
        }
      });
      
      console.log(`[FACTURA_RETRY] Resultado: ${resultado.success ? 'ÉXITO' : 'FALLIDO'}`);
      if (resultado.success) {
        console.log(`[FACTURA_RETRY] CAE obtenido: ${resultado.cae}`);
      } else {
        console.error(`[FACTURA_RETRY] Error: ${resultado.message}`);
        console.error(`[FACTURA_RETRY] Detalles: ${JSON.stringify(resultado.error)}`);
      }
      
      return NextResponse.json({
        success: resultado.success,
        message: resultado.message,
        facturaId: id,
        cae: resultado.cae,
        reintentoId: reintento.id
      });
    } catch (serviceError) {
      console.error(`[FACTURA_RETRY] Error al obtener servicio de facturación: ${serviceError instanceof Error ? serviceError.message : 'Error desconocido'}`);
      console.error(`[FACTURA_RETRY] Stack trace: ${serviceError instanceof Error ? serviceError.stack : 'No disponible'}`);
      
      // Actualizar registro de reintento
      await prisma.facturaReintento.update({
        where: { id: reintento.id },
        data: {
          resultado: 'fallido',
          error: serviceError instanceof Error ? serviceError.message : 'Error al obtener servicio de facturación',
          completadoEn: new Date()
        }
      });
      
      // Actualizar estado de factura
      await prisma.facturaElectronica.update({
        where: { id },
        data: {
          estado: 'error',
          error: serviceError instanceof Error ? serviceError.message : 'Error al obtener servicio de facturación'
        }
      });
      
      throw serviceError;
    }
  } catch (error: any) {
    console.error(`[FACTURA_RETRY] Error general: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    console.error(`[FACTURA_RETRY] Stack trace: ${error instanceof Error ? error.stack : 'No disponible'}`);
    
    return NextResponse.json(
      { 
        error: error.message || 'Error al reintentar factura',
        details: error.stack || null
      },
      { status: 500 }
    );
  }
}