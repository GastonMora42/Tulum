// src/app/(admin)/admin/usuarios/confirmar/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ConfirmarUsuarioPage() {
  const [codigo, setCodigo] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Obtener el email de los parámetros de búsqueda
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !codigo) {
      setError('Email y código de confirmación son requeridos');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const response = await fetch('/api/auth/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          code: codigo
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al confirmar el usuario');
      }
      
      setSuccess('Usuario confirmado correctamente');
      
      // Redireccionar a la lista de usuarios después de un éxito
      setTimeout(() => {
        router.push('/admin/usuarios');
      }, 2000);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al confirmar el usuario');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Confirmar Usuario</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4">
          <p className="text-gray-700 mb-2">
            El usuario ha sido creado. Para activarlo, ingrese el código de verificación que se envió a:
          </p>
          <p className="font-semibold text-indigo-600">{email}</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="codigo">
              Código de Verificación
            </label>
            <input
              id="codigo"
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Ingrese el código"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-indigo-300"
            >
              {isSubmitting ? 'Confirmando...' : 'Confirmar'}
            </button>
            
            <Link
              href="/admin/usuarios"
              className="inline-block align-baseline font-bold text-sm text-indigo-600 hover:text-indigo-800"
            >
              Volver a Usuarios
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}