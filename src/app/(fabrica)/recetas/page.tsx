// src/app/(fabrica)/fabrica/recetas/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Receta {
  id: string;
  nombre: string;
  descripcion: string | null;
  rendimiento: number;
}

export default function RecetasPage() {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchRecetas = async () => {
      try {
        setIsLoading(true);
        
        // En producción, llamaríamos a una API real
        // Por ahora, simulamos datos
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const mockRecetas: Receta[] = [
          {
            id: '1',
            nombre: 'Aceite esencial de lavanda',
            descripcion: 'Aceite esencial de lavanda concentrado al 100%',
            rendimiento: 10
          },
          {
            id: '2',
            nombre: 'Vela aromática de vainilla',
            descripcion: 'Vela con aroma de vainilla y cera de soja',
            rendimiento: 5
          },
          {
            id: '3',
            nombre: 'Difusor de bambú',
            descripcion: 'Difusor con aceites esenciales y bambú natural',
            rendimiento: 8
          }
        ];
        
        setRecetas(mockRecetas);
      } catch (err) {
        console.error('Error al cargar recetas:', err);
        setError('No se pudieron cargar las recetas');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecetas();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestión de Recetas</h1>
        <Link 
          href="/fabrica/recetas/nueva"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Nueva Receta
        </Link>
      </div>

      {/* Lista de recetas */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {isLoading ? (
          <div className="text-center py-10">
            <p className="text-lg">Cargando recetas...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {recetas.map((receta) => (
              <div key={receta.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-lg">{receta.nombre}</h3>
                <p className="text-gray-600 text-sm mt-1">{receta.descripcion}</p>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-sm text-gray-500">Rendimiento: {receta.rendimiento}</span>
                  <div>
                    <Link 
                      href={`/fabrica/recetas/${receta.id}`}
                      className="text-indigo-600 hover:text-indigo-900 mr-3 text-sm"
                    >
                      Ver
                    </Link>
                    <Link 
                      href={`/fabrica/produccion/nueva?recetaId=${receta.id}`}
                      className="text-green-600 hover:text-green-900 text-sm"
                    >
                      Producir
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}