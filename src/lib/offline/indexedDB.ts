// src/lib/offline/indexedDB.ts
import Dexie from 'dexie';

export class AromaticaDB extends Dexie {
  // Tablas
  ventasPendientes: Dexie.Table<IVentaPendiente, string>;
  productosCache: Dexie.Table<IProductoCache, string>;
  stockLocal: Dexie.Table<IStockLocal, string>;
  operacionesPendientes: Dexie.Table<IOperacionPendiente, string>;

  constructor() {
    super('AromaticaDB');
    
    // Definir esquemas
    this.version(1).stores({
      ventasPendientes: 'id, estado, fechaCreacion',
      productosCache: 'id, codigoBarras, categoriaId, *tags',
      stockLocal: 'id, productoId, ubicacionId',
      operacionesPendientes: 'id, tipo, estado, fechaCreacion'
    });
    
    // Tipado de tablas
    this.ventasPendientes = this.table('ventasPendientes');
    this.productosCache = this.table('productosCache');
    this.stockLocal = this.table('stockLocal');
    this.operacionesPendientes = this.table('operacionesPendientes');
  }
}

// Singleton
const db = new AromaticaDB();
export default db;

// Tipos
export interface IVentaPendiente {
  id: string;
  items: {
    productoId: string;
    cantidad: number;
    precioUnitario: number;
  }[];
  total: number;
  fechaCreacion: Date;
  estado: 'pendiente' | 'sincronizando' | 'completada' | 'error';
  intentos?: number;
  error?: string;
}

export interface IProductoCache {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  codigoBarras?: string;
  imagen?: string;
  categoriaId: string;
  tags?: string[];
  fechaActualizacion: Date;
}

export interface IStockLocal {
  id: string;
  productoId: string;
  ubicacionId: string;
  cantidad: number;
  fechaActualizacion: Date;
}

export interface IOperacionPendiente {
  id: string;
  tipo: 'venta' | 'ajuste_stock' | 'recepcion_envio';
  datos: any;
  estado: 'pendiente' | 'procesando' | 'completada' | 'error';
  fechaCreacion: Date;
  intentos: number;
  ultimoIntento?: Date;
  error?: string;
}