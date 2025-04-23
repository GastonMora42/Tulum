// src/server/services/contingencia/contingenciaService.ts

import prisma from '@/server/db/client';
import { Contingencia } from '@prisma/client';

export class ContingenciaService {
async crearContingencia(datos: {
  titulo: string;
  descripcion: string;
  origen: string;
  produccionId?: string;
  envioId?: string;
  creadoPor: string;
}): Promise<Contingencia> {
  console.log('[ContingenciaService] Creando contingencia:', datos);
  
  // Validar que los IDs de relaciones existan si no son nulos o vacíos
  if (datos.envioId) {
    const envioExiste = await prisma.envio.findUnique({
      where: { id: datos.envioId }
    });
    
    if (!envioExiste) {
      console.error(`[ContingenciaService] Error: El envío con ID ${datos.envioId} no existe`);
      throw new Error(`El envío con ID ${datos.envioId} no existe`);
    }
  }
  
  if (datos.produccionId) {
    const produccionExiste = await prisma.production.findUnique({
      where: { id: datos.produccionId }
    });
    
    if (!produccionExiste) {
      console.error(`[ContingenciaService] Error: La producción con ID ${datos.produccionId} no existe`);
      throw new Error(`La producción con ID ${datos.produccionId} no existe`);
    }
  }
  
  // Para evitar errores de clave foránea, asegurarnos de que valores vacíos sean null
  const datosLimpios = {
    ...datos,
    envioId: datos.envioId || null,
    produccionId: datos.produccionId || null
  };
  
  // Crear la contingencia si las validaciones pasan
  return prisma.contingencia.create({
    data: {
      ...datosLimpios,
      estado: 'pendiente',
      fechaCreacion: new Date(),
      ajusteRealizado: false
    }
  });
}

  async listarContingencias(filtros?: {
    estado?: string;
    origen?: string;
    creadoPor?: string;
  }): Promise<Contingencia[]> {
    const where: any = {};

    if (filtros?.estado) {
      where.estado = filtros.estado;
    }

    if (filtros?.origen) {
      where.origen = filtros.origen;
    }

    if (filtros?.creadoPor) {
      where.creadoPor = filtros.creadoPor;
    }

    return prisma.contingencia.findMany({
      where,
      include: {
        usuario: true,
        produccion: true,
        envio: true
      },
      orderBy: {
        fechaCreacion: 'desc'
      }
    });
  }

  async obtenerContingencia(id: string): Promise<Contingencia | null> {
    return prisma.contingencia.findUnique({
      where: { id },
      include: {
        usuario: true,
        produccion: true,
        envio: true
      }
    });
  }

  async resolverContingencia(id: string, datos: {
    respuesta: string;
    resueltoPor: string;
    ajusteRealizado: boolean;
  }): Promise<Contingencia> {
    return prisma.contingencia.update({
      where: { id },
      data: {
        estado: 'resuelto',
        respuesta: datos.respuesta,
        resueltoPor: datos.resueltoPor,
        fechaRespuesta: new Date(),
        ajusteRealizado: datos.ajusteRealizado
      }
    });
  }

  async rechazarContingencia(id: string, datos: {
    respuesta: string;
    resueltoPor: string;
  }): Promise<Contingencia> {
    return prisma.contingencia.update({
      where: { id },
      data: {
        estado: 'rechazado',
        respuesta: datos.respuesta,
        resueltoPor: datos.resueltoPor,
        fechaRespuesta: new Date()
      }
    });
  }

  async enRevisionContingencia(id: string, resueltoPor: string): Promise<Contingencia> {
    return prisma.contingencia.update({
      where: { id },
      data: {
        estado: 'en_revision',
        resueltoPor: resueltoPor
      }
    });
  }
}

export const contingenciaService = new ContingenciaService();