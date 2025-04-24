// src/app/(fabrica)/fabrica/recetas/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/hooks/useAuth';
import { Book, Info, ChevronRight, Search, Filter, Loader2 } from 'lucide-react';

interface Receta {
  id: string;
  nombre: string;
  descripcion: string | null;
  rendimiento: number;
  items?: Array<{
    id: string;
    insumoId: string;
    cantidad: number;
    insumo: {
      nombre: string;
      unidadMedida: string;
    }
  }>;
  productoRecetas?: Array<{
    id: string;
    productoId: string;
    producto: {
      nombre: string;
    }
  }>;
}

export default function RecetasPage() {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchRecetas = async () => {
      try {
        setIsLoading(true);
        
        // Obtener recetas de la API
        const response = await authenticatedFetch('/api/admin/recetas');
        
        if (!response.ok) {
          throw new Error('Error al cargar recetas');
        }
        
        const data = await response.json();
        setRecetas(data.data || []);
      } catch (err) {
        console.error('Error al cargar recetas:', err);
        setError('No se pudieron cargar las recetas');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecetas();
  }, []);

  // Filtrar recetas por término de búsqueda
  const filteredRecetas = recetas.filter(receta => 
    receta.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (receta.descripcion && receta.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center">
          <Book className="mr-2 h-6 w-6 text-green-600" />
          Catálogo de Recetas
        </h1>
        
        {/* Barra de búsqueda */}
        <div className="flex items-center bg-white rounded-lg shadow px-3 py-2 w-64">
          <Search className="h-5 w-5 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Buscar recetas..."
            className="w-full focus:outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Contenido principal */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
          <span className="ml-2 text-gray-500">Cargando recetas...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-green-600 text-white rounded-md"
          >
            Reintentar
          </button>
        </div>
      ) : filteredRecetas.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow">
          <Book className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron recetas</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm 
              ? `No hay resultados para "${searchTerm}"`
              : "No hay recetas disponibles en el sistema."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecetas.map((receta) => (
            <Link 
              key={receta.id} 
              href={`/fabrica/recetas/${receta.id}`}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden flex flex-col"
            >
              <div className="p-6 flex-grow">
                <div className="flex justify-between items-start">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">{receta.nombre}</h2>
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {receta.rendimiento} und.
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {receta.descripcion || "Sin descripción disponible"}
                </p>
                
                <div className="text-xs text-gray-500 mt-2">
                  {receta.items && (
                    <p>{receta.items.length} ingredientes necesarios</p>
                  )}
                  
                  {receta.productoRecetas && receta.productoRecetas.length > 0 && (
                    <p className="mt-1">
                      Producto: {receta.productoRecetas[0].producto.nombre}
                      {receta.productoRecetas.length > 1 && ` +${receta.productoRecetas.length - 1} más`}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="px-6 py-3 bg-gray-50 flex justify-between items-center">
                <div className="flex items-center text-green-600 text-sm font-medium">
                  <Info className="h-4 w-4 mr-1" />
                  Ver detalles
                </div>
                <ChevronRight className="h-4 w-4 text-green-600" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}