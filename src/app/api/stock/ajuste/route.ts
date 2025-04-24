// src/app/api/stock/ajuste/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function POST(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) {
    return authResponse;
  }
  
  // Verificar permiso
  const permissionResponse = await checkPermission('stock:ajustar')(req);
  if (permissionResponse) {
    return permissionResponse;
  }
  
  // Verificación adicional para el rol de fábrica
  const user = (req as any).user;
  if (user.roleId === 'role-fabrica') {
    return NextResponse.json(
      { error: 'Los operadores de fábrica deben utilizar el flujo de solicitud y recepción para manejar el stock.' },
      { status: 403 }
    );
  }
  
  try {
    const body = await req.json();
    const { productoId, insumoId, ubicacionId, cantidad, motivo } = body;
    
    // Validar datos
    if ((!productoId && !insumoId) || !ubicacionId) {
      return NextResponse.json(
        { error: 'Se requiere producto o insumo, y ubicación' },
        { status: 400 }
      );
    }
    
    if (!cantidad) {
      return NextResponse.json(
        { error: 'Se requiere la cantidad a ajustar' },
        { status: 400 }
      );
    }
    
    // Obtener el usuario del request
    const user = (req as any).user;
    
    // Realizar ajuste de stock en una transacción
    const result = await prisma.$transaction(async (tx: { stock: { findFirst: (arg0: { where: { ubicacionId: any; insumoId?: any; productoId?: any; }; }) => any; update: (arg0: { where: { id: any; }; data: { cantidad: { increment: any; }; ultimaActualizacion: Date; }; }) => any; create: (arg0: { data: { ubicacionId: any; cantidad: any; ultimaActualizacion: Date; insumoId?: any; productoId?: any; }; }) => any; }; movimientoStock: { create: (arg0: { data: { stockId: any; tipoMovimiento: string; cantidad: number; motivo: any; fecha: Date; usuarioId: any; }; }) => any; }; }) => {
      // Buscar stock existente
// src/app/api/stock/ajuste/route.ts (continuación)
      // Buscar stock existente
      const stockExistente = await tx.stock.findFirst({
        where: {
          ...(productoId ? { productoId } : {}),
          ...(insumoId ? { insumoId } : {}),
          ubicacionId
        }
      });
      
      // Si no existe el stock y el ajuste es negativo, error
      if (!stockExistente && cantidad < 0) {
        throw new Error('No se puede reducir stock inexistente');
      }
      
      // Crear o actualizar stock
      let stock;
      if (stockExistente) {
        // Verificar que no quede negativo
        if (stockExistente.cantidad + cantidad < 0) {
          throw new Error('El ajuste dejaría el stock en negativo');
        }
        
        // Actualizar stock existente
        stock = await tx.stock.update({
          where: { id: stockExistente.id },
          data: {
            cantidad: { increment: cantidad },
            ultimaActualizacion: new Date()
          }
        });
      } else {
        // Crear nuevo stock
        stock = await tx.stock.create({
          data: {
            ...(productoId ? { productoId } : {}),
            ...(insumoId ? { insumoId } : {}),
            ubicacionId,
            cantidad,
            ultimaActualizacion: new Date()
          }
        });
      }
      
      // Registrar movimiento de stock
      const movimiento = await tx.movimientoStock.create({
        data: {
          stockId: stock.id,
          tipoMovimiento: cantidad > 0 ? 'entrada' : 'salida',
          cantidad: Math.abs(cantidad),
          motivo: motivo || 'Ajuste manual',
          fecha: new Date(),
          usuarioId: user.id
        }
      });
      
      return { stock, movimiento };
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error al ajustar stock:', error);
    return NextResponse.json(
      { error: error.message || 'Error al ajustar stock' },
      { status: 500 }
    );
  }
}