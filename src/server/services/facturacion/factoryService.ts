// src/services/facturacion/factoryService.ts
import prisma from '@/server/db/client';
import { FacturacionService } from './facturacionService';

// Cache para servicios
const serviceCache = new Map<string, FacturacionService>();

/**
 * Factory para obtener servicio de facturación
 */
export async function getFacturacionService(sucursalId: string): Promise<FacturacionService> {
  // Revisar cache
  if (serviceCache.has(sucursalId)) {
    return serviceCache.get(sucursalId)!;
  }

  // Obtener configuración de la BD
  const config = await prisma.configuracionAFIP.findFirst({
    where: { sucursalId, activo: true }
  });

  if (!config) {
    throw new Error(`No hay configuración AFIP para la sucursal ${sucursalId}`);
  }

  // Crear servicio
  const service = new FacturacionService(config.cuit);
  
  // Guardar en cache
  serviceCache.set(sucursalId, service);
  
  return service;
}