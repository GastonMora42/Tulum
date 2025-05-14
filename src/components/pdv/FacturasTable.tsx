// src/components/pdv/FacturasTable.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableCell, 
  TableColumn,
  Pagination,
  Button,
  Spinner
} from '@/components/ui';

interface Factura {
  id: string;
  tipoComprobante: string;
  puntoVenta: number;
  numeroFactura: number;
  fechaEmision: string;
  cae: string;
  estado: string;
  venta: {
    id: string;
    total: number;
    clienteNombre: string | null;
  };
}

interface FacturasTableProps {
  sucursalId?: string;
}

export default function FacturasTable({ sucursalId }: FacturasTableProps) {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  
  const router = useRouter();
  
  const fetchFacturas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let url = `/api/pdv/facturas?page=${page}&limit=${limit}`;
      if (sucursalId) {
        url += `&sucursalId=${sucursalId}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar facturas');
      }
      
      setFacturas(data.data);
      setTotal(data.pagination.total);
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
  
  const handleVerPdf = (facturaId: string) => {
    window.open(`/api/pdv/facturas/${facturaId}/pdf`, '_blank');
  };
  
  if (loading && facturas.length === 0) {
    return <div className="flex justify-center my-8"><Spinner size="lg" /></div>;
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded p-4 my-4">
        Error: {error}
      </div>
    );
  }
  
  return (
    <div>
      <Table aria-label="Tabla de facturas">
        <TableHeader>
          <TableColumn>Tipo</TableColumn>
          <TableColumn>Número</TableColumn>
          <TableColumn>Fecha</TableColumn>
          <TableColumn>Cliente</TableColumn>
          <TableColumn>Total</TableColumn>
          <TableColumn>Estado</TableColumn>
          <TableColumn>Acciones</TableColumn>
        </TableHeader>
        <TableBody>
          {facturas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                No hay facturas para mostrar
              </TableCell>
            </TableRow>
          ) : (
            facturas.map((factura) => (
              <TableRow key={factura.id}>
                <TableCell>Factura {factura.tipoComprobante}</TableCell>
                <TableCell>
                  {factura.puntoVenta.toString().padStart(5, '0')}-
                  {factura.numeroFactura.toString().padStart(8, '0')}
                </TableCell>
                <TableCell>
                  {format(new Date(factura.fechaEmision), 'dd/MM/yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  {factura.venta.clienteNombre || 'Consumidor Final'}
                </TableCell>
                <TableCell>
                  ${factura.venta.total.toFixed(2)}
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      factura.estado === 'completada'
                        ? 'bg-green-100 text-green-800'
                        : factura.estado === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {factura.estado === 'completada'
                      ?