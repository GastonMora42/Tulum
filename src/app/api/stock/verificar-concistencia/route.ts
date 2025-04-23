// src/app/api/stock/verificar-consistencia/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { stockService } from '@/server/services/stock/stockService';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    // Verificar inconsistencias
    const inconsistencias = await stockService.verificarConsistencia();
    
    return NextResponse.json({
      hayInconsistencias: inconsistencias.length > 0,
      inconsistencias
    });
  } catch (error: any) {
    console.error('Error al verificar inconsistencias:', error);
    return NextResponse.json(
      { error: error.message || 'Error al verificar inconsistencias' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Aplicar middleware de autenticación y autorización
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('stock:corregir')(req);
  if (permissionError) return permissionError;
  
  try {
    // Corregir inconsistencias
    const resultados = await stockService.corregirInconsistencias();
    
    return NextResponse.json(resultados);
  } catch (error: any) {
    console.error('Error al corregir inconsistencias:', error);
    return NextResponse.json(
      { error: error.message || 'Error al corregir inconsistencias' },
      { status: 500 }
    );
  }
}