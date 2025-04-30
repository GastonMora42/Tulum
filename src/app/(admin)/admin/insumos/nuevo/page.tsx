'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, ChevronLeft, Save, Loader2 } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCInput, HCLabel, HCSelect, HCTextarea } from '@/components/ui/HighContrastComponents';

interface Proveedor {
  id: string;
  nombre: string;
}

export default function NuevoInsumoPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFetchingProveedores, setIsFetchingProveedores] = useState(true);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  
  // Estados para cada campo del formulario
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [unidadMedida, setUnidadMedida] = useState('');
  const [stockMinimo, setStockMinimo] = useState<number>(0);
  const [proveedorId, setProveedorId] = useState('');
  const [activo, setActivo] = useState(true);
  
  // Estados para errores de validación
  const [nombreError, setNombreError] = useState('');
  const [unidadMedidaError, setUnidadMedidaError] = useState('');
  const [stockMinimoError, setStockMinimoError] = useState('');
  
  // Cargar proveedores
  useEffect(() => {
    const fetchProveedores = async () => {
      try {
        setIsFetchingProveedores(true);
        
        // Simulamos respuesta para desarrollo
        await new Promise(resolve => setTimeout(resolve, 500));
        const mockProveedores = [
          { id: 'prov1', nombre: 'Proveedor 1' },
          { id: 'prov2', nombre: 'Proveedor 2' }
        ];
        setProveedores(mockProveedores);
      } catch (err) {
        console.error('Error al cargar proveedores:', err);
      } finally {
        setIsFetchingProveedores(false);
      }
    };

    fetchProveedores();
  }, []);
  
  // Validación manual
  const validateForm = () => {
    let isValid = true;
    
    // Validar nombre
    if (!nombre || nombre.length < 3) {
      setNombreError('El nombre debe tener al menos 3 caracteres');
      isValid = false;
    } else {
      setNombreError('');
    }
    
    // Validar unidad de medida
    if (!unidadMedida) {
      setUnidadMedidaError('La unidad de medida es requerida');
      isValid = false;
    } else {
      setUnidadMedidaError('');
    }
    
    // Validar stock mínimo
    if (stockMinimo < 0) {
      setStockMinimoError('El stock mínimo debe ser mayor o igual a 0');
      isValid = false;
    } else {
      setStockMinimoError('');
    }
    
    return isValid;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar formulario
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Preparar datos a enviar
      const data = {
        nombre,
        descripcion: descripcion || undefined,
        unidadMedida,
        stockMinimo,
        proveedorId: proveedorId || undefined,
        activo
      };
      
      console.log('Datos a enviar:', data);
      
      const response = await authenticatedFetch('/api/admin/insumos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear insumo');
      }
      
      // Redirigir a la lista de insumos
      router.push('/admin/insumos');
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al crear insumo');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <ContrastEnhancer>
      <div className="flex flex-col gap-6 p-4 md:gap-8 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-accent" />
            <h1 className="text-2xl font-bold tracking-tight text-black">Nuevo Insumo</h1>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-background border px-4 py-2 text-sm font-medium text-black hover:bg-muted"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Volver
          </button>
        </div>
        
        <div className="rounded-lg border bg-card shadow p-6">
          {error && (
            <div className="mb-6 rounded-md bg-destructive/10 p-4 text-destructive">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <HCLabel htmlFor="nombre" className="text-sm font-medium leading-none">
                  Nombre
                </HCLabel>
                <HCInput
                  id="nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ej: Aceite esencial"
                />
                {nombreError && (
                  <p className="text-sm text-destructive">{nombreError}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <HCLabel htmlFor="unidadMedida" className="text-sm font-medium leading-none">
                  Unidad de Medida
                </HCLabel>
                <HCInput
                  id="unidadMedida"
                  type="text"
                  value={unidadMedida}
                  onChange={(e) => setUnidadMedida(e.target.value)}
                  placeholder="ej: kg, litro, ml, unidad, etc."
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {unidadMedidaError && (
                  <p className="text-sm text-destructive">{unidadMedidaError}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <HCLabel htmlFor="descripcion" className="text-sm font-medium leading-none">
                Descripción (opcional)
              </HCLabel>
              <HCTextarea
                id="descripcion"
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="flex w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              ></HCTextarea>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <HCLabel htmlFor="stockMinimo" className="text-sm font-medium leading-none">
                  Stock Mínimo
                </HCLabel>
                <HCInput
                  id="stockMinimo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={stockMinimo}
                  onChange={(e) => setStockMinimo(Number(e.target.value))}
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {stockMinimoError && (
                  <p className="text-sm text-destructive">{stockMinimoError}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <HCLabel htmlFor="proveedorId" className="text-sm font-medium leading-none">
                  Proveedor (opcional)
                </HCLabel>
                <HCSelect
                  id="proveedorId"
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                  disabled={isFetchingProveedores}
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Seleccionar proveedor</option>
                  {isFetchingProveedores ? (
                    <option disabled>Cargando proveedores...</option>
                  ) : (
                    proveedores.map(proveedor => (
                      <option key={proveedor.id} value={proveedor.id}>
                        {proveedor.nombre}
                      </option>
                    ))
                  )}
                </HCSelect>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                id="activo"
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-accent"
              />
              <HCLabel htmlFor="activo" className="text-sm font-medium leading-none">
                Activo
              </HCLabel>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Insumo
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ContrastEnhancer>
  );
}