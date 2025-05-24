// src/app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/server/services/auth/authService';
import prisma from '@/server/db/client';

export async function POST(req: NextRequest) {
  try {
    console.log('Procesando solicitud de refresh token');
    
    const body = await req.json();
    const { refreshToken, email } = body;
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token no proporcionado' },
        { status: 400 }
      );
    }
    
    // Usar email de respaldo si no se proporciona
    const emailToUse = email || 'gaston-mora@hotmail.com';
    
    const result = await authService.refreshUserToken(refreshToken, emailToUse);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Refresh token inválido o expirado' },
        { status: 401 }
      );
    }
    
    // 🔧 OBTENER USUARIO COMPLETO CON ROLE PARA CREAR TOKEN COMPATIBLE
    let userForToken = null;
    
    try {
      // Buscar usuario por email ya que result no tiene user
      if (emailToUse) {
        userForToken = await prisma.user.findUnique({
          where: { email: emailToUse },
          include: { 
            role: true,
            sucursal: true 
          }
        });
      }
    } catch (dbError) {
      console.error('Error al obtener usuario para token:', dbError);
    }
    
    // 🔧 CREAR TOKEN COMPATIBLE PARA EL FRONTEND
    if (userForToken) {
      const compatibleToken = Buffer.from(JSON.stringify({
        sub: userForToken.id,
        id: userForToken.id,
        email: userForToken.email,
        username: userForToken.email,
        roleId: userForToken.roleId,
        role: userForToken.role, // Ahora sí existe porque usamos include
        sucursalId: userForToken.sucursalId,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
      })).toString('base64');
      
      return NextResponse.json({
        accessToken: compatibleToken,
        refreshToken: result.refreshToken || refreshToken, // Fallback al original si no hay nuevo
        idToken: result.idToken || '',
        user: {
          ...userForToken,
          roleName: userForToken.role?.name
        }
      });
    }
    
    // 🔧 FALLBACK: Si no se puede obtener el usuario, usar tokens originales
    return NextResponse.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken || refreshToken,
      idToken: result.idToken || ''
    });
    
  } catch (error: any) {
    console.error('Error en refresh API:', error);
    return NextResponse.json(
      { error: error.message || 'Error en el servidor' },
      { status: 500 }
    );
  }
}