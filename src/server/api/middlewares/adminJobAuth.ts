// src/server/api/middlewares/adminJobAuth.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function adminJobAuthMiddleware(req: NextRequest) {
  try {
    // Obtener token de la cabecera
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token administrativo no proporcionado' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Verificar que es un JWT válido
      if (!token || token.split('.').length !== 3) {
        throw new Error('Formato de token inválido');
      }
      
      // Verificar el token usando la clave secreta
      const SECRET_KEY = process.env.JWT_SECRET || 'tu-clave-super-secreta-cambia-esto-en-produccion';
      const payload = jwt.verify(token, SECRET_KEY) as any;
      
      // Verificar que tiene rol de admin
      if (!payload.roleId || payload.roleId !== 'role-admin') {
        return NextResponse.json(
          { error: 'Token no tiene permisos de administrador' },
          { status: 403 }
        );
      }
      
      // Verificar que tiene permisos de comodín
      if (!payload.role || !payload.role.permissions || !payload.role.permissions.includes('*')) {
        return NextResponse.json(
          { error: 'Token no tiene permisos suficientes' },
          { status: 403 }
        );
      }
      
      console.log(`[ADMIN-JOB] Token válido para usuario: ${payload.name} (${payload.email})`);
      
      // Adjuntar usuario ficticio para el job
      (req as any).user = {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        roleId: payload.roleId,
        role: payload.role
      };
      
      return null; // Sin error, continuar
    } catch (tokenError) {
      console.error('Error al verificar token administrativo:', tokenError);
      return NextResponse.json(
        { error: 'Token administrativo inválido' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error general en middleware administrativo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}