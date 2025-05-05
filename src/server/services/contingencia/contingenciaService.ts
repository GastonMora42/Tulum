// src/server/services/contingencia/contingenciaService.ts
import prisma from '@/server/db/client';
import { Contingencia } from '@prisma/client';
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

export class ContingenciaService {
  private s3Client: S3Client;
  private bucketName: string;
  
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });
    this.bucketName = process.env.S3_BUCKET_NAME || 'tulum-app';
  }
  
  async crearContingencia(datos: {
    titulo: string;
    descripcion: string;
    origen: string;
    produccionId?: string;
    envioId?: string;
    creadoPor: string;
    imagenUrl?: string; // URL de la imagen
    urgente?: boolean; // Indicador de urgencia
    tipo?: string; // Categoría de contingencia
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
    
    // Calcular fecha de expiración para imágenes (30 días)
    let imagenExpiraEn = null;
    if (datos.imagenUrl) {
      const fechaExpiracion = new Date();
      fechaExpiracion.setDate(fechaExpiracion.getDate() + 30);
      imagenExpiraEn = fechaExpiracion;
    }
    
    // Para evitar errores de clave foránea, asegurarnos de que valores vacíos sean null
    const datosLimpios = {
      ...datos,
      envioId: datos.envioId || null,
      produccionId: datos.produccionId || null,
      tipo: datos.tipo || null,
      urgente: datos.urgente || false
    };
    
    // Crear la contingencia si las validaciones pasan
    return prisma.contingencia.create({
      data: {
        ...datosLimpios,
        imagenUrl: datos.imagenUrl || null,
        imagenExpiraEn,
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
    tipo?: string;
    urgente?: boolean;
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
    
    if (filtros?.tipo) {
      where.tipo = filtros.tipo;
    }
    
    if (filtros?.urgente !== undefined) {
      where.urgente = filtros.urgente;
    }

    return prisma.contingencia.findMany({
      where,
      include: {
        usuario: true,
        produccion: true,
        envio: true
      },
      orderBy: [
        { urgente: 'desc' }, // Contingencias urgentes primero
        { fechaCreacion: 'desc' } // Luego por fecha
      ]
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
    imagenUrl?: string; // Imagen adicional para la resolución
  }): Promise<Contingencia> {
    return prisma.contingencia.update({
      where: { id },
      data: {
        estado: 'resuelto',
        respuesta: datos.respuesta,
        resueltoPor: datos.resueltoPor,
        fechaRespuesta: new Date(),
        ajusteRealizado: datos.ajusteRealizado,
        // Si se proporciona una imagen nueva en la resolución
        ...(datos.imagenUrl ? {
          imagenUrl: datos.imagenUrl,
          imagenExpiraEn: (() => {
            const fechaExpiracion = new Date();
            fechaExpiracion.setDate(fechaExpiracion.getDate() + 30);
            return fechaExpiracion;
          })()
        } : {})
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
  
  // Métodos para manejo de imágenes
  
  async eliminarImagenContingencia(id: string): Promise<Contingencia> {
    // Obtener la contingencia para verificar si tiene imagen
    const contingencia = await prisma.contingencia.findUnique({
      where: { id }
    });
    
    if (!contingencia || !contingencia.imagenUrl) {
      throw new Error('Contingencia no tiene imagen o no existe');
    }
    
    try {
      // Extraer la clave del objeto desde la URL
      const url = new URL(contingencia.imagenUrl);
      const key = url.pathname.substring(1); // Eliminar la barra inicial
      
      // Eliminar de S3
      const deleteParams = {
        Bucket: this.bucketName,
        Key: key
      };
      
      await this.s3Client.send(new DeleteObjectCommand(deleteParams));
      
      // Actualizar contingencia
      return prisma.contingencia.update({
        where: { id },
        data: {
          imagenUrl: null,
          imagenExpiraEn: null
        }
      });
    } catch (error) {
      console.error(`Error al eliminar imagen de contingencia ${id}:`, error);
      throw new Error('Error al eliminar imagen de contingencia');
    }
  }
  
  async actualizarImagenContingencia(id: string, imagenUrl: string): Promise<Contingencia> {
    // Calcular nueva fecha de expiración
    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + 30);
    
    // Actualizar la contingencia con la nueva imagen
    return prisma.contingencia.update({
      where: { id },
      data: {
        imagenUrl,
        imagenExpiraEn: fechaExpiracion
      }
    });
  }
  
  // Método para limpiar imágenes expiradas
  async limpiarImagenesExpiradas(): Promise<{
    eliminadas: number;
    errores: number;
  }> {
    // Buscar contingencias con imágenes expiradas
    const ahora = new Date();
    const contingenciasExpiradas = await prisma.contingencia.findMany({
      where: {
        imagenUrl: { not: null },
        imagenExpiraEn: { lt: ahora }
      }
    });
    
    console.log(`[ContingenciaService] Encontradas ${contingenciasExpiradas.length} imágenes expiradas`);
    
    let eliminadas = 0;
    let errores = 0;
    
    for (const contingencia of contingenciasExpiradas) {
      try {
        if (!contingencia.imagenUrl) continue;
        
        // Extraer la clave del objeto desde la URL
        const url = new URL(contingencia.imagenUrl);
        const key = url.pathname.substring(1);
        
        // Eliminar de S3
        const deleteParams = {
          Bucket: this.bucketName,
          Key: key
        };
        
        await this.s3Client.send(new DeleteObjectCommand(deleteParams));
        
        // Actualizar contingencia
        await prisma.contingencia.update({
          where: { id: contingencia.id },
          data: {
            imagenUrl: null,
            imagenExpiraEn: null
          }
        });
        
        eliminadas++;
      } catch (error) {
        console.error(`Error al limpiar imagen de contingencia ${contingencia.id}:`, error);
        errores++;
      }
    }
    
    return { eliminadas, errores };
  }
}

export const contingenciaService = new ContingenciaService();