// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/server/services/auth/authService';

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
    
    // Verificar token con servicio de autenticación
    try {
      // Obtener payload del token
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub;
      
      // Obtener usuario de nuestra BD
      const user = await authService.getUserById(userId);
      if (!user) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 401 }
        );
      }
      
      // Retornar información del usuario
      return NextResponse.json({ user });
      
    } catch (error) {
      console.error('Error al verificar token:', error);
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