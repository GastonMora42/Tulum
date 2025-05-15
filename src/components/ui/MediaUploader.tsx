// src/components/ui/MediaUploader.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Video, Loader, Play } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';

interface MediaUploaderProps {
  onMediaUpload: (mediaUrl: string, mediaType: 'image' | 'video') => void;
  type: 'product' | 'contingency';
  initialMedia?: { url: string, type: 'image' | 'video' } | null;
  maxVideoLength?: number; // en segundos
  className?: string;
}

export function MediaUploader({ 
  onMediaUpload, 
  type, 
  initialMedia = null, 
  maxVideoLength = 20, // 20 segundos por defecto
  className = '' 
}: MediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>(initialMedia?.type || 'image');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Establecer media inicial cuando el componente se monta
  useEffect(() => {
    if (initialMedia?.url) {
      setPreviewUrl(initialMedia.url);
      setMediaType(initialMedia.type);
    }
  }, [initialMedia]);
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validar tamaño (5MB para imágenes, 20MB para videos)
    const maxSize = mediaType === 'image' ? 5 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`El archivo es demasiado grande. Máximo ${maxSize / (1024 * 1024)}MB.`);
      return;
    }
    
    // Validar tipo
    if (file.type.startsWith('image/')) {
      setMediaType('image');
    } else if (file.type.startsWith('video/')) {
      setMediaType('video');
      
      // Validar duración del video
      try {
        const videoElement = document.createElement('video');
        videoElement.preload = 'metadata';
        
        await new Promise((resolve, reject) => {
          videoElement.onloadedmetadata = resolve;
          videoElement.onerror = reject;
          videoElement.src = URL.createObjectURL(file);
        });
        
        if (videoElement.duration > maxVideoLength) {
          setError(`El video no debe exceder ${maxVideoLength} segundos.`);
          return;
        }
      } catch (error) {
        console.error('Error validando duración del video:', error);
      }
    } else {
      setError('Solo se permiten archivos de imagen o video.');
      return;
    }
    
    setError(null);
    setIsUploading(true);
    
    try {
      // Crear vista previa local
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Subir archivo
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      formData.append('mediaType', mediaType);
      
      console.log(`Enviando ${mediaType} tipo: ${type}`);
      
      const response = await authenticatedFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al subir ${mediaType}`);
      }
      
      const data = await response.json();
      console.log('Respuesta de carga:', data);
      
      if (data.success && data.mediaUrl) {
        onMediaUpload(data.mediaUrl, mediaType);
        console.log(`URL de ${mediaType} devuelta:`, data.mediaUrl);
      } else {
        throw new Error('Respuesta incompleta del servidor');
      }
    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message || `Error al subir ${mediaType}`);
      if (!initialMedia) {
        setPreviewUrl(null);
      }
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleRemoveMedia = () => {
    setPreviewUrl(null);
    onMediaUpload('', mediaType); // Enviar string vacío para indicar eliminación
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="flex space-x-2 mb-2">
        <button
          type="button"
          onClick={() => setMediaType('image')}
          className={`px-3 py-1 rounded-md ${mediaType === 'image' 
            ? 'bg-indigo-600 text-white' 
            : 'bg-gray-200 text-gray-700'}`}
        >
          <ImageIcon className="h-4 w-4 inline mr-1" />
          Imagen
        </button>
        <button
          type="button"
          onClick={() => setMediaType('video')}
          className={`px-3 py-1 rounded-md ${mediaType === 'video' 
            ? 'bg-indigo-600 text-white' 
            : 'bg-gray-200 text-gray-700'}`}
        >
          <Video className="h-4 w-4 inline mr-1" />
          Video
        </button>
      </div>
      
      {error && (
        <div className="w-full mb-2 p-2 bg-red-100 border border-red-400 text-red-700 text-sm rounded">
          {error}
        </div>
      )}
      
      {previewUrl ? (
        <div className="relative w-56 mb-2">
          {mediaType === 'image' ? (
            <img 
              src={previewUrl} 
              alt="Vista previa" 
              className="w-full object-cover rounded-lg shadow"
            />
          ) : (
            <div className="relative">
              <video 
                ref={videoRef}
                src={previewUrl}
                className="w-full rounded-lg shadow"
                controls
              />
            </div>
          )}
          <button
            type="button"
            onClick={handleRemoveMedia}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="w-56 h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center mb-2">
          {mediaType === 'image' ? (
            <ImageIcon className="w-10 h-10 text-gray-400" />
          ) : (
            <Video className="w-10 h-10 text-gray-400" />
          )}
          <span className="mt-2 text-sm text-gray-500">
            {isUploading ? `Subiendo ${mediaType === 'image' ? 'imagen' : 'video'}...` : `Sin ${mediaType === 'image' ? 'imagen' : 'video'}`}
          </span>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept={mediaType === 'image' ? "image/*" : "video/*"}
        onChange={handleFileSelect}
        className="hidden"
        id="media-upload"
      />
      
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="mt-2 inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm leading-4 font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
      >
        {isUploading ? (
          <>
            <Loader className="animate-spin h-4 w-4 mr-2" />
            {`Subiendo ${mediaType === 'image' ? 'imagen' : 'video'}...`}
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            {previewUrl ? `Cambiar ${mediaType === 'image' ? 'imagen' : 'video'}` : `Subir ${mediaType === 'image' ? 'imagen' : 'video'}`}
          </>
        )}
      </button>
      
      {mediaType === 'video' && (
        <p className="text-xs text-gray-500 mt-1">
          *Los videos no deben exceder {maxVideoLength} segundos
        </p>
      )}
    </div>
  );
}