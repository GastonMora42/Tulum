// src/server/jobs/cleanExpiredImages.ts
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import prisma from '@/server/db/client';

export async function cleanExpiredContingencyImages() {
  console.log('Iniciando limpieza de imágenes de contingencias expiradas');
  
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
  });
  
  const bucketName = process.env.S3_BUCKET_NAME || 'tulum-app';
  
  try {
    // Buscar contingencias con imágenes expiradas
    const expiredContingencias = await prisma.contingencia.findMany({
      where: {
        imagenUrl: { not: null },
        imagenExpiraEn: { lt: new Date() }
      }
    });
    
    console.log(`Se encontraron ${expiredContingencias.length} imágenes para eliminar`);
    
    let deletedCount = 0;
    
    for (const contingencia of expiredContingencias) {
      if (!contingencia.imagenUrl) continue;
      
      try {
        // Extraer la clave del objeto desde la URL
        const urlParts = contingencia.imagenUrl.split('/');
        const key = urlParts[urlParts.length - 2] + '/' + urlParts[urlParts.length - 1];
        
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
            imagenExpiraEn: null
          }
        });
        
        deletedCount++;
      } catch (error) {
        console.error(`Error al eliminar imagen para contingencia ${contingencia.id}:`, error);
      }
    }
    
    console.log(`Se eliminaron ${deletedCount} imágenes expiradas`);
    return { success: true, deletedCount };
  } catch (error) {
    console.error('Error en limpieza de imágenes:', error);
    return { success: false, error };
  }
}