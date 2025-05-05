// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { v4 as uuidv4 } from 'uuid';
import { s3Service } from '@/server/services/storage/s3Service';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  // Verificar autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'product' o 'contingency'
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }
    
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
    
    // Obtener URL firmada para subida
    const uploadUrl = await s3Service.generatePresignedUploadUrl(filename, contentType);
    
    // Subir imagen procesada a S3
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: processedImage,
      headers: {
        'Content-Type': contentType
      }
    });
    
    if (!uploadResponse.ok) {
      throw new Error('Error al subir imagen a S3');
    }
    
    // Construir URL pública
    const publicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${filename}`;
    
    // Para contingencias, guardar la fecha de expiración (30 días)
    if (type === 'contingency') {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);
      
      // En un caso real, aquí guardaríamos esta información en la base de datos
      console.log(`La imagen ${filename} expirará el ${expirationDate.toISOString()}`);
    }
    
    return NextResponse.json({
      success: true,
      imageUrl: publicUrl
    });
  } catch (error: any) {
    console.error('Error al procesar imagen:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar imagen' },
      { status: 500 }
    );
  }
}