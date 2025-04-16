// src/app/(fabrica)/fabrica/recetas/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Book, ChevronLeft, ArrowRight, Loader2 } from 'lucide-react';

interface RecetaItem {
  id: string;
  insumoId: string;
  cantidad: number;
  insumo: {
    nombre: string;
    unidadMedida: string;
  };
}

interface Receta {
  id: string;
  nombre: string;
  descripcion: string | null;
  rendimiento: number;
  items: RecetaItem[];
  productoRecetas?: Array<{
    id: string;
    productoId: string;
    producto: {
      nombre: string;
    }
  }>;
}

export default function VisualizarRecetaPage({ params }: { params: { id: string } }) {
  const [receta, setReceta] = useState<Receta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Cargar receta
  useEffect(() => {
    const fetchReceta = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/admin/recetas/${params.id}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar la receta');
        }
        
        const data = await response.json();
        setReceta(data);
      } catch (err) {
        console.error('Error:', err);
        setError('No se pudo cargar la receta');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReceta();
  }, [params.id]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Cargando receta...</p>
        </div>
      </div>
    );
  }
  
  if (error || !receta) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-destructive font-medium">{error || 'Receta no encontrada'}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Volver
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-6 p-4 md:gap-8 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Book className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold tracking-tight">{receta.nombre}</h1>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-background border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Volver
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-lg border bg-card shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Detalles de la Receta</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Descripción</h3>
                <p className="mt-1">{receta.descripcion || 'Sin descripción disponible'}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Rendimiento</h3>
                <p className="mt-1">{receta.rendimiento} unidades producidas</p>
              </div>
              
              {receta.productoRecetas && receta.productoRecetas.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Productos asociados</h3>
                  <ul className="mt-1 list-disc list-inside">
                    {receta.productoRecetas.map(pr => (
                      <li key={pr.id}>{pr.producto.nombre}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          <div className="rounded-lg border bg-card shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Ingredientes</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Insumo
                    </th>
                    <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Unidad
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-card">
                  {receta.items.map(item => (
                    <tr key={item.id} className="hover:bg-muted/50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {item.insumo.nombre}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {item.cantidad}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {item.insumo.unidadMedida}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="rounded-lg border bg-card shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Acciones</h2>
            
            <div className="space-y-3">
              <Link 
                href={`/fabrica/produccion/nueva?recetaId=${receta.id}`}
                className="w-full flex items-center justify-between bg-green-50 hover:bg-green-100 p-4 rounded-lg transition-colors"
              >
                <span className="font-medium text-green-700">Iniciar Producción</span>
                <ArrowRight className="h-5 w-5 text-green-600" />
              </Link>
              
              <Link 
                href={`/fabrica/stock/solicitud?recetaId=${receta.id}`}
                className="w-full flex items-center justify-between bg-blue-50 hover:bg-blue-100 p-4 rounded-lg transition-colors"
              >
                <span className="font-medium text-blue-700">Solicitar Insumos</span>
                <ArrowRight className="h-5 w-5 text-blue-600" />
              </Link>
            </div>
          </div>
          
          <div className="rounded-lg border bg-card shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Información de producción</h2>
            
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Tiempo estimado de producción</h3>
                <p className="mt-1">2-3 horas</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Dificultad</h3>
                <p className="mt-1">Media</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Notas adicionales</h3>
                <p className="mt-1">Mantener en lugar fresco durante la preparación</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}