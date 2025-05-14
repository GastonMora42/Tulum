// src/components/pdv/FacturacionModal.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input, Button, Select, Alert, Spinner } from '@/components/ui';

// Esquema de validación
const facturaSchema = z.object({
  tipoComprobante: z.enum(['A', 'B']),
  clienteNombre: z.string().optional(),
  clienteCuit: z.string().optional(),
  medioPago: z.string()
});

interface FacturacionModalProps {
  ventaId: string;
  onClose: () => void;
  onSuccess: (facturaId: string) => void;
}

export default function FacturacionModal({ 
  ventaId, 
  onClose, 
  onSuccess 
}: FacturacionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(facturaSchema),
    defaultValues: {
      tipoComprobante: 'B',
      medioPago: 'efectivo'
    }
  });
  
  const tipoComprobante = watch('tipoComprobante');
  
  const onSubmit = async (data: z.infer<typeof facturaSchema>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/pdv/facturas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ventaId,
          tipoComprobante: data.tipoComprobante,
          clienteNombre: data.clienteNombre,
          clienteCuit: data.clienteCuit
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Error al generar factura');
      }
      
      onSuccess(result.facturaId);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al generar factura');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Generar Factura</h2>
        
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Tipo de Comprobante
            </label>
            <Select
              {...register('tipoComprobante')}
              disabled={isLoading}
            >
              <option value="B">Factura B (Consumidor Final)</option>
              <option value="A">Factura A (Responsable Inscripto)</option>
            </Select>
            {errors.tipoComprobante && (
              <p className="text-red-500 text-sm mt-1">{errors.tipoComprobante.message}</p>
            )}
          </div>
          
          {tipoComprobante === 'A' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Razón Social
                </label>
                <Input
                  {...register('clienteNombre')}
                  disabled={isLoading}
                  placeholder="Nombre o Razón Social"
                />
                {errors.clienteNombre && (
                  <p className="text-red-500 text-sm mt-1">{errors.clienteNombre.message}</p>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  CUIT (sin guiones)
                </label>
                <Input
                  {...register('clienteCuit')}
                  disabled={isLoading}
                  placeholder="20123456789"
                />
                {errors.clienteCuit && (
                  <p className="text-red-500 text-sm mt-1">{errors.clienteCuit.message}</p>
                )}
              </div>
            </>
          )}
          
          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? <Spinner size="sm" /> : 'Generar Factura'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}