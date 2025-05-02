// src/types/models/producto.ts - Crear este archivo si no existe
export interface Producto {
    id: string;
    nombre: string;
    precio: number;
    descripcion?: string;
    codigoBarras?: string;
    imagen?: string;
    categoriaId: string; // Este es el campo obligatorio que falta
    categoria?: { nombre: string };
    stock?: number;
  }