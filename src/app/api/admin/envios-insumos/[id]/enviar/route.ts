// src/app/api/admin/envios-insumos/[id]/enviar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';
import { stockService } from '@/server/services/stock/stockService';

// Esquema de validación
const enviarInsumoSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      cantidad: z.number().int().min(0, 'La cantidad no puede ser negativa')
    })
  ),
  observaciones: z.string().optional()
});

// src/app/api/admin/envios-insumos/[id]/enviar/route.ts
export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('stock:ajustar')(req);
  if (permissionError) return permissionError;
  
  try {
    // Obtener ID correctamente
    const id = context.params.id;
    
    // Obtener datos del body
    let body;
    try {
      body = await req.json();
      console.log('Datos recibidos:', body);
    } catch (error) {
      console.error('Error al procesar JSON:', error);
      return NextResponse.json(
        { error: 'Error en formato de datos enviados' },
        { status: 400 }
      );
    }
    
    // Obtener usuario
    const user = (req as any).user;
    const isAdmin = user.roleId === 'role-admin';
    
    console.log(`Usuario ${user.name} (${isAdmin ? 'admin' : 'no admin'}) está procesando envío ${id}`);
    
    // Verificar que el envío existe y está en estado pendiente
    const envio = await prisma.envio.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            insumo: true
          }
        }
      }
    });
    
    if (!envio) {
      return NextResponse.json(
        { error: 'Envío no encontrado' },
        { status: 404 }
      );
    }
    
    if (envio.estado !== 'pendiente') {
      return NextResponse.json(
        { error: `El envío no puede ser procesado porque está en estado ${envio.estado}` },
        { status: 400 }
      );
    }
    
    // Actualizar estado del envío y procesar en una transacción
    const envioActualizado = await prisma.$transaction(async (tx) => {
      // 1. Actualizar envío
      const updatedEnvio = await tx.envio.update({
        where: { id },
        data: {
          estado: 'enviado',
          fechaEnvio: new Date()
        }
      });

for (const item of envio.items) {
  if (item && item.insumoId) {
    // Obtener stock actual
    const stockActual = await stockService.getStock({
      insumoId: item.insumoId,
      ubicacionId: envio.origenId
    });
    
    // Verificar si hay suficiente stock
    if (!stockActual || stockActual.length === 0 || stockActual[0]?.cantidad < (item.cantidad || 0)) {
      // Si es admin, advertir pero permitir
      if (isAdmin) {
        console.warn(`Stock insuficiente para insumo ${item.insumoId}. Disponible: ${stockActual?.[0]?.cantidad || 0}, Requerido: ${item.cantidad || 0}`);
      } else {
        return NextResponse.json(
          { error: `Stock insuficiente para insumo ${item.insumoId}` },
          { status: 400 }
        );
      }
    }
  }
}

// Una vez verificado, proceder con el ajuste de stock
for (const item of envio.items) {
  if (item && item.insumoId) {
    await stockService.ajustarStock({
      insumoId: item.insumoId,
      ubicacionId: envio.origenId || '',
      cantidad: -(item.cantidad || 0), // Cantidad negativa porque sale del origen
      motivo: `Envío de insumos #${id}`,
      usuarioId: user.id,
      envioId: id,
      allowNegative: isAdmin // Permitir stock negativo si es admin
    });
  }
}
      // 3. Retornar envío actualizado
      return tx.envio.findUnique({
        where: { id },
        include: {
          origen: true,
          destino: true,
          usuario: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          items: {
            include: {
              insumo: true
            }
          }
        }
      });
    });
    
    return NextResponse.json(envioActualizado);
  } catch (error: any) {
    console.error('Error al procesar envío:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar envío' },
      { status: 500 }
    );
  }
}