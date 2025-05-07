// src/types/afip.ts
export interface AfipConfig {
    cuit: string;
    puntoVenta: number;
  }
  
  export interface FacturaData {
    ventaId: string;
    tipo: 'A' | 'B' | 'C';
    puntoVenta: number;
    docTipo?: number;
    docNro?: string;
    clienteNombre?: string;
    items: Array<{
      descripcion: string;
      cantidad: number;
      precio: number;
      alicuota: number;
      importe: number;
    }>;
  }
  
  export interface RespuestaFacturaAFIP {
    Resultado: string;
    CAE?: string;
    CAEFchVto?: string;
    Observaciones?: any;
    Errores?: any;
  }
  
  export interface TokenAFIP {
    token: string;
    sign: string;
    expirationTime: Date;
  }