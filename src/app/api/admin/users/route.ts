// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authService } from '@/server/services/auth/authService';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid'; // Necesitarás instalar uuid: npm install uuid @types/uuid
import { cognitoService } from '@/server/services/auth/cognitoService';

// Esquema de validación
const createUserSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
  roleId: z.string(),
  sucursalId: z.string().optional().nullable()
});

export async function GET(req: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true,
        sucursal: true
      }
    });
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

// src/app/api/admin/users/route.ts

export async function POST(req: NextRequest) {
    try {
      const body = await req.json();
      
      // Validar datos
      const validation = createUserSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Datos de entrada inválidos', details: validation.error.errors },
          { status: 400 }
        );
      }
      
      const { email, name, password, roleId, sucursalId } = validation.data;
      
      // Verificar si ya existe en BD
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        return NextResponse.json(
          { error: 'El correo electrónico ya está registrado en la base de datos' },
          { status: 400 }
        );
      }
      
      console.log("Iniciando creación de usuario en Cognito:", email);
      
      // Usar el método de registro simplificado
      try {
        // Registrar en Cognito primero
        const cognitoResult = await cognitoService.registerUser({
          email,
          name,
          password,
          roleId
        });
        
        if (!cognitoResult.success) {
          return NextResponse.json(
            { error: cognitoResult.message || 'Error al registrar en Cognito' },
            { status: 400 }
          );
        }
        
        console.log("Usuario registrado en Cognito exitosamente");
        
        // Luego crear en la BD local
        const newUser = await prisma.user.create({
          data: {
            id: cognitoResult.userId,
            email,
            name,
            roleId,
            sucursalId: sucursalId || null
          },
          include: {
            role: true,
            sucursal: true
          }
        });
        
        // Responder con el usuario creado y flag para confirmación
        return NextResponse.json({
          ...newUser,
          requiresConfirmation: true,
          message: 'Usuario creado correctamente. Verifique su correo electrónico para obtener el código.'
        }, { status: 201 });
      } catch (createError: any) {
        console.error("Error específico en creación:", createError);
        
        // Manejar error de usuario ya existente en Cognito
        if (createError.name === 'UsernameExistsException') {
          return NextResponse.json(
            { error: 'El correo electrónico ya está registrado en el sistema de autenticación' },
            { status: 409 }
          );
        }
        
        throw createError;
      }
    } catch (error: any) {
      console.error('Error general en POST /api/admin/users:', error);
      
      return NextResponse.json(
        { error: error.message || 'Error al crear usuario' },
        { status: 500 }
      );
    }
  }