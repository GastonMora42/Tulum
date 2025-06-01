// src/app/(admin)/admin/productos/[id]/page.tsx - VERSIÓN CORREGIDA
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Package, Save, Loader2, Upload, Trash, AlertCircle, RefreshCw } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCInput, HCLabel, HCSelect, HCTextarea } from '@/components/ui/HighContrastComponents';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { BarcodeGenerator } from '@/components/productos/BardcodeGenerator';

interface Categoria {
  id: string;
  nombre: string;
}

interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  codigoBarras: string | null;
  imagen: string | null;
  categoriaId: string;
  stockMinimo: number;
  activo: boolean;
  categoria: {
    id: string;
    nombre: string;
  };
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

export default function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
  // 🔧 CORRECCIÓN: Unwrap params usando React.use()
  const resolvedParams = use(params);
  const productId = resolvedParams.id;

  const [producto, setProducto] = useState<Producto | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isFormReady, setIsFormReady] = useState(false); // 🆕 Control de formulario
  
  const router = useRouter();

  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    reset,
    setValue // 🆕 Para establecer valores manualmente
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

  // 🔧 FUNCIÓN CORREGIDA - Cargar datos del producto
  const cargarProducto = async () => {
    try {
      setIsFetching(true);
      setError(null);
      
      console.log("🔍 Cargando producto con ID:", productId);
      
      const response = await authenticatedFetch(`/api/admin/productos/${productId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error en respuesta:", response.status, errorText);
        
        if (response.status === 404) {
          setError('Producto no encontrado');
          return;
        }
        
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      const productoData = await response.json();
      console.log("✅ Datos del producto recibidos:", productoData);
      
      setProducto(productoData);
      setImageUrl(productoData.imagen);
      
      // 🆕 ESTABLECER VALORES DEL FORMULARIO CORRECTAMENTE
      setValue('nombre', productoData.nombre || '');
      setValue('descripcion', productoData.descripcion || '');
      setValue('precio', Number(productoData.precio) || 0);
      setValue('codigoBarras', productoData.codigoBarras || '');
      setValue('categoriaId', productoData.categoriaId || '');
      setValue('stockMinimo', Number(productoData.stockMinimo) || 0);
      setValue('activo', productoData.activo !== false);
      
      setIsFormReady(true);
      console.log("📝 Formulario configurado con datos del producto");
      
    } catch (err) {
      console.error('❌ Error detallado al cargar producto:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar datos del producto');
    } finally {
      setIsFetching(false);
    }
  };

  // 🔧 FUNCIÓN CORREGIDA - Cargar categorías
  const cargarCategorias = async () => {
    try {
      console.log("📂 Cargando categorías...");
      
      const response = await authenticatedFetch('/api/admin/categorias');
      
      if (!response.ok) {
        throw new Error('Error al cargar categorías');
      }
      
      const categoriasData = await response.json();
      console.log("✅ Categorías cargadas:", categoriasData.length);
      
      setCategorias(categoriasData);
    } catch (err) {
      console.error('❌ Error al cargar categorías:', err);
      setError('Error al cargar categorías');
    }
  };

  // 🔧 EFECTO PRINCIPAL - Cargar datos al montar
  useEffect(() => {
    const cargarDatos = async () => {
      if (!productId) {
        setError('ID de producto no válido');
        setIsFetching(false);
        return;
      }

      console.log("🚀 Iniciando carga de datos para producto:", productId);
      
      try {
        // Cargar categorías y producto en paralelo
        await Promise.all([
          cargarCategorias(),
          cargarProducto()
        ]);
      } catch (err) {
        console.error('❌ Error al cargar datos:', err);
        setError('Error al cargar datos');
      }
    };

    cargarDatos();
  }, [productId]); // Solo depende del productId

  const onSubmit = async (data: ProductoFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("💾 Guardando producto con datos:", data);
      
      const productoData = {
        ...data,
        descripcion: data.descripcion || null,
        codigoBarras: data.codigoBarras || null,
        imagen: imageUrl || null
      };
      
      console.log("📤 Enviando datos actualizados:", productoData);
      
      const response = await authenticatedFetch(`/api/admin/productos/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productoData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error del servidor' }));
        throw new Error(errorData.error || 'Error al actualizar producto');
      }
      
      const updatedProducto = await response.json();
      console.log("✅ Producto actualizado:", updatedProducto);
      
      setProducto(updatedProducto);
      
      // Mostrar mensaje de éxito
      alert('Producto actualizado correctamente');
      
    } catch (err: any) {
      console.error('❌ Error al actualizar:', err);
      setError(err.message || 'Error al actualizar producto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Está seguro de que desea cambiar el estado de este producto? Esta acción puede afectar a ventas o envíos existentes.')) {
      return;
    }
    
    try {
      setIsDeleting(true);
      setError(null);
      
      const response = await authenticatedFetch(`/api/admin/productos/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ activo: !producto?.activo })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error del servidor' }));
        throw new Error(errorData.error || 'Error al cambiar estado del producto');
      }
      
      // Redireccionar a la lista de productos
      router.push('/admin/productos');
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al cambiar estado del producto');
    } finally {
      setIsDeleting(false);
    }
  };

  // 🔧 RENDERIZADO CONDICIONAL MEJORADO
  if (isFetching) {
    return (
      <ContrastEnhancer>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-black mb-2">Cargando producto...</h2>
            <p className="text-gray-600">Obteniendo datos del producto</p>
          </div>
        </div>
      </ContrastEnhancer>
    );
  }

  if (error) {
    return (
      <ContrastEnhancer>
        <div className="flex flex-col items-center justify-center h-64">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-black mb-2">Error</h2>
          <p className="text-red-600 mb-4 text-center">{error}</p>
          
          <div className="flex space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </button>
            
            <button
              onClick={() => router.push('/admin/productos')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Volver a productos
            </button>
          </div>
        </div>
      </ContrastEnhancer>
    );
  }

  if (!producto || !isFormReady) {
    return (
      <ContrastEnhancer>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-4" />
            <p className="text-gray-600">Preparando formulario...</p>
          </div>
        </div>
      </ContrastEnhancer>
    );
  }

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Package className="h-6 w-6 text-indigo-600 mr-2" />
            <h1 className="text-2xl font-bold text-black">Editar Producto</h1>
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
                <HCLabel htmlFor="categoriaId" className="block text-sm font-medium mb-1">
                  Categoría *
                </HCLabel>
                <HCSelect
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
                </HCSelect>
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
              <HCLabel htmlFor="descripcion" className="block text-sm font-medium mb-1">
                Descripción
              </HCLabel>
              <HCTextarea
                id="descripcion"
                rows={3}
                {...register('descripcion')}
                className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <HCLabel htmlFor="precio" className="block text-sm font-medium mb-1">
                  Precio *
                </HCLabel>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <HCInput
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
                <HCLabel className="block text-sm font-medium mb-1">
                  Imagen del Producto
                </HCLabel>
                <ImageUploader
                  type="product"
                  initialImage={producto?.imagen || null}
                  onImageUpload={(newImageUrl) => {
                    setImageUrl(newImageUrl);
                    console.log('🖼️ Nueva URL de imagen recibida:', newImageUrl);
                  }}
                />
              </div>

              <div>
                <HCLabel htmlFor="stockMinimo" className="block text-sm font-medium mb-1">
                  Stock Mínimo
                </HCLabel>
                <HCInput
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

            {producto?.codigoBarras && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Código de Barras</h3>
                <BarcodeGenerator 
                  value={producto.codigoBarras} 
                  productName={producto.nombre} 
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
              <label htmlFor="activo" className="ml-2 block text-sm text-black">
                Producto activo
              </label>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" /> 
                    Procesando...
                  </>
                ) : (
                  <>
                    <Trash className="h-4 w-4 mr-2" />
                    {producto?.activo ? 'Desactivar producto' : 'Activar producto'}
                  </>
                )}
              </button>
              
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" /> 
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ContrastEnhancer>
  );
}