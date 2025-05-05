'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Package, Save, Loader2, Upload, Trash, AlertCircle } from 'lucide-react';
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

export default function EditarProductoPage({ params }: { params: { id: string } }) {
  const [producto, setProducto] = useState<Producto | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const router = useRouter();
  const [previewUrl, setPreviewUrl] = useState<string | null>(producto?.imagen || null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

const { 
  register, 
  handleSubmit, 
  formState: { errors },
  reset
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


// Cargar producto y categorías
useEffect(() => {
  const fetchData = async () => {
    try {
      setIsFetching(true);
      console.log("Cargando producto con ID:", params.id);
      
      // Cargar producto
      const productoResponse = await authenticatedFetch(`/api/admin/productos/${params.id}`);
      if (!productoResponse.ok) {
        console.error("Error en respuesta:", await productoResponse.text());
        throw new Error('Error al cargar producto');
      }
      const productoData = await productoResponse.json();
      console.log("Datos del producto recibidos:", productoData);
      setProducto(productoData);
      
      // Establecer previsualización de imagen
      if (productoData.imagen) {
        console.log("Estableciendo imagen previa:", productoData.imagen);
        setPreviewUrl(productoData.imagen);
        setImageUrl(productoData.imagen);
      }
      
      // Cargar categorías
      const categoriasResponse = await authenticatedFetch('/api/admin/categorias');
      if (!categoriasResponse.ok) {
        throw new Error('Error al cargar categorías');
      }
      const categoriasData = await categoriasResponse.json();
      setCategorias(categoriasData);
      
      // Establecer valores del formulario con datos explícitos
      reset({
        nombre: productoData.nombre || '',
        descripcion: productoData.descripcion || '',
        precio: typeof productoData.precio === 'number' ? productoData.precio : 0,
        codigoBarras: productoData.codigoBarras || '',
        categoriaId: productoData.categoriaId || '',
        stockMinimo: typeof productoData.stockMinimo === 'number' ? productoData.stockMinimo : 0,
        activo: productoData.activo === false ? false : true
      });
      
      console.log("Formulario resetado con datos:", productoData);
    } catch (err) {
      console.error('Error detallado:', err);
      setError('Error al cargar datos del producto');
    } finally {
      setIsFetching(false);
    }
  };

  fetchData();
}, [params.id, reset]);

  // Manejar carga de imagen
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      
      // Crear URL para vista previa
      const previewURL = URL.createObjectURL(file);
      setImagePreview(previewURL);
    }
  };

  // Subir imagen a servidor (simulado)
  const uploadImage = async (file: File): Promise<string> => {
    // En un entorno real, aquí subiríamos la imagen a un servidor o S3
    // Para este ejemplo, simularemos que la imagen se subió correctamente
    
    // Simulamos un retraso de red
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // En un caso real, el servidor devolvería la URL de la imagen
    // Aquí simplemente usamos la URL de vista previa como simulación
    return imagePreview || '';
  };

  const onSubmit = async (data: ProductoFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      let imagenUrl = producto?.imagen || '';
      
      // Si hay una nueva imagen, subirla primero
      if (imageFile) {
        imagenUrl = await uploadImage(imageFile);
      }
      
      // Actualizar el producto con la URL de la imagen
      const productoData = {
        ...data,
        imagen: imagenUrl || undefined
      };
      
      const response = await authenticatedFetch(`/api/admin/productos/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify(productoData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar producto');
      }
      
      // Actualizar datos locales
      const updatedProducto = await response.json();
      setProducto(updatedProducto);
      
      // Mostrar mensaje de éxito
      alert('Producto actualizado correctamente');
    } catch (err: any) {
      console.error('Error:', err);
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
      
      const response = await authenticatedFetch(`/api/admin/productos/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: !producto?.activo })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
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

  if (isFetching) {
    return (
      <ContrastEnhancer>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <span className="ml-2 text-black">Cargando producto...</span>
        </div>
      </ContrastEnhancer>
    );
  }

  if (!producto && !isFetching) {
    return (
      <ContrastEnhancer>
        <div className="flex flex-col items-center justify-center h-64">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-black mb-2">Producto no encontrado</h2>
          <p className="text-black mb-4">El producto que estás buscando no existe o ha sido eliminado.</p>
          <button
            onClick={() => router.push('/admin/productos')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver a productos
          </button>
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
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}

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
  onImageUpload={(imageUrl) => {
    setImageUrl(imageUrl);
  }}
/>
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