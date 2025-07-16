
// =================================================================
// FUNCIÓN UTILITARIA: src/utils/printDebug.ts
// =================================================================

export const printDebug = {
    /**
     * Verificar datos completos de factura
     */
    async verificarFactura(facturaId: string) {
      try {
        console.log(`🔍 [DEBUG] Verificando factura: ${facturaId}`);
        
        const response = await fetch(`/api/pdv/facturas/${facturaId}`);
        const data = await response.json();
        
        console.log(`📊 [DEBUG] Datos de factura:`, {
          id: data.id,
          estado: data.estado,
          tipoComprobante: data.tipoComprobante,
          numeroFactura: data.numeroFactura,
          cae: data.cae ? 'Presente' : 'Ausente',
          venta: {
            id: data.venta?.id,
            total: data.venta?.total,
            itemsCount: data.venta?.items?.length || 0,
            sucursal: data.venta?.sucursal?.nombre
          },
          validacion: data._validacion
        });
        
        return data;
      } catch (error) {
        console.error(`❌ [DEBUG] Error verificando factura:`, error);
        return null;
      }
    },
    
    /**
     * Probar impresión directa
     */
    async probarImpresion(facturaId: string) {
      try {
        console.log(`🖨️ [DEBUG] Probando impresión: ${facturaId}`);
        
        const { printManager } = await import('@/services/print/integratedPrintManager');
        
        const result = await printManager.printFactura(facturaId);
        
        console.log(`📊 [DEBUG] Resultado impresión:`, result);
        
        return result;
      } catch (error) {
        console.error(`❌ [DEBUG] Error probando impresión:`, error);
        return { success: false, message: error };
      }
    }
  };
  
  // Para usar en consola:
  // window.printDebug = printDebug;