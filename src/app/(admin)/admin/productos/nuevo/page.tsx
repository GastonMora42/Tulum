// src/app/(admin)/admin/productos/nuevo/page.tsx - VERSIÓN CORREGIDA
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Package, Save, Loader2, Upload } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCInput, HCLabel } from '@/components/ui/HighContrastComponents';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { BarcodeGenerator } from '@/components/productos/BardcodeGenerator';

interface Categoria {
  id: string;
  nombre: string;
}

// Esquema de validación
const productoSchema = z.object({
    nombre: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres' }),
    descripcion: z.string().nullable(),
    precio: z.number().positive({ message: 'El precio debe ser positivo' }),
    codigoBarras: z.string().nullable(),
    categoriaId: z.string().min(1, { message: 'Debe seleccionar una categoría' }),
    stockMinimo: z.number().int().nonnegative({ message: 'El stock mínimo debe ser un número positivo o cero' }),
    activo: z.boolean()
});  

type ProductoFormData = z.infer<typeof productoSchema>;

export default function NuevoProductoPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCategorias, setIsFetchingCategorias] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const router = useRouter();

  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    reset,
    watch
  } = useForm<ProductoFormData>({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      precio: 0,
      codigoBarras: '',
      categoriaId: '',
      stockMinimo: 0,
      activo: true
    }
  });

  // Watch para el código de barras para mostrar preview
  const codigoBarras = watch('codigoBarras');
  const nombre = watch('nombre');

  // Cargar categorías
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        setIsFetchingCategorias(true);
        setError(null);
        
        console.log('🏷️ Cargando categorías...');
        
        const response = await authenticatedFetch('/api/admin/categorias');
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Error en respuesta de categorías:', response.status, errorText);
          throw new Error(`Error ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('✅ Categorías cargadas:', data.length);
        setCategorias(data);
      } catch (err) {
        console.error('❌ Error al cargar categorías:', err);
        setError('No se pudieron cargar las categorías');
      } finally {
        setIsFetchingCategorias(false);
      }
    };

    fetchCategorias();
  }, []);

  const onSubmit = async (data: ProductoFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 🔧 CORREGIR: Preparar datos correctamente
      const productoData = {
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        precio: Number(data.precio),
        codigoBarras: data.codigoBarras || null,
        categoriaId: data.categoriaId,
        stockMinimo: Number(data.stockMinimo),
        activo: data.activo,
        imagen: imageUrl || null
      };
      
      console.log('💾 Enviando datos para nuevo producto:', productoData);
      
      // 🔧 CORREGIR: Añadir headers explícitamente
      const response = await authenticatedFetch('/api/admin/productos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productoData)
      });
      
      console.log('📡 Respuesta del servidor:', response.status, response.statusText);
      
      if (!response.ok) {
        let errorMessage = 'Error al crear producto';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('❌ Error del servidor:', errorData);
        } catch (parseError) {
          // Si no se puede parsear el JSON, obtener el texto
          const errorText = await response.text();
          console.error('❌ Respuesta no JSON:', errorText);
          errorMessage = `Error ${response.status}: Respuesta inválida del servidor`;
        }
        
        throw new Error(errorMessage);
      }
      
      const nuevoProducto = await response.json();
      console.log('✅ Producto creado exitosamente:', nuevoProducto);
      
      // Mostrar mensaje de éxito
      alert('Producto creado correctamente');
      
      // Redireccionar a la lista de productos
      router.push('/admin/productos');
    } catch (err: any) {
      console.error('❌ Error completo:', err);
      setError(err.message || 'Error al crear producto');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Package className="h-6 w-6 text-indigo-600 mr-2" />
            <h1 className="text-2xl font-bold text-black">Nuevo Producto</h1>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-black bg-white hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Volver
          </button>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
              <strong>Error:</strong> {error}
              <button 
                onClick={() => setError(null)}
                className="ml-2 text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          )}

          {isFetchingCategorias ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <span className="ml-2 text-black">Cargando datos...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <HCLabel htmlFor="nombre" className="block text-sm font-medium mb-1">
                    Nombre *
                  </HCLabel>
                  <HCInput
                    id="nombre"
                    type="text"
                    {...register('nombre')}
                    className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  {errors.nombre && (
                    <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="categoriaId" className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría *
                  </label>
                  <select
                    id="categoriaId"
                    {...register('categoriaId')}
                    className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Seleccionar categoría</option>
                    {categorias.map(categoria => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.categoriaId && (
                    <p className="mt-1 text-sm text-red-600">{errors.categoriaId.message}</p>
                  )}
                  <div className="mt-1 text-xs text-gray-500">
                    <Link 
                      href="/admin/categorias/nueva"
                      className="text-indigo-600 hover:text-indigo-500"
                    >
                      + Crear nueva categoría
                    </Link>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  id="descripcion"
                  rows={3}
                  {...register('descripcion')}
                  className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="precio" className="block text-sm font-medium text-gray-700 mb-1">
                    Precio *
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      id="precio"
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('precio', { valueAsNumber: true })}
                      className="block w-full pl-7 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  {errors.precio && (
                    <p className="mt-1 text-sm text-red-600">{errors.precio.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="codigoBarras" className="block text-sm font-medium text-gray-700 mb-1">
                    Código de Barras
                  </label>
                  <input
                    id="codigoBarras"
                    type="text"
                    {...register('codigoBarras')}
                    className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="stockMinimo" className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Mínimo
                  </label>
                  <input
                    id="stockMinimo"
                    type="number"
                    min="0"
                    step="1"
                    {...register('stockMinimo', { valueAsNumber: true })}
                    className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  {errors.stockMinimo && (
                    <p className="mt-1 text-sm text-red-600">{errors.stockMinimo.message}</p>
                  )}
                </div>
              </div>

              <div>
                <HCLabel className="block text-sm font-medium mb-1">
                  Imagen del Producto
                </HCLabel>
                <ImageUploader
                  type="product"
                  initialImage={null}
                  onImageUpload={(newImageUrl) => {
                    setImageUrl(newImageUrl);
                    console.log('🖼️ Nueva URL de imagen recibida:', newImageUrl);
                  }}
                />
              </div>

              {/* 🆕 Preview del código de barras si existe */}
              {codigoBarras && codigoBarras.trim() && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-lg font-medium">Vista Previa del Código de Barras</h3>
                  <BarcodeGenerator 
                    value={codigoBarras.trim()} 
                    productName={nombre || 'Nuevo Producto'} 
                  />
                </div>
              )}

              <div className="flex items-center">
                <input
                  id="activo"
                  type="checkbox"
                  {...register('activo')}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="activo" className="ml-2 block text-sm text-gray-700">
                  Producto activo
                </label>
              </div>

              <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-2" /> 
                        Creando producto...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar producto
                      </>
                    )}
                  </button>
                </div>
            </form>
          )}
        </div>
      </div>
    </ContrastEnhancer>
  );
}