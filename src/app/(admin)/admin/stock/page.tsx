// src/app/(admin)/admin/stock/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { 
  Archive, 
  Search, 
  Filter, 
  RefreshCw, 
  ArrowUpDown, 
  Edit, 
  AlertCircle, 
  Plus,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Truck,
  Factory,
  Store,
  Box
} from 'lucide-react';
import { HCInput, HCLabel, HCSelect, HCTable, HCTd, HCTh } from '@/components/ui/HighContrastComponents';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';

// Interfaces
interface StockItem {
  id: string;
  cantidad: number;
  ubicacionId: string;
  productoId?: string;
  insumoId?: string;
  ultimaActualizacion: string;
  producto?: {
    id: string;
    nombre: string;
    codigoBarras?: string;
    stockMinimo: number;
  };
  insumo?: {
    id: string;
    nombre: string;
    unidadMedida: string;
    stockMinimo: number;
  };
  ubicacion: {
    id: string;
    nombre: string;
    tipo: string;
  };
}

interface Ubicacion {
  id: string;
  nombre: string;
  tipo: string;
}

export default function StockPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [isAjusteModalOpen, setIsAjusteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  
  // Filtros
  const [ubicacionId, setUbicacionId] = useState<string>('');
  const [tipoItem, setTipoItem] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showLowStock, setShowLowStock] = useState<boolean>(false);
  
  // Nueva ubicación Admin
  const adminLocation = {
    id: 'ubicacion-admin',
    nombre: 'Administración',
    tipo: 'admin'
  };
  
  // Ajuste de Stock
  const [ajusteData, setAjusteData] = useState({
    cantidad: 0,
    motivo: '',
    esSalida: false
  });
  
  // Cargar ubicaciones
  useEffect(() => {
    const fetchUbicaciones = async () => {
      try {
        const response = await authenticatedFetch('/api/admin/ubicaciones');
        if (!response.ok) {
          throw new Error('Error al cargar ubicaciones');
        }
        
        const data = await response.json();
        
        // Agregar ubicación "admin" si no existe
        const hasAdmin = data.some((u: Ubicacion) => u.tipo === 'admin');
        if (!hasAdmin) {
          setUbicaciones([adminLocation, ...data]);
        } else {
          setUbicaciones(data);
        }
        
        // Seleccionar la primera ubicación por defecto
        if (data.length > 0 && !ubicacionId) {
          setUbicacionId(data[0].id);
        }
      } catch (err) {
        console.error('Error al cargar ubicaciones:', err);
        setError('No se pudieron cargar las ubicaciones');
      }
    };
    
    fetchUbicaciones();
  }, []);
  
  // Cargar stock cuando cambian los filtros
  useEffect(() => {
    if (!ubicacionId) return;
    
    const fetchStock = async () => {
      try {
        setIsLoading(true);
        
        // Construir query params
        const params = new URLSearchParams();
        params.append('ubicacionId', ubicacionId);
        if (tipoItem !== 'todos') {
          params.append('tipo', tipoItem);
        }
        
        const response = await authenticatedFetch(`/api/stock?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar stock');
        }
        
        let data = await response.json();
        
        // Filtrar por búsqueda
        if (searchQuery) {
          const search = searchQuery.toLowerCase();
          data = data.filter((item: StockItem) => {
            const nombreProducto = item.producto?.nombre?.toLowerCase() || '';
            const nombreInsumo = item.insumo?.nombre?.toLowerCase() || '';
            const codigoBarras = item.producto?.codigoBarras?.toLowerCase() || '';
            
            return nombreProducto.includes(search) || 
                   nombreInsumo.includes(search) || 
                   codigoBarras.includes(search);
          });
        }
        
        // Filtrar por stock bajo
        if (showLowStock) {
          data = data.filter((item: StockItem) => {
            if (item.producto) {
              return item.cantidad <= item.producto.stockMinimo;
            }
            if (item.insumo) {
              return item.cantidad <= item.insumo.stockMinimo;
            }
            return false;
          });
        }
        
        setStock(data);
      } catch (err) {
        console.error('Error al cargar stock:', err);
        setError('No se pudo cargar el stock');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStock();
  }, [ubicacionId, tipoItem, searchQuery, showLowStock]);
  
  // Manejar búsqueda
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // La búsqueda se maneja con el useEffect
  };
  
  // Abrir modal de ajuste
  const openAjusteModal = (item: StockItem) => {
    setSelectedItem(item);
    setAjusteData({
      cantidad: 0,
      motivo: '',
      esSalida: false
    });
    setIsAjusteModalOpen(true);
  };
  
  // Realizar ajuste de stock
  const handleAjusteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItem) return;
    
    try {
      setIsLoading(true);
      
      // Calcular cantidad final (positiva o negativa)
      const cantidadFinal = ajusteData.esSalida 
        ? -Math.abs(ajusteData.cantidad) 
        : Math.abs(ajusteData.cantidad);
      
      const response = await authenticatedFetch('/api/stock/ajuste', {
        method: 'POST',
        body: JSON.stringify({
          productoId: selectedItem.productoId,
          insumoId: selectedItem.insumoId,
          ubicacionId: selectedItem.ubicacionId,
          cantidad: cantidadFinal,
          motivo: ajusteData.motivo || 'Ajuste manual'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al ajustar stock');
      }
      
      // Cerrar modal y actualizar stock
      setIsAjusteModalOpen(false);
      
      // Actualizar stock en el estado
      setStock(prevStock => prevStock.map(item => {
        if (item.id === selectedItem.id) {
          return {
            ...item,
            cantidad: item.cantidad + cantidadFinal
          };
        }
        return item;
      }));
      
      // Mostrar mensaje de éxito
      alert('Stock ajustado correctamente');
    } catch (err: any) {
      console.error('Error al ajustar stock:', err);
      alert(`Error al ajustar stock: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Modal de ajuste de stock
  const AjusteModal = () => {
    if (!isAjusteModalOpen || !selectedItem) return null;
    
    const itemName = selectedItem.producto?.nombre || selectedItem.insumo?.nombre || 'Item';
    const unidad = selectedItem.insumo?.unidadMedida || 'unidades';
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <h3 className="text-xl font-semibold text-[#311716] mb-4">Ajustar Stock</h3>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600">Item:</p>
            <p className="font-medium">{itemName}</p>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600">Stock actual:</p>
            <p className="font-medium">{selectedItem.cantidad} {unidad}</p>
          </div>
          
          <form onSubmit={handleAjusteSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de ajuste
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!ajusteData.esSalida}
                    onChange={() => setAjusteData({...ajusteData, esSalida: false})}
                    className="mr-2"
                  />
                  <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
                  Entrada
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={ajusteData.esSalida}
                    onChange={() => setAjusteData({...ajusteData, esSalida: true})}
                    className="mr-2"
                  />
                  <TrendingDown className="w-4 h-4 mr-1 text-red-600" />
                  Salida
                </label>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad
              </label>
              <input
                type="number"
                value={ajusteData.cantidad}
                onChange={e => setAjusteData({...ajusteData, cantidad: +e.target.value})}
                min="0"
                step="1"
                required
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo
              </label>
              <textarea
                value={ajusteData.motivo}
                onChange={e => setAjusteData({...ajusteData, motivo: e.target.value})}
                rows={3}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Especifique el motivo del ajuste"
              ></textarea>
            </div>
            
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setIsAjusteModalOpen(false)}
                className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={ajusteData.cantidad <= 0}
                className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#311716] hover:bg-[#4a292a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#311716] disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Confirmar Ajuste
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  
  // Función para renderizar icono por tipo de ubicación
  const renderUbicacionIcon = (tipo: string) => {
    switch (tipo) {
      case 'fabrica':
        return <Factory className="w-4 h-4 mr-1 text-purple-600" />;
      case 'sucursal':
        return <Store className="w-4 h-4 mr-1 text-blue-600" />;
      case 'admin':
        return <Box className="w-4 h-4 mr-1 text-yellow-600" />;
      default:
        return <Box className="w-4 h-4 mr-1 text-gray-600" />;
    }
  };

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-black">Gestión de Stock</h1>
          
          <div className="flex space-x-2">
            <button
              onClick={() => {/* Implementar lógica para transferir stock */}}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#311716] hover:bg-[#4a292a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#311716]"
            >
              <Truck className="h-4 w-4 mr-2" />
              Transferir Stock
            </button>
          </div>
        </div>
  
        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-[#eee3d8]">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <HCLabel htmlFor="ubicacion" className="block text-sm font-medium mb-1">
                  Ubicación
                </HCLabel>
                <HCSelect
                  id="ubicacion"
                  value={ubicacionId}
                  onChange={(e) => setUbicacionId(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#eeb077] focus:border-[#eeb077] sm:text-sm rounded-md"
                >
                  <option value="">Todas las ubicaciones</option>
                  {ubicaciones.map((ubicacion) => (
                    <option key={ubicacion.id} value={ubicacion.id}>
                      {ubicacion.nombre} ({ubicacion.tipo})
                    </option>
                  ))}
                </HCSelect>
              </div>
              
              <div>
                <HCLabel htmlFor="tipoItem" className="block text-sm font-medium mb-1">
                  Tipo de Item
                </HCLabel>
                <HCSelect
                  id="tipoItem"
                  value={tipoItem}
                  onChange={(e) => setTipoItem(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#eeb077] focus:border-[#eeb077] sm:text-sm rounded-md"
                >
                  <option value="todos">Todos</option>
                  <option value="producto">Productos</option>
                  <option value="insumo">Insumos</option>
                </HCSelect>
              </div>
              
              <div>
                <HCLabel htmlFor="search" className="block text-sm font-medium mb-1">
                  Buscar
                </HCLabel>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <HCInput
                    type="text"
                    id="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nombre, código..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#eeb077] focus:border-[#eeb077] sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="flex items-end">
                <div className="flex items-center h-10">
                  <input
                    id="showLowStock"
                    type="checkbox"
                    checked={showLowStock}
                    onChange={(e) => setShowLowStock(e.target.checked)}
                    className="h-4 w-4 text-[#eeb077] focus:ring-[#eeb077] border-gray-300 rounded"
                  />
                  <HCLabel htmlFor="showLowStock" className="ml-2 block text-sm">
                    Mostrar solo stock bajo mínimo
                  </HCLabel>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#311716] hover:bg-[#4a292a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#311716]"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtrar
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowLowStock(false);
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#eeb077]"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Limpiar filtros
              </button>
            </div>
          </form>
        </div>
  
        {/* Tabla de stock */}
        <div className="bg-white shadow-sm overflow-hidden rounded-lg border border-[#eee3d8]">
          {isLoading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-[#eeb077] border-t-transparent rounded-full"></div>
              <p className="mt-2 text-sm text-black">Cargando stock...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-500">{error}</p>
            </div>
          ) : stock.length === 0 ? (
            <div className="text-center py-10">
              <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="mt-2 text-sm font-medium text-black">No hay stock</h3>
              <p className="mt-1 text-sm text-black">
                No se encontraron items de stock con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <HCTable className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#fcf3ea]">
                  <tr>
                    <HCTh scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Item
                    </HCTh>
                    <HCTh scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Tipo
                    </HCTh>
                    <HCTh scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Ubicación
                    </HCTh>
                    <HCTh scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Stock Actual
                    </HCTh>
                    <HCTh scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Stock Mínimo
                    </HCTh>
                    <HCTh scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Última Actualización
                    </HCTh>
                    <HCTh scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                      Acciones
                    </HCTh>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stock.map((item) => {
                    const nombre = item.producto?.nombre || item.insumo?.nombre || 'Desconocido';
                    const tipo = item.producto ? 'Producto' : 'Insumo';
                    const stockMinimo = item.producto?.stockMinimo || item.insumo?.stockMinimo || 0;
                    const unidad = item.insumo?.unidadMedida || 'unidades';
                    const isStockBajo = item.cantidad <= stockMinimo;
                    
                    return (
                      <tr key={item.id} className="hover:bg-[#f8f5f3]">
                        <HCTd className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-black">{nombre}</div>
                          {item.producto?.codigoBarras && (
                            <div className="text-xs text-black">Código: {item.producto.codigoBarras}</div>
                          )}
                        </HCTd>
                        <HCTd className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            tipo === 'Producto' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {tipo}
                          </span>
                        </HCTd>
                        <HCTd className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-black">
                            {item.ubicacion ? (
                              <>
                                {renderUbicacionIcon(item.ubicacion.tipo)}
                                {item.ubicacion.nombre}
                              </>
                            ) : (
                              <span className="text-black">Ubicación desconocida</span>
                            )}
                          </div>
                        </HCTd>
                        <HCTd className="px-6 py-4 whitespace-nowrap">
                          <span className={`font-medium ${isStockBajo ? 'text-red-600' : 'text-black'}`}>
                            {item.cantidad} {unidad}
                          </span>
                        </HCTd>
                        <HCTd className="px-6 py-4 whitespace-nowrap text-sm text-black">
                          {stockMinimo} {unidad}
                        </HCTd>
                        <HCTd className="px-6 py-4 whitespace-nowrap text-sm text-black">
                          {new Date(item.ultimaActualizacion).toLocaleString()}
                        </HCTd>
                        <HCTd className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openAjusteModal(item)}
                            className="text-[#311716] hover:text-[#eeb077] mr-3"
                          >
                            <Edit className="h-5 w-5 inline mr-1" />
                            Ajustar
                          </button>
                        </HCTd>
                      </tr>
                    );
                  })}
                </tbody>
              </HCTable>
            </div>
          )}
        </div>
        
        {/* Modal de ajuste */}
        <AjusteModal />
      </div>
    </ContrastEnhancer>
  );
}