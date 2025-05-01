// src/app/(fabrica)/fabrica/contingencias/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useAuthStore } from '@/stores/authStore';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCTable, HCTh, HCTd } from '@/components/ui/HighContrastComponents';

interface Contingencia {
  id: string;
  titulo: string;
  descripcion: string;
  origen: string;
  estado: string;
  fechaCreacion: string;
  produccionId?: string;
  envioId?: string;
}

export default function ContingenciasFabricaPage() {
  const [contingencias, setContingencias] = useState<Contingencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchContingencias = async () => {
      try {
        setIsLoading(true);
        
        // Obtener contingencias con origen 'fabrica'
        const response = await authenticatedFetch(`/api/contingencias?origen=fabrica`);
        
        if (!response.ok) {
          throw new Error('Error al cargar contingencias');
        }
        
        const data = await response.json();
        console.log("Contingencias cargadas:", data.length);
        setContingencias(data);
      } catch (err) {
        console.error('Error:', err);
        setError('No se pudieron cargar las contingencias');
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchContingencias();
  }, []);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-black';
      case 'en_revision':
        return 'bg-blue-100 text-black';
      case 'resuelto':
        return 'bg-green-100 text-black';
      case 'rechazado':
        return 'bg-red-100 text-black';
      default:
        return 'bg-gray-100 text-black';
    }
  };

  const formatDate = (dateString: string) => {
    try {
        return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
      } catch (e) {
        return dateString;
      }
    };
  
    return (
      <ContrastEnhancer>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-black">Contingencias de Fábrica</h1>
            <Link 
              href="/fabrica/contingencias/nueva" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Reportar Contingencia
            </Link>
          </div>
    
          {/* Lista de contingencias */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {isLoading ? (
              <div className="text-center py-10">
                <p className="text-lg text-black">Cargando contingencias...</p>
              </div>
            ) : error ? (
              <div className="text-center py-10">
                <p className="text-red-500">{error}</p>
              </div>
            ) : contingencias.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-lg text-black">No hay contingencias que mostrar</p>
              </div>
            ) : (
              <HCTable>
                <thead>
                  <tr>
                    <HCTh>Título</HCTh>
                    <HCTh>Estado</HCTh>
                    <HCTh>Fecha</HCTh>
                    <HCTh>Relacionado</HCTh>
                    <HCTh>Ver</HCTh>
                  </tr>
                </thead>
                <tbody>
                  {contingencias.map((contingencia) => (
                    <tr key={contingencia.id}>
                      <HCTd>{contingencia.titulo}</HCTd>
                      <HCTd>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadge(contingencia.estado)}`}>
                          {contingencia.estado === 'pendiente' ? 'Pendiente' : 
                           contingencia.estado === 'en_revision' ? 'En revisión' : 
                           contingencia.estado === 'resuelto' ? 'Resuelto' : 'Rechazado'}
                        </span>
                      </HCTd>
                      <HCTd>{formatDate(contingencia.fechaCreacion)}</HCTd>
                      <HCTd>
                        {contingencia.produccionId ? (
                          <Link href={`/fabrica/produccion/${contingencia.produccionId}`} className="text-purple-600 hover:text-purple-900">
                            Producción
                          </Link>
                        ) : contingencia.envioId ? (
                          <Link href={`/fabrica/envios/${contingencia.envioId}`} className="text-purple-600 hover:text-purple-900">
                            Envío
                          </Link>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </HCTd>
                      <HCTd>
                        <Link 
                          href={`/fabrica/contingencias/${contingencia.id}`}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Ver detalles
                        </Link>
                      </HCTd>
                    </tr>
                  ))}
                </tbody>
              </HCTable>
            )}
          </div>
        </div>
      </ContrastEnhancer>
    );
  }