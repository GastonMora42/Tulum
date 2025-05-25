// src/app/(admin)/admin/insumos-pdv/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Package, AlertTriangle, Search, Filter } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCTable, HCTh, HCTd, HCInput, HCSelect } from '@/components/ui/HighContrastComponents';

interface InsumoPdv {
  id: string;
  nombre: string;
  descripcion: string | null;
  unidadMedida: string;
  stockMinimo: number;
  activo: boolean;
}

export default function InsumosPdvPage() {
  const [insumos, setInsumos] = useState<InsumoPdv[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    search: '',
    soloActivos: true
  });

  useEffect(() => {
    fetchInsumos();
  }, [filtros]);

  const fetchInsumos = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        search: filtros.search,
        soloActivos: filtros.soloActivos.toString()
      });

      const response = await authenticatedFetch(`/api/admin/insumos-pdv?${params}`);
      if (response.ok) {
        const data = await response.json();
        setInsumos(data.data);
      }
    } catch (error) {
      console.error('Error al cargar insumos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#311716] to-[#462625] rounded-lg p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Insumos de Punto de Venta</h1>
              <p className="text-white/80">Gestión de insumos para sucursales (papel térmico, bolsas, etc.)</p>
            </div>
            <Link 
              href="/admin/insumos-pdv/nuevo"
              className="inline-flex items-center px-4 py-2 bg-white text-[#311716] rounded-md hover:bg-gray-100 font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Insumo PDV
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col md:flex-row gap-4 md:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-black mb-1">
                Buscar insumos
              </label>
              <HCInput
                type="text"
                placeholder="Nombre o descripción..."
                value={filtros.search}
                onChange={(e) => setFiltros({...filtros, search: e.target.value})}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="soloActivos"
                checked={filtros.soloActivos}
                onChange={(e) => setFiltros({...filtros, soloActivos: e.target.checked})}
                className="h-4 w-4 rounded"
              />
              <label htmlFor="soloActivos" className="text-sm text-black">
                Solo activos
              </label>
            </div>
          </div>
        </div>

        {/* Lista de insumos */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-[#311716] border-t-transparent rounded-full"></div>
              <p className="mt-2 text-sm text-black">Cargando insumos...</p>
            </div>
          ) : (
            <HCTable className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <HCTh>Nombre</HCTh>
                  <HCTh>Descripción</HCTh>
                  <HCTh>Unidad</HCTh>
                  <HCTh>Stock Mínimo</HCTh>
                  <HCTh>Estado</HCTh>
                  <HCTh>Acciones</HCTh>
                </tr>
              </thead>
              <tbody>
                {insumos.map((insumo) => (
                  <tr key={insumo.id} className="hover:bg-gray-50">
                    <HCTd>
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="font-medium text-black">{insumo.nombre}</span>
                      </div>
                    </HCTd>
                    <HCTd>
                      <span className="text-black">{insumo.descripcion || '-'}</span>
                    </HCTd>
                    <HCTd>
                      <span className="text-black">{insumo.unidadMedida}</span>
                    </HCTd>
                    <HCTd>
                      <span className="text-black">{insumo.stockMinimo}</span>
                    </HCTd>
                    <HCTd>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        insumo.activo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {insumo.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </HCTd>
                    <HCTd>
                      <div className="flex space-x-2">
                        <Link 
                          href={`/admin/insumos-pdv/${insumo.id}`}
                          className="text-indigo-600 hover:text-indigo-900 text-sm"
                        >
                          Editar
                        </Link>
                        <Link 
                          href={`/admin/stock-insumos-pdv?insumo=${insumo.id}`}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          Ver Stock
                        </Link>
                      </div>
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