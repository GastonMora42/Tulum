// src/server/jobs/cleanExpiredMediaFiles.ts
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import prisma from '@/server/db/client';

export async function cleanExpiredMediaFiles() {
  console.log('Iniciando limpieza de archivos multimedia expirados');
  
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
  });
  
  const bucketName = process.env.S3_BUCKET_NAME || 'tulum-app';
  
  try {
    // Buscar contingencias con archivos expirados
    const expiredContingencias = await prisma.contingencia.findMany({
        where: {
          OR: [
            {
              imagenUrl: { not: null },
              imagenExpiraEn: { lt: new Date() }
            },
            {
              videoUrl: { not: null },
              imagenExpiraEn: { lt: new Date() }
            }
          ]
        }
      });
    
    console.log(`Se encontraron ${expiredContingencias.length} archivos para eliminar`);
    
    let deletedCount = 0;
    
    for (const contingencia of expiredContingencias) {
      try {
        // Determinar qué archivo eliminar
        let fileUrl = contingencia.imagenUrl || contingencia.videoUrl;
        if (!fileUrl) continue;
        
        // Extraer la clave del objeto desde la URL
        const urlObj = new URL(fileUrl);
        const key = urlObj.pathname.substring(1); // Eliminar la barra inicial
        
        // Eliminar de S3
        const deleteParams = {
          Bucket: bucketName,
          Key: key
        };
        
        await s3Client.send(new DeleteObjectCommand(deleteParams));
        
        // Actualizar la contingencia para remover la referencia
        await prisma.contingencia.update({
          where: { id: contingencia.id },
          data: {
            imagenUrl: null,
            videoUrl: null,
            mediaType: null,
            mediaExpiraEn: null
          }
        });
        
        deletedCount++;
      } catch (error) {
        console.error(`Error al eliminar archivo para contingencia ${contingencia.id}:`, error);
      }
    }
    
    console.log(`Se eliminaron ${deletedCount} archivos expirados`);
    return { success: true, deletedCount };
  } catch (error) {
    console.error('Error en limpieza de archivos:', error);
    return { success: false, error };
  }
}