// src/server/services/contingencia/contingenciaService.ts - VERSIÓN COMPLETA ACTUALIZADA
import prisma from '@/server/db/client';
import { Contingencia, User, Ubicacion, Conciliacion, Production, Envio } from '@prisma/client';
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Tipos extendidos con relaciones
export type ContingenciaCompleta = Contingencia & {
  usuario: User;
  ubicacion?: Ubicacion | null;
  conciliacion?: Conciliacion | null;
  produccion?: Production | null;
  envio?: Envio | null;
};

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
    ubicacionId?: string; 
    conciliacionId?: string;  
    imagenUrl?: string;
    videoUrl?: string;
    mediaType?: 'image' | 'video';
    urgente?: boolean;
    tipo?: string;
  }): Promise<ContingenciaCompleta> {
    console.log('[ContingenciaService] Creando contingencia:', {
      ...datos,
      descripcion: datos.descripcion?.substring(0, 30) + '...'
    });
    
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

    if (datos.ubicacionId) {
      const ubicacionExiste = await prisma.ubicacion.findUnique({
        where: { id: datos.ubicacionId }
      });
      
      if (!ubicacionExiste) {
        throw new Error(`La ubicación con ID ${datos.ubicacionId} no existe`);
      }
    }
    
    // Validar si la conciliación existe cuando se proporciona
    if (datos.conciliacionId) {
      const conciliacionExiste = await prisma.conciliacion.findUnique({
        where: { id: datos.conciliacionId }
      });
      
      if (!conciliacionExiste) {
        throw new Error(`La conciliación con ID ${datos.conciliacionId} no existe`);
      }
    }
    
    // Configurar fechas de expiración para archivos multimedia
    let mediaExpiraEn = null;
    if (datos.imagenUrl || datos.videoUrl) {
      const fechaExpiracion = new Date();
      fechaExpiracion.setDate(fechaExpiracion.getDate() + 30);
      mediaExpiraEn = fechaExpiracion;
      console.log(`[ContingenciaService] Archivos multimedia expirarán en: ${mediaExpiraEn}`);
    }
    
    // Crear la contingencia con datos limpios
    try {
      const contingencia = await prisma.contingencia.create({
        data: {
          titulo: datos.titulo,
          descripcion: datos.descripcion,
          origen: datos.origen,
          produccionId: datos.produccionId || null,
          envioId: datos.envioId || null,
          tipo: datos.tipo || null,
          urgente: datos.urgente || false,
          ubicacionId: datos.ubicacionId || null,
          conciliacionId: datos.conciliacionId || null,
          imagenUrl: datos.imagenUrl || null,
          videoUrl: datos.videoUrl || null,
          mediaType: datos.mediaType || null,
          mediaExpiraEn: mediaExpiraEn,
          estado: 'pendiente',
          fechaCreacion: new Date(),
          creadoPor: datos.creadoPor,
          ajusteRealizado: false
        },
        include: {
          usuario: true,
          ubicacion: true,
          conciliacion: true,
          produccion: true,
          envio: true
        }
      });
      
      console.log(`[ContingenciaService] Contingencia creada con ID: ${contingencia.id}`);
      return contingencia;
    } catch (error) {
      console.error('[ContingenciaService] Error al crear contingencia:', error);
      throw error;
    }
  }

  async listarContingencias(filtros?: {
    estado?: string;
    origen?: string;
    creadoPor?: string;
    ubicacionId?: string;
    conciliacionId?: string;
    tipo?: string;
    urgente?: string | boolean;
    search?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<ContingenciaCompleta[]> {
    const where: any = {};

    if (filtros?.estado) {
      where.estado = filtros.estado;
    }

    if (filtros?.origen) {
      where.origen = filtros.origen;
    }

    if (filtros?.ubicacionId) {
      where.ubicacionId = filtros.ubicacionId;
    }
    
    if (filtros?.conciliacionId) {
      where.conciliacionId = filtros.conciliacionId;
    }

    if (filtros?.creadoPor) {
      where.creadoPor = filtros.creadoPor;
    }
    
    if (filtros?.tipo) {
      where.tipo = filtros.tipo;
    }
    
    // Manejar filtro de urgente (puede venir como string o boolean)
    if (filtros?.urgente !== undefined) {
      if (typeof filtros.urgente === 'string') {
        where.urgente = filtros.urgente === 'true';
      } else {
        where.urgente = filtros.urgente;
      }
    }

    // Filtro de búsqueda por texto
    if (filtros?.search) {
      where.OR = [
        { titulo: { contains: filtros.search, mode: 'insensitive' } },
        { descripcion: { contains: filtros.search, mode: 'insensitive' } }
      ];
    }

    // Filtros de fecha
    if (filtros?.fechaDesde || filtros?.fechaHasta) {
      where.fechaCreacion = {};
      
      if (filtros.fechaDesde) {
        where.fechaCreacion.gte = new Date(filtros.fechaDesde);
      }
      
      if (filtros.fechaHasta) {
        const fechaHasta = new Date(filtros.fechaHasta);
        fechaHasta.setHours(23, 59, 59, 999); // Final del día
        where.fechaCreacion.lte = fechaHasta;
      }
    }

    return prisma.contingencia.findMany({
      where,
      include: {
        usuario: true,
        produccion: true,
        envio: true,
        ubicacion: true,
        conciliacion: true
      },
      orderBy: [
        { urgente: 'desc' }, // Contingencias urgentes primero
        { fechaCreacion: 'desc' } // Luego por fecha
      ]
    });
  }

  async obtenerContingencia(id: string): Promise<ContingenciaCompleta | null> {
    return prisma.contingencia.findUnique({
      where: { id },
      include: {
        usuario: true,
        produccion: true,
        envio: true,
        ubicacion: true,
        conciliacion: true
      }
    });
  }

  async enRevisionContingencia(id: string, resueltoPor: string): Promise<ContingenciaCompleta> {
    return prisma.contingencia.update({
      where: { id },
      data: {
        estado: 'en_revision',
        resueltoPor: resueltoPor
      },
      include: {
        usuario: true,
        produccion: true,
        envio: true,
        ubicacion: true,
        conciliacion: true
      }
    });
  }

  // NUEVOS MÉTODOS PARA ACCIONES EN LOTE

  async marcarUrgente(id: string, urgente: boolean): Promise<ContingenciaCompleta> {
    return prisma.contingencia.update({
      where: { id },
      data: { urgente },
      include: {
        usuario: true,
        produccion: true,
        envio: true,
        ubicacion: true,
        conciliacion: true
      }
    });
  }

  async asignarResponsable(id: string, responsableId: string): Promise<ContingenciaCompleta> {
    // Verificar que el responsable existe
    const responsable = await prisma.user.findUnique({
      where: { id: responsableId }
    });

    if (!responsable) {
      throw new Error('El responsable especificado no existe');
    }

    return prisma.contingencia.update({
      where: { id },
      data: { 
        resueltoPor: responsableId,
        estado: 'en_revision' // Cambiar estado a en revisión cuando se asigna
      },
      include: {
        usuario: true,
        produccion: true,
        envio: true,
        ubicacion: true,
        conciliacion: true
      }
    });
  }

  async archivarContingencia(id: string, usuarioId: string): Promise<ContingenciaCompleta> {
    return prisma.contingencia.update({
      where: { id },
      data: { 
        estado: 'archivado',
        resueltoPor: usuarioId,
        fechaRespuesta: new Date(),
        respuesta: 'Contingencia archivada'
      },
      include: {
        usuario: true,
        produccion: true,
        envio: true,
        ubicacion: true,
        conciliacion: true
      }
    });
  }

  // MÉTODOS PARA MANEJO DE ARCHIVOS MULTIMEDIA

  async eliminarArchivoMultimedia(id: string): Promise<ContingenciaCompleta> {
    // Obtener la contingencia para verificar qué tipo de archivo tiene
    const contingencia = await prisma.contingencia.findUnique({
      where: { id }
    });
    
    if (!contingencia) {
      throw new Error('Contingencia no existe');
    }
    
    // Determinar qué archivo eliminar
    let key = '';
    let url = '';
    
    if (contingencia.imagenUrl) {
      url = contingencia.imagenUrl;
    } else if (contingencia.videoUrl) {
      url = contingencia.videoUrl;
    } else {
      // No hay archivo para eliminar, devolver contingencia actual
      return this.obtenerContingencia(id) as Promise<ContingenciaCompleta>;
    }
    
    try {
      if (url) {
        // Extraer la clave del objeto desde la URL
        const urlObj = new URL(url);
        key = urlObj.pathname.substring(1); // Eliminar la barra inicial
        
        // Eliminar de S3
        const deleteParams = {
          Bucket: this.bucketName,
          Key: key
        };
        
        await this.s3Client.send(new DeleteObjectCommand(deleteParams));
        console.log(`Archivo ${key} eliminado de S3`);
      }
      
      // Actualizar contingencia
      return prisma.contingencia.update({
        where: { id },
        data: {
          imagenUrl: null,
          videoUrl: null,
          mediaType: null,
          mediaExpiraEn: null
        },
        include: {
          usuario: true,
          produccion: true,
          envio: true,
          ubicacion: true,
          conciliacion: true
        }
      });
    } catch (error) {
      console.error(`Error al eliminar archivo multimedia de contingencia ${id}:`, error);
      throw new Error('Error al eliminar archivo multimedia');
    }
  }

  async actualizarArchivoMultimedia(id: string, mediaUrl: string, mediaType: 'image' | 'video'): Promise<ContingenciaCompleta> {
    // Calcular nueva fecha de expiración
    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + 30);
    
    // Preparar datos según el tipo de archivo
    const updateData: any = {
      mediaType,
      mediaExpiraEn: fechaExpiracion
    };

    if (mediaType === 'image') {
      updateData.imagenUrl = mediaUrl;
      updateData.videoUrl = null;
    } else {
      updateData.videoUrl = mediaUrl;
      updateData.imagenUrl = null;
    }
    
    // Actualizar la contingencia
    return prisma.contingencia.update({
      where: { id },
      data: updateData,
      include: {
        usuario: true,
        produccion: true,
        envio: true,
        ubicacion: true,
        conciliacion: true
      }
    });
  }

  // MÉTODOS PARA RESOLVER/RECHAZAR CONTINGENCIAS

  async resolverContingencia(id: string, datos: {
    respuesta: string;
    resueltoPor: string;
    ajusteRealizado: boolean;
    eliminarArchivos?: boolean;
  }): Promise<ContingenciaCompleta> {
    const { eliminarArchivos = true } = datos;
    
    try {
      // Si se debe eliminar los archivos
      if (eliminarArchivos) {
        try {
          await this.eliminarArchivoMultimedia(id);
        } catch (error) {
          console.error(`Error al eliminar archivos de contingencia ${id}:`, error);
          // Continuar con la resolución aunque falle la eliminación
        }
      }
      
      // Actualizar la contingencia
      return prisma.contingencia.update({
        where: { id },
        data: {
          estado: 'resuelto',
          respuesta: datos.respuesta,
          resueltoPor: datos.resueltoPor,
          fechaRespuesta: new Date(),
          ajusteRealizado: datos.ajusteRealizado,
          // Si eliminarArchivos=true, limpiar campos multimedia
          ...(eliminarArchivos ? {
            imagenUrl: null,
            videoUrl: null,
            mediaType: null,
            mediaExpiraEn: null
          } : {})
        },
        include: {
          usuario: true,
          produccion: true,
          envio: true,
          ubicacion: true,
          conciliacion: true
        }
      });
    } catch (error) {
      console.error(`Error al resolver contingencia ${id}:`, error);
      throw error;
    }
  }

  async rechazarContingencia(id: string, datos: {
    respuesta: string;
    resueltoPor: string;
    eliminarArchivos?: boolean;
  }): Promise<ContingenciaCompleta> {
    const { eliminarArchivos = true } = datos;
    
    try {
      // Si se debe eliminar los archivos
      if (eliminarArchivos) {
        try {
          await this.eliminarArchivoMultimedia(id);
        } catch (error) {
          console.error(`Error al eliminar archivos de contingencia ${id}:`, error);
        }
      }
      
      // Actualizar la contingencia
      return prisma.contingencia.update({
        where: { id },
        data: {
          estado: 'rechazado',
          respuesta: datos.respuesta,
          resueltoPor: datos.resueltoPor,
          fechaRespuesta: new Date(),
          ...(eliminarArchivos ? {
            imagenUrl: null,
            videoUrl: null,
            mediaType: null,
            mediaExpiraEn: null
          } : {})
        },
        include: {
          usuario: true,
          produccion: true,
          envio: true,
          ubicacion: true,
          conciliacion: true
        }
      });
    } catch (error) {
      console.error(`Error al rechazar contingencia ${id}:`, error);
      throw error;
    }
  }

  // MÉTODOS DE MANTENIMIENTO

  async limpiarArchivosExpirados(): Promise<{
    eliminadas: number;
    errores: number;
  }> {
    // Buscar contingencias con archivos multimedia expirados
    const ahora = new Date();
    const contingenciasExpiradas = await prisma.contingencia.findMany({
      where: {
        OR: [
          { imagenUrl: { not: null } },
          { videoUrl: { not: null } }
        ],
        mediaExpiraEn: { lt: ahora }
      }
    });
    
    console.log(`[ContingenciaService] Encontradas ${contingenciasExpiradas.length} contingencias con archivos expirados`);
    
    let eliminadas = 0;
    let errores = 0;
    
    for (const contingencia of contingenciasExpiradas) {
      try {
        let url = contingencia.imagenUrl || contingencia.videoUrl;
        if (!url) continue;
        
        // Extraer la clave del objeto desde la URL
        const urlObj = new URL(url);
        const key = urlObj.pathname.substring(1);
        
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
            videoUrl: null,
            mediaType: null,
            mediaExpiraEn: null
          }
        });
        
        eliminadas++;
        console.log(`[ContingenciaService] Archivo ${key} eliminado de contingencia ${contingencia.id}`);
      } catch (error) {
        console.error(`Error al limpiar archivo de contingencia ${contingencia.id}:`, error);
        errores++;
      }
    }
    
    return { eliminadas, errores };
  }

  // MÉTODOS DE ESTADÍSTICAS

  async obtenerEstadisticas(filtros?: {
    fechaDesde?: Date;
    fechaHasta?: Date;
    origen?: string;
    ubicacionId?: string;
  }): Promise<{
    total: number;
    porEstado: Record<string, number>;
    porOrigen: Record<string, number>;
    porTipo: Record<string, number>;
    urgentes: number;
    promedioResolucion: number; // en horas
  }> {
    const where: any = {};
    
    if (filtros?.origen) {
      where.origen = filtros.origen;
    }
    
    if (filtros?.ubicacionId) {
      where.ubicacionId = filtros.ubicacionId;
    }
    
    if (filtros?.fechaDesde || filtros?.fechaHasta) {
      where.fechaCreacion = {};
      if (filtros.fechaDesde) {
        where.fechaCreacion.gte = filtros.fechaDesde;
      }
      if (filtros.fechaHasta) {
        where.fechaCreacion.lte = filtros.fechaHasta;
      }
    }
    
    const contingencias = await prisma.contingencia.findMany({
      where
    });
    
    const stats = {
      total: contingencias.length,
      porEstado: {} as Record<string, number>,
      porOrigen: {} as Record<string, number>,
      porTipo: {} as Record<string, number>,
      urgentes: 0,
      promedioResolucion: 0
    };
    
    let tiempoResolucionTotal = 0;
    let resueltas = 0;
    
    contingencias.forEach(c => {
      // Contar por estado
      stats.porEstado[c.estado] = (stats.porEstado[c.estado] || 0) + 1;
      
      // Contar por origen
      stats.porOrigen[c.origen] = (stats.porOrigen[c.origen] || 0) + 1;
      
      // Contar por tipo
      const tipo = c.tipo || 'sin_tipo';
      stats.porTipo[tipo] = (stats.porTipo[tipo] || 0) + 1;
      
      // Contar urgentes
      if (c.urgente) {
        stats.urgentes++;
      }
      
      // Calcular tiempo de resolución
      if (c.fechaRespuesta && (c.estado === 'resuelto' || c.estado === 'rechazado')) {
        const tiempoResolucion = c.fechaRespuesta.getTime() - c.fechaCreacion.getTime();
        tiempoResolucionTotal += tiempoResolucion;
        resueltas++;
      }
    });
    
    // Calcular promedio de resolución en horas
    if (resueltas > 0) {
      stats.promedioResolucion = Math.round(tiempoResolucionTotal / resueltas / (1000 * 60 * 60));
    }
    
    return stats;
  }

  // MÉTODOS PARA EXPORTACIÓN

  async exportarContingencias(filtros?: any): Promise<ContingenciaCompleta[]> {
    return this.listarContingencias(filtros);
  }
}

export const contingenciaService = new ContingenciaService();