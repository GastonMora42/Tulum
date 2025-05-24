// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';

export async function GET(req: NextRequest) {
  try {
    // Obtener token de la cabecera
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token no proporcionado' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      let userId: string;
      let userEmail: string;
      
      // 🔧 MANEJAR DIFERENTES TIPOS DE TOKENS (igual que el middleware)
      if (token.includes('.') && token.split('.').length === 3) {
        // Es un JWT
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub || payload.id || payload.username;
        userEmail = payload.email;
      } else {
        // Es un token simple (Base64)
        const payload = JSON.parse(atob(token));
        userId = payload.sub || payload.id;
        userEmail = payload.email;
      }
      
      if (!userId) {
        return NextResponse.json(
          { error: 'Token inválido - sin ID de usuario' },
          { status: 401 }
        );
      }
      
      // Buscar usuario en la base de datos
      let user = await prisma.user.findUnique({
        where: { id: userId },
        include: { 
          role: true,
          sucursal: true 
        }
      });
      
      // Si no se encuentra por ID, buscar por email como fallback
      if (!user && userEmail) {
        user = await prisma.user.findUnique({
          where: { email: userEmail },
          include: { 
            role: true,
            sucursal: true 
          }
        });
      }
      
      if (!user) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 401 }
        );
      }
      
      // Retornar información del usuario
      return NextResponse.json({ 
        user: {
          ...user,
          roleName: user.role?.name
        }
      });
      
    } catch (tokenError) {
      console.error('Error al verificar token en /api/auth/me:', tokenError);
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error en ruta /api/auth/me:', error);
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    );
  }
}