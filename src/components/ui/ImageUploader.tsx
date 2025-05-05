// src/components/ui/ImageUploader.tsx
'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image, Loader } from 'lucide-react';

interface ImageUploaderProps {
  onImageUpload: (imageUrl: string) => void;
  type: 'product' | 'contingency';
  initialImage?: string;
  className?: string;
}

export function ImageUploader({ onImageUpload, type, initialImage, className = '' }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Verificar tamaño y tipo
    if (file.size > 5 * 1024 * 1024) { // 5MB
      setError('El archivo es demasiado grande. Máximo 5MB.');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten archivos de imagen.');
      return;
    }
    
    setError(null);
    setIsUploading(true);
    
    try {
      // Crear vista previa
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Subir archivo
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al subir imagen');
      }
      
      const data = await response.json();
      onImageUpload(data.imageUrl);
    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message || 'Error al subir imagen');
      if (!initialImage) {
        setPreviewUrl(null);
      }
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onImageUpload('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {error && (
        <div className="w-full mb-2 p-2 bg-red-100 border border-red-400 text-red-700 text-sm rounded">
          {error}
        </div>
      )}
      
      {previewUrl ? (
        <div className="relative w-40 h-40 mb-2">
          <img 
            src={previewUrl} 
            alt="Vista previa" 
            className="w-full h-full object-cover rounded-lg shadow"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center mb-2">
          <Image className="w-10 h-10 text-gray-400" />
          <span className="mt-2 text-sm text-gray-500">
            {isUploading ? 'Subiendo...' : 'Sin imagen'}
          </span>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="image-upload"
      />
      
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="mt-2 inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm leading-4 font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
      >
        {isUploading ? (
          <>
            <Loader className="animate-spin h-4 w-4 mr-2" />
            Subiendo...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            {previewUrl ? 'Cambiar imagen' : 'Subir imagen'}
          </>
        )}
      </button>
    </div>
  );
}