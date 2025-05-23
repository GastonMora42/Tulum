// src/app/(admin)/admin/reportes/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { exportToPdf } from '@/lib/utils/pdfExport';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCLabel, HCInput, HCTable, HCTh, HCTd } from '@/components/ui/HighContrastComponents';

interface VentasPorDia {
  fecha: string;
  total: number;
  cantidad: number;
}

interface VentasPorProducto {
  productoId: string;
  nombre: string;
  cantidad: number;
  total: number;
}

interface StockBajo {
  id: string;
  nombre: string;
  stock: number;
  stockMinimo: number;
  sucursal: string;
}

export default function ReportesPage() {
  const [startDate, setStartDate] = useState<string>(
    format(subDays(new Date(), 30), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ventas' | 'stock'>('ventas');
  const [ventasPorDia, setVentasPorDia] = useState<VentasPorDia[]>([]);
  const [ventasPorProducto, setVentasPorProducto] = useState<VentasPorProducto[]>([]);
  const [stockBajo, setStockBajo] = useState<StockBajo[]>([]);

  // Función para cargar los datos del reporte de ventas
  const cargarReporteVentas = async () => {
    setIsLoading(true);
    try {
      // En producción, conectaríamos con la API real
      // const response = await fetch(`/api/reportes/ventas?start=${startDate}&end=${endDate}`);
      // const data = await response.json();
      
      // Por ahora, simulamos datos
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Datos simulados
      const ventasDiarias: VentasPorDia[] = [
        { fecha: '2025-04-01', total: 2500, cantidad: 8 },
        { fecha: '2025-04-02', total: 1800, cantidad: 6 },
        { fecha: '2025-04-03', total: 3200, cantidad: 12 },
        { fecha: '2025-04-04', total: 2100, cantidad: 7 },
        { fecha: '2025-04-05', total: 2900, cantidad: 10 },
        { fecha: '2025-04-06', total: 1500, cantidad: 5 },
        { fecha: '2025-04-07', total: 3500, cantidad: 14 },
      ];
      
      const ventasProductos: VentasPorProducto[] = [
        { productoId: '1', nombre: 'Difusor Bambú', cantidad: 15, total: 6750 },
        { productoId: '2', nombre: 'Vela Lavanda', cantidad: 22, total: 7700 },
        { productoId: '3', nombre: 'Aceite Esencial Limón', cantidad: 18, total: 5040 },
        { productoId: '4', nombre: 'Set Aromaterapia Básico', cantidad: 7, total: 4200 },
      ];
      
      setVentasPorDia(ventasDiarias);
      setVentasPorProducto(ventasProductos);
    } catch (error) {
      console.error('Error al cargar reporte de ventas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para cargar los datos del reporte de stock
  const cargarReporteStock = async () => {
    setIsLoading(true);
    try {
      // En producción, conectaríamos con la API real
      // const response = await fetch('/api/reportes/stock/bajo');
      // const data = await response.json();
      
      // Por ahora, simulamos datos
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Datos simulados
      const stockBajoData: StockBajo[] = [
        { id: '1', nombre: 'Difusor Bambú', stock: 3, stockMinimo: 5, sucursal: 'Tienda Tulum Centro' },
        { id: '2', nombre: 'Vela Lavanda', stock: 4, stockMinimo: 10, sucursal: 'Tienda Tulum Centro' },
        { id: '3', nombre: 'Aceite Esencial Limón', stock: 2, stockMinimo: 8, sucursal: 'Tienda Tulum Centro' },
        { id: '4', nombre: 'Difusor Bambú', stock: 2, stockMinimo: 5, sucursal: 'Tienda Tulum Playa' },
        { id: '5', nombre: 'Set Aromaterapia Básico', stock: 1, stockMinimo: 3, sucursal: 'Tienda Tulum Playa' },
      ];
      
      setStockBajo(stockBajoData);
    } catch (error) {
      console.error('Error al cargar reporte de stock:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar los datos según la pestaña activa
  useEffect(() => {
    if (activeTab === 'ventas') {
      cargarReporteVentas();
    } else {
      cargarReporteStock();
    }
  }, [activeTab, startDate, endDate]);

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return `${day}/${month}/${year}`;
  };

  // Función para formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-black">Reportes</h1>
        
        {/* Pestañas */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('ventas')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'ventas'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-black hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Ventas
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stock'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-black hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Stock
            </button>
          </nav>
        </div>
        
        {/* Contenido de pestañas */}
        <div>
          {activeTab === 'ventas' ? (
            <div className="space-y-6">
              {/* Filtros de fecha */}
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <HCLabel htmlFor="startDate" className="block text-sm font-medium mb-1">
                      Fecha inicial
                    </HCLabel>
                    <HCInput
                      type="date"
                      id="startDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <HCLabel htmlFor="endDate" className="block text-sm font-medium mb-1">
                      Fecha final
                    </HCLabel>
                    <HCInput
                      type="date"
                      id="endDate"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
              
              {/* Resumen de ventas por día */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h2 className="text-lg leading-6 font-medium text-black">
                    Ventas por día
                  </h2>
                </div>
                <div className="border-t border-gray-200">
                  {isLoading ? (
                    <div className="text-center py-10">
                      <p className="text-lg text-black">Cargando datos...</p>
                    </div>
                  ) : ventasPorDia.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-lg text-black">No hay datos para mostrar</p>
                    </div>
                  ) : (
                    <HCTable className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <HCTh
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                          >
                            Fecha
                          </HCTh>
                          <HCTh
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                          >
                            Cantidad de ventas
                          </HCTh>
                          <HCTh
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                          >
                            Total
                          </HCTh>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {ventasPorDia.map((venta, index) => (
                          <tr key={index}>
                            <HCTd className="px-6 py-4 whitespace-nowrap text-sm">
                              {formatDate(venta.fecha)}
                            </HCTd>
                            <HCTd className="px-6 py-4 whitespace-nowrap text-sm">
                              {venta.cantidad}
                            </HCTd>
                            <HCTd className="px-6 py-4 whitespace-nowrap text-sm">
                              {formatCurrency(venta.total)}
                            </HCTd>
                          </tr>
                        ))}
                        {/* Fila de totales */}
                        <tr className="bg-gray-50">
                          <HCTd className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            Total
                          </HCTd>
                          <HCTd className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {ventasPorDia.reduce((sum, venta) => sum + venta.cantidad, 0)}
                          </HCTd>
                          <HCTd className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {formatCurrency(ventasPorDia.reduce((sum, venta) => sum + venta.total, 0))}
                          </HCTd>
                        </tr>
                      </tbody>
                    </HCTable>
                  )}
                </div>
              </div>
              
              {/* Ventas por producto */}
              {/* [Aplicar el mismo patrón para esta sección] */}
              
              {/* Botones de exportación */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    exportToPdf({
                      title: 'Reporte de Ventas por Día',
                      subtitle: `Periodo: ${formatDate(startDate)} - ${formatDate(endDate)}`,
                      fileName: 'ventas-por-dia',
                      columns: [
                        { header: 'Fecha', dataKey: 'fechaFormateada' },
                        { header: 'Cantidad de ventas', dataKey: 'cantidad' },
                        { header: 'Total', dataKey: 'totalFormateado' }
                      ],
                      data: ventasPorDia.map(venta => ({
                        ...venta,
                        fechaFormateada: formatDate(venta.fecha),
                        totalFormateado: formatCurrency(venta.total)
                      })),
                      orientation: 'portrait'
                    });
                  }}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Exportar ventas por día
                </button>
                
                <button
                  onClick={() => {
                    exportToPdf({
                      title: 'Reporte de Ventas por Producto',
                      subtitle: `Periodo: ${formatDate(startDate)} - ${formatDate(endDate)}`,
                      fileName: 'ventas-por-producto',
                      columns: [
                        { header: 'Producto', dataKey: 'nombre' },
                        { header: 'Cantidad vendida', dataKey: 'cantidad' },
                        { header: 'Total', dataKey: 'totalFormateado' }
                      ],
                      data: ventasPorProducto.map(producto => ({
                        ...producto,
                        totalFormateado: formatCurrency(producto.total)
                      })),
                      orientation: 'portrait'
                    });
                  }}
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Exportar ventas por producto
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Productos con stock bajo */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h2 className="text-lg leading-6 font-medium text-black">
                    Productos con stock bajo
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-black">
                    Productos que están por debajo de su nivel mínimo de stock
                  </p>
                </div>
                <div className="border-t border-gray-200">
                  {isLoading ? (
                    <div className="text-center py-10">
                      <p className="text-lg text-black">Cargando datos...</p>
                    </div>
                  ) : stockBajo.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-lg text-black">No hay productos con stock bajo</p>
                    </div>
                  ) : (
                    <HCTable className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <HCTh
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                          >
                            Producto
                          </HCTh>
                          <HCTh
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                          >
                            Sucursal
                          </HCTh>
                          <HCTh
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                          >
                            Stock actual
                          </HCTh>
                          <HCTh
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                          >
                            Stock mínimo
                          </HCTh>
                          <HCTh
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                          >
                            Estado
                          </HCTh>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stockBajo.map((item) => (
                          <tr key={item.id}>
                            <HCTd className="px-6 py-4 whitespace-nowrap text-sm">
                              {item.nombre}
                            </HCTd>
                            <HCTd className="px-6 py-4 whitespace-nowrap text-sm">
                              {item.sucursal}
                            </HCTd>
                            <HCTd className="px-6 py-4 whitespace-nowrap text-sm">
                              {item.stock}
                            </HCTd>
                            <HCTd className="px-6 py-4 whitespace-nowrap text-sm">
                              {item.stockMinimo}
                            </HCTd>
                            <HCTd className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                item.stock === 0
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {item.stock === 0 ? 'Sin stock' : 'Stock bajo'}
                              </span>
                            </HCTd>
                          </tr>
                        ))}
                      </tbody>
                    </HCTable>
                  )}
                </div>
                
                {/* Acciones */}
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      exportToPdf({
                        title: 'Reporte de Stock Bajo',
                        subtitle: `Generado para todas las sucursales activas`,
                        fileName: 'stock-bajo',
                        columns: [
                          { header: 'Producto', dataKey: 'nombre' },
                          { header: 'Sucursal', dataKey: 'sucursal' },
                          { header: 'Stock Actual', dataKey: 'stock' },
                          { header: 'Stock Mínimo', dataKey: 'stockMinimo' }
                        ],
                        data: stockBajo,
                        orientation: 'portrait'
                      });
                    }}
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Exportar a PDF
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ContrastEnhancer>
  );
}