// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { v4 as uuidv4 } from 'uuid';
import { s3Service } from '@/server/services/storage/s3Service';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  console.log("[API] Iniciando upload de archivo multimedia");

  // Verificar autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    // Usar FormData para obtener el archivo
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;
    const mediaType = formData.get('mediaType') as 'image' | 'video' | null;
    
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
    
    console.log(`Procesando ${mediaType || 'archivo'} de tipo ${type}, tamaño: ${file.size} bytes`);
    
    // Definir la carpeta de destino según el tipo de contenido
    let folder = type === 'product' ? 'productos' : 'contingencias';
    let contentType = file.type;
    let processedData: Buffer;
    
    // Leer el archivo como buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    if (file.type.startsWith('image/')) {
      // Para imágenes: procesar con sharp
      if (type === 'product') {
        // Para productos: mejor calidad, formato webp
        processedData = await sharp(fileBuffer)
          .resize({ width: 800, height: 800, fit: 'inside' })
          .webp({ quality: 80 })
          .toBuffer();
        contentType = 'image/webp';
        folder = 'productos';
      } else {
        // Para contingencias: compresión mayor, jpeg
        processedData = await sharp(fileBuffer)
          .resize({ width: 600, height: 600, fit: 'inside' })
          .jpeg({ quality: 70 })
          .toBuffer();
        contentType = 'image/jpeg';
        folder = 'contingencias/imagenes';
      }
    } else if (file.type.startsWith('video/')) {
      // Para videos: guardar sin procesar
      processedData = fileBuffer;
      folder = 'contingencias/videos';
    } else {
      return NextResponse.json(
        { error: 'Tipo de archivo no soportado' },
        { status: 400 }
      );
    }
    
    // Generar nombre único para archivo
    const extension = file.type.startsWith('image/') 
      ? (type === 'product' ? 'webp' : 'jpg')
      : file.name.split('.').pop() || 'mp4';
    
    const filename = `${folder}/${uuidv4()}.${extension}`;
    console.log(`Nombre de archivo generado: ${filename}`);
    
    // Generar URL firmada de S3 para subida
    const uploadUrl = await s3Service.generatePresignedUploadUrl(filename, contentType);
    console.log(`URL de subida generada: ${uploadUrl.substring(0, 60)}...`);
    
    // Subir archivo procesado a S3
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: processedData,
      headers: {
        'Content-Type': contentType
      }
    });
    
    if (!uploadResponse.ok) {
      console.error('Error al subir a S3:', uploadResponse.status, await uploadResponse.text());
      throw new Error('Error al subir archivo a S3');
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
      console.log(`El archivo ${filename} expirará el ${expirationDate.toISOString()}`);
    }
    
    return NextResponse.json({
      success: true,
      mediaUrl: publicUrl,
      mediaType: file.type.startsWith('image/') ? 'image' : 'video',
      message: 'Archivo subido correctamente'
    });
  } catch (error: any) {
    console.error('Error al procesar archivo:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar archivo' },
      { status: 500 }
    );
  }
}