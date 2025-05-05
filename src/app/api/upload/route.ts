// src/app/api/upload/route.ts - Versión corregida

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { v4 as uuidv4 } from 'uuid';
import { s3Service } from '@/server/services/storage/s3Service';
import sharp from 'sharp';

export async function POST(req: NextRequest) {

  // Al inicio de la función POST
console.log("[API] Iniciando upload de imagen");

// Después de procesar la imagen
console.log("[API] Imagen procesada correctamente");

// Antes de llamar a S3
console.log("[API] Intentando generar URL firmada de S3");

  // Verificar autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    // Usar FormData para obtener el archivo
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;
    
    if (!file) {
      console.error('No se proporcionó archivo');
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }
    
    if (!type || (type !== 'product' && type !== 'contingency')) {
      console.error('Tipo de archivo inválido:', type);
      return NextResponse.json(
        { error: 'Tipo de archivo inválido' },
        { status: 400 }
      );
    }
    
    console.log(`Procesando imagen de tipo ${type}, tamaño: ${file.size} bytes`);
    
    // Leer el archivo como buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // Procesar imagen según el tipo
    let processedImage;
    let contentType;
    let folder;
    
    if (type === 'product') {
      // Para productos: mejor calidad, formato webp
      processedImage = await sharp(fileBuffer)
        .resize({ width: 800, height: 800, fit: 'inside' })
        .webp({ quality: 80 })
        .toBuffer();
      contentType = 'image/webp';
      folder = 'productos';
    } else {
      // Para contingencias: compresión mayor, jpeg
      processedImage = await sharp(fileBuffer)
        .resize({ width: 600, height: 600, fit: 'inside' })
        .jpeg({ quality: 70 })
        .toBuffer();
      contentType = 'image/jpeg';
      folder = 'contingencias';
    }
    
    // Generar nombre único para archivo
    const filename = `${folder}/${uuidv4()}.${type === 'product' ? 'webp' : 'jpg'}`;
    console.log(`Nombre de archivo generado: ${filename}`);
    
    // Generar URL firmada de S3 para subida
    const uploadUrl = await s3Service.generatePresignedUploadUrl(filename, contentType);
    console.log(`URL de subida generada: ${uploadUrl.substring(0, 60)}...`);
    
    // Subir imagen procesada a S3
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: processedImage,
      headers: {
        'Content-Type': contentType
      }
    });
    
    if (!uploadResponse.ok) {
      console.error('Error al subir a S3:', uploadResponse.status, await uploadResponse.text());
      throw new Error('Error al subir imagen a S3');
    }
    
    // Construir URL pública
    const bucketName = process.env.S3_BUCKET_NAME || 'tulum-app';
    const region = process.env.AWS_REGION || 'us-east-1';
    const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${filename}`;
    console.log(`URL pública generada: ${publicUrl}`);
    
    // Para contingencias, guardar la fecha de expiración (30 días)
    if (type === 'contingency') {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);
      
      // En un caso real, aquí guardaríamos esta información en la base de datos
      console.log(`La imagen ${filename} expirará el ${expirationDate.toISOString()}`);
    }
    
    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      message: 'Imagen subida correctamente'
    });
  } catch (error: any) {
    console.error('Error al procesar imagen:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar imagen' },
      { status: 500 }
    );
  }
}