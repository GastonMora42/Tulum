// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) {
    return authResponse;
  }
  
  // Si llegamos aquí, el usuario está autenticado
  const user = (req as any).user;
  
  return NextResponse.json({ user });
}