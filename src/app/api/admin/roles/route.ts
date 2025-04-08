import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';

export async function GET(req: NextRequest) {
  try {
    const roles = await prisma.role.findMany();
    return NextResponse.json(roles);
  } catch (error) {
    console.error('Error al obtener roles:', error);
    return NextResponse.json(
      { error: 'Error al obtener roles' },
      { status: 500 }
    );
  }
}