// src/server/services/storage/s3Service.ts - Revisado con logs

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  
  constructor() {
    const region = process.env.AWS_REGION || '';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
    this.bucketName = process.env.S3_BUCKET_NAME || '';
    
    console.log(`Inicializando S3Service con región: ${region}, bucket: ${this.bucketName}`);
    console.log(`Credenciales disponibles: ${accessKeyId ? 'Sí' : 'No'}, ${secretAccessKey ? 'Sí' : 'No'}`);
    
    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
  }
  
  async generatePresignedUploadUrl(key: string, contentType: string): Promise<string> {
    console.log(`Generando URL de subida para: ${key}, tipo: ${contentType}`);
    
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType
      });
      
      const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      console.log(`URL generada exitosamente: ${url.substring(0, 50)}...`);
      return url;
    } catch (error) {
      console.error('Error al generar URL firmada:', error);
      throw error;
    }
  }
  
  async generatePresignedUrl(key: string): Promise<string> {
    console.log(`Generando URL de descarga para: ${key}`);
    
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      
      const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      console.log(`URL de descarga generada exitosamente`);
      return url;
    } catch (error) {
      console.error('Error al generar URL de descarga:', error);
      throw error;
    }
  }
}

export const s3Service = new S3Service();