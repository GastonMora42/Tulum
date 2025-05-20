// src/components/pdv/FacturasTable.tsx (completado)
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  RefreshCw, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Filter,
  FileText
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { Button, Input, Alert, Spinner, Select } from '@/components/ui'

interface Factura {
  id: string;
  tipoComprobante: string;
  puntoVenta: number;
  numeroFactura: number;
  fechaEmision: string;
  cae: string;
  vencimientoCae: string;
  estado: string;
  venta: {
    id: string;
    total: number;
    clienteNombre: string | null;
    clienteCuit: string | null;
  };
  sucursal: string;
  usuario: string;
}

interface FacturasTableProps {
  sucursalId?: string;
  onViewFactura?: (facturaId: string) => void;
  onRetryFactura?: (facturaId: string) => void;
  refreshKey?: number;
}

export default function FacturasTable({ sucursalId }: FacturasTableProps) {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [limit] = useState(20);
  const [filtros, setFiltros] = useState({
    desde: '',
    hasta: '',
    estado: '',
    search: ''
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  const router = useRouter();
  
  const fetchFacturas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Construir URL con parámetros
      let url = `/api/pdv/facturas?page=${page}&limit=${limit}`;
      if (sucursalId) {
        url += `&sucursalId=${sucursalId}`;
      }
      
      // Añadir filtros
      if (filtros.desde) url += `&desde=${filtros.desde}`;
      if (filtros.hasta) url += `&hasta=${filtros.hasta}`;
      if (filtros.estado) url += `&estado=${filtros.estado}`;
      if (filtros.search) url += `&search=${encodeURIComponent(filtros.search)}`;
      
      const response = await authenticatedFetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar facturas');
      }
      
      setFacturas(data.data);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error al cargar facturas:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchFacturas();
  }, [page, sucursalId]);
  
  const handleVerDetalle = (facturaId: string) => {
    router.push(`/pdv/facturas/${facturaId}`);
  };
  
  const handleVerPdf = (facturaId: string) => {
    window.open(`/api/pdv/facturas/${facturaId}/pdf`, '_blank');
  };
  
  const handleFiltrar = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reiniciar a primera página
    fetchFacturas();
  };
  
  const handleLimpiarFiltros = () => {
    setFiltros({
      desde: '',
      hasta: '',
      estado: '',
      search: ''
    });
    setPage(1);
    fetchFacturas();
  };
  
  const getEstadoTag = (estado: string) => {
    switch (estado) {
      case 'completada':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center">
            <CheckCircle size={12} className="mr-1" />
            Completada
          </span>
        );
      case 'error':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center">
            <AlertTriangle size={12} className="mr-1" />
            Error
          </span>
        );
      case 'procesando':
      case 'pendiente':
      default:
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 flex items-center">
            <Clock size={12} className="mr-1" />
            {estado.charAt(0).toUpperCase() + estado.slice(1)}
          </span>
        );
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-800">Facturas Electrónicas</h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            leftIcon={<Filter size={16} />}
          >
            Filtros
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchFacturas()}
            leftIcon={<RefreshCw size={16} />}
            isLoading={loading}
          >
            Actualizar
          </Button>
        </div>
      </div>
      
      {mostrarFiltros && (
        <div className="p-4 bg-gray-50 border-b">
          <form onSubmit={handleFiltrar} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                type="date"
                label="Desde"
                value={filtros.desde}
                onChange={(e: { target: { value: any; }; }) => setFiltros({...filtros, desde: e.target.value})}
              />
            </div>
            <div>
              <Input
                type="date"
                label="Hasta"
                value={filtros.hasta}
                onChange={(e: { target: { value: any; }; }) => setFiltros({...filtros, hasta: e.target.value})}
              />
            </div>
            <div>
              <Select
                label="Estado"
                value={filtros.estado}
                onChange={(e: { target: { value: any; }; }) => setFiltros({...filtros, estado: e.target.value})}
              >
                <option value="">Todos</option>
                <option value="completada">Completada</option>
                <option value="procesando">Procesando</option>
                <option value="error">Error</option>
              </Select>
            </div>
            <div>
              <Input
                label="Buscar"
                placeholder="Cliente, número..."
                value={filtros.search}
                onChange={(e: { target: { value: any; }; }) => setFiltros({...filtros, search: e.target.value})}
                leftIcon={<Search size={16} />}
              />
            </div>
            <div className="md:col-span-4 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleLimpiarFiltros}>
                Limpiar
              </Button>
              <Button type="submit" variant="primary">
                Aplicar filtros
              </Button>
            </div>
          </form>
        </div>
      )}
      
      {error && (
        <Alert variant="error" className="m-4">
          {error}
        </Alert>
      )}
      
      {loading && facturas.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {facturas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No se encontraron facturas
                  </td>
                </tr>
              ) : (
                facturas.map((factura) => (
                  <tr key={factura.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Factura {factura.tipoComprobante}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {String(factura.puntoVenta).padStart(5, '0')}-
                      {String(factura.numeroFactura).padStart(8, '0')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(factura.fechaEmision), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {factura.venta.clienteNombre || 'Consumidor Final'}
                      {factura.venta.clienteCuit && (
                        <span className="block text-xs text-gray-400">
                          {factura.venta.clienteCuit}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${factura.venta.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getEstadoTag(factura.estado)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerDetalle(factura.id)}
                          disabled={factura.estado === 'error'}
                        >
                          Ver
                        </Button>
                        {factura.estado === 'completada' && (
                            <Button
  variant="outline"
  size="sm"
  onClick={() => handleVerPdf(factura.id)}
  leftIcon={<FileText size={16} />} // Cambiar FilePdf por FileText
>
  PDF
</Button>
                        )}
                        
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {totalPages > 1 && (
        <div className="px-6 py-4 flex items-center justify-between border-t">
          <div className="text-sm text-gray-500">
            Mostrando {facturas.length} de {total} facturas
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1 || loading}
            >
              Anterior
            </Button>
            <span className="text-sm flex items-center px-3 bg-gray-50 rounded">
              {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || loading}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}