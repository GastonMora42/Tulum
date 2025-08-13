// src/types/shared/stock.ts - INTERFACES COMPARTIDAS CORREGIDAS
export interface CategoriaBase {
    id: string;
    nombre: string;
    imagen?: string | null;
  }
  
  export interface ProductoBase {
    id: string;
    nombre: string;
    descripcion?: string | null;
    precio?: number;
    codigoBarras?: string | null;
    imagen?: string | null;
    categoriaId?: string;
    categoria?: CategoriaBase;
    stockMinimo?: number;
    activo?: boolean;
  }
  
  export interface ProductoCompleto extends ProductoBase {
    categoria: CategoriaBase; // ✅ REQUERIDO en contexto completo
    stockMinimo: number;
    activo: boolean;
  }
  
  export interface SucursalBase {
    id: string;
    nombre: string;
    tipo: string;
  }
  
  export interface StockConfiguracion {
    stockMaximo: number;
    stockMinimo: number;
    puntoReposicion: number;
  }
  
  export interface StockAnalisis {
    stockActual: number;
    diferencia: number;
    diferenciaPorcentual?: number;
    porcentajeUso: number;
    estado: 'critico' | 'bajo' | 'normal' | 'exceso';
    prioridad: number;
    acciones: {
      necesitaReposicion: boolean;
      puedeCargar: boolean;
      cantidadSugerida: number;
      tieneExceso: boolean;
      excesoActual: number;
    };
  }
  
  export interface AnalisisStockItem {
    id: string;
    producto: ProductoBase; // ✅ FLEXIBLE - puede tener o no categoría
    sucursal: SucursalBase;
    configuracion: StockConfiguracion;
    stockActual: number;
    diferencia: number;
    porcentajeUso: number;
    estado: 'critico' | 'bajo' | 'normal' | 'exceso';
    prioridad: number;
    tieneConfiguracion: boolean;
    requiereConfiguracion?: boolean;
    acciones: {
      necesitaReposicion: boolean;
      puedeCargar: boolean;
      cantidadSugerida: number;
      tieneExceso: boolean;
      excesoActual: number;
    };
  }
  
  export interface DashboardEstadisticas {
    total: number;
    conConfiguracion: number;
    sinConfiguracion: number;
    criticos: number;
    bajos: number;
    normales: number;
    excesos: number;
    necesitanReposicion: number;
    conExceso: number;
  }
  
  export interface DashboardData {
    estadisticas: DashboardEstadisticas;
    analisisCompleto: AnalisisStockItem[];
    resumenSucursales: any[];
    topDeficit: any[];
    topExceso: any[];
    ultimaActualizacion: Date;
  }
  
  // ✅ TIPOS PARA FORMULARIOS Y MODALES
  export interface CargaManualFormData {
    productoId: string;
    sucursalId: string;
    cantidad: number;
    observaciones: string;
    modo: 'incrementar' | 'establecer' | 'decrementar';
  }
  
  export interface ConfiguracionStockFormData {
    productoId: string;
    sucursalId: string;
    stockMaximo: number;
    stockMinimo: number;
    puntoReposicion: number;
  }
  
  // ✅ TIPOS PARA RESPUESTAS DE API
  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
  }
  
  export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
      startIndex?: number;
      endIndex?: number;
    };
  }
  
  // ✅ GUARDS DE TIPO PARA VALIDACIÓN
  export function hasCategoria(producto: ProductoBase): producto is ProductoBase & { categoria: CategoriaBase } {
    return producto.categoria !== undefined && producto.categoria !== null;
  }
  
  export function isProductoCompleto(producto: ProductoBase): producto is ProductoCompleto {
    return hasCategoria(producto) && 
           typeof producto.stockMinimo === 'number' && 
           typeof producto.activo === 'boolean';
  }