import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkRole } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema de validación
const createUserSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
  roleId: z.string(),
  sucursalId: z.string().optional().nullable()
});

export async function GET(req: NextRequest) {
  // Para desarrollo, omitimos la verificación de autenticación
  // En producción, descomentar estas líneas
  // const authResponse = await authMiddleware(req);
  // if (authResponse) return authResponse;
  
  // const roleResponse = await checkRole(['admin'])(req);
  // if (roleResponse) return roleResponse;
  
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

export async function POST(req: NextRequest) {
  // Para desarrollo, omitimos la verificación de autenticación
  // En producción, descomentar estas líneas
  // const authResponse = await authMiddleware(req);
  // if (authResponse) return authResponse;
  
  // const roleResponse = await checkRole(['admin'])(req);
  // if (roleResponse) return roleResponse;
  
  try {
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { email, name, password, roleId, sucursalId } = validation.data;
    
    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'El correo electrónico ya está registrado' },
        { status: 400 }
      );
    }
    
    // En un entorno real, crearías el usuario en Cognito aquí
    // Simulamos eso para desarrollo
    
    // Crear usuario en la base de datos
    const newUser = await prisma.user.create({
      data: {
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
    
    // Eliminar campos sensibles
    const { ...userResponse } = newUser;
    
    return NextResponse.json(userResponse, { status: 201 });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    );
  }
}