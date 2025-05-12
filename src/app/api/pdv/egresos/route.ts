// src/app/api/pdv/egresos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

// GET - Listar egresos
export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission(['venta:crear', 'admin'])(req);
  if (permissionError) return permissionError;
  
  try {
    const { searchParams } = new URL(req.url);
    const cierreCajaId = searchParams.get('cierreCajaId');
    const sucursalId = searchParams.get('sucursalId');
    
    const where: any = {};
    
    if (cierreCajaId) {
      where.cierreCajaId = cierreCajaId;
    } else if (sucursalId) {
      // Si no se proporciona un cierreCajaId específico, pero sí un sucursalId,
      // buscamos la caja abierta actual para esa sucursal
      const cierreCaja = await prisma.cierreCaja.findFirst({
        where: {
          sucursalId,
          estado: 'abierto'
        }
      });
      
      if (!cierreCaja) {
        return NextResponse.json([]);
      }
      
      where.cierreCajaId = cierreCaja.id;
    }
    
    const egresos = await prisma.cajaEgreso.findMany({
      where,
      include: {
        usuario: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      }
    });
    
// src/app/api/pdv/egresos/route.ts (continuación)
return NextResponse.json(egresos);
} catch (error: any) {
  console.error('Error al obtener egresos:', error);
  return NextResponse.json(
    { error: error.message || 'Error al obtener egresos' },
    { status: 500 }
  );
}
}

// POST - Registrar nuevo egreso
export async function POST(req: NextRequest) {
const authError = await authMiddleware(req);
if (authError) return authError;

const permissionError = await checkPermission(['venta:crear', 'admin'])(req);
if (permissionError) return permissionError;

try {
  const body = await req.json();
  const { sucursalId, monto, motivo, detalles } = body;
  
  if (!sucursalId || !monto || !motivo) {
    return NextResponse.json(
      { error: 'Faltan datos requeridos (sucursalId, monto, motivo)' },
      { status: 400 }
    );
  }
  
  if (monto <= 0) {
    return NextResponse.json(
      { error: 'El monto debe ser mayor que cero' },
      { status: 400 }
    );
  }
  
  // Obtener usuario desde la request
  const user = (req as any).user;
  
  // Verificar que existe una caja abierta para la sucursal
  const cierreCaja = await prisma.cierreCaja.findFirst({
    where: {
      sucursalId,
      estado: 'abierto'
    }
  });
  
  if (!cierreCaja) {
    return NextResponse.json(
      { error: 'No hay una caja abierta para esta sucursal' },
      { status: 400 }
    );
  }
  
  // Registrar el egreso
  const egreso = await prisma.cajaEgreso.create({
    data: {
      cierreCajaId: cierreCaja.id,
      monto,
      motivo,
      detalles: detalles || '',
      usuarioId: user.id
    },
    include: {
      usuario: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
  
  return NextResponse.json(egreso, { status: 201 });
} catch (error: any) {
  console.error('Error al registrar egreso:', error);
  return NextResponse.json(
    { error: error.message || 'Error al registrar egreso' },
    { status: 500 }
  );
}
}