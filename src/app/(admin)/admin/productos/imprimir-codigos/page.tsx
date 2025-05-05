'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';

// Definir una interfaz para el tipo de producto
interface Producto {
  id: string;
  nombre: string;
  codigoBarras: string;
  precio?: number;
}

export default function ImprimirCodigosPage() {
  // Corregir la definición del estado con tipos adecuados
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Cargar productos
  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const response = await authenticatedFetch('/api/admin/productos?limit=100');
        if (response.ok) {
          const data = await response.json();
          setProductos(data.data.filter((p: Producto) => p.codigoBarras));
        }
      } catch (error) {
        console.error('Error al cargar productos:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProductos();
  }, []);

  // Gestionar selección con tipo correcto
  const toggleProductSelection = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  // El resto de tu código...
  const handlePrintSelected = async () => {
    if (selectedProducts.length === 0) return;
    
    try {
      const response = await authenticatedFetch('/api/admin/productos/print-barcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedProducts })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Abrir PDF en nueva ventana
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error al imprimir códigos:', error);
    }
  };

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Impresión de Códigos de Barras</h1>
          <button 
            onClick={() => router.back()}
            className="text-indigo-600 hover:text-indigo-800"
          >
            Volver
          </button>
        </div>
        
        {isLoading ? (
          <div className="text-center py-10">Cargando productos...</div>
        ) : (
          <>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between mb-4">
                <span>Selecciona los productos para imprimir ({selectedProducts.length} seleccionados)</span>
                <button
                  onClick={handlePrintSelected}
                  disabled={selectedProducts.length === 0}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  Imprimir Seleccionados
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productos.map(producto => (
                  <div 
                    key={producto.id}
                    className={`border p-4 rounded-lg cursor-pointer ${
                      selectedProducts.includes(producto.id) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                    }`}
                    onClick={() => toggleProductSelection(producto.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(producto.id)}
                        onChange={() => {}}
                        className="h-5 w-5 text-indigo-600"
                      />
                      <div>
                        <p className="font-medium">{producto.nombre}</p>
                        <p className="text-sm text-gray-500">Código: {producto.codigoBarras}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </ContrastEnhancer>
  );
}