
// src/utils/reportesUtils.ts - UTILIDADES PARA REPORTES
import { format, parseISO, differenceInDays, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

// ============= TIPOS =============
export interface MetricaComparacion {
  valor: number;
  valorAnterior: number;
  cambio: number;
  porcentajeCambio: number;
  tendencia: 'up' | 'down' | 'stable';
}

export interface PuntoGrafico {
  x: string | number;
  y: number;
  categoria?: string;
  fecha?: Date;
  metadata?: Record<string, any>;
}

export interface ConfiguracionExportacion {
  incluirGraficos: boolean;
  incluirTablas: boolean;
  incluirResumen: boolean;
  formato: 'pdf' | 'excel' | 'csv';
  orientacion?: 'portrait' | 'landscape';
}

// ============= FORMATEADORES =============
export const formatters = {
  /**
   * Formatear moneda
   */
  moneda: (valor: number, decimales: number = 2): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales
    }).format(valor);
  },

  /**
   * Formatear número con separadores
   */
  numero: (valor: number, decimales: number = 0): string => {
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales
    }).format(valor);
  },

  /**
   * Formatear porcentaje
   */
  porcentaje: (valor: number, decimales: number = 1): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'percent',
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales
    }).format(valor / 100);
  },

  /**
   * Formatear fecha
   */
  fecha: (fecha: string | Date, formato: string = 'dd/MM/yyyy'): string => {
    const date = typeof fecha === 'string' ? parseISO(fecha) : fecha;
    return format(date, formato, { locale: es });
  },

  /**
   * Formatear duración
   */
  duracion: (minutos: number): string => {
    if (minutos < 60) {
      return `${minutos}m`;
    }
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  },

  /**
   * Abreviar números grandes
   */
  numeroAbreviado: (valor: number): string => {
    if (valor >= 1000000) {
      return `${(valor / 1000000).toFixed(1)}M`;
    } else if (valor >= 1000) {
      return `${(valor / 1000).toFixed(1)}K`;
    }
    return valor.toString();
  }
};

// ============= CALCULADORAS =============
export const calculadoras = {
  /**
   * Calcular cambio entre dos valores
   */
  cambio: (actual: number, anterior: number): MetricaComparacion => {
    const cambio = actual - anterior;
    const porcentajeCambio = anterior !== 0 ? (cambio / anterior) * 100 : 
                            actual > 0 ? 100 : 0;
    
    return {
      valor: actual,
      valorAnterior: anterior,
      cambio,
      porcentajeCambio,
      tendencia: cambio > 0 ? 'up' : cambio < 0 ? 'down' : 'stable'
    };
  },

  /**
   * Calcular tasa de crecimiento
   */
  tasaCrecimiento: (valores: number[]): number => {
    if (valores.length < 2) return 0;
    
    const inicial = valores[0];
    const final = valores[valores.length - 1];
    
    if (inicial === 0) return final > 0 ? 100 : 0;
    return ((final - inicial) / inicial) * 100;
  },

  /**
   * Calcular promedio móvil
   */
  promedioMovil: (datos: number[], ventana: number): number[] => {
    const resultado: number[] = [];
    
    for (let i = 0; i < datos.length; i++) {
      if (i < ventana - 1) {
        resultado.push(datos[i]);
        continue;
      }
      
      const suma = datos.slice(i - ventana + 1, i + 1).reduce((acc, val) => acc + val, 0);
      resultado.push(suma / ventana);
    }
    
    return resultado;
  },

  /**
   * Calcular correlación entre dos series
   */
  correlacion: (x: number[], y: number[]): number => {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((acc, val) => acc + val, 0);
    const sumY = y.reduce((acc, val) => acc + val, 0);
    const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0);
    const sumX2 = x.reduce((acc, val) => acc + val * val, 0);
    const sumY2 = y.reduce((acc, val) => acc + val * val, 0);
    
    const numerador = n * sumXY - sumX * sumY;
    const denominador = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominador === 0 ? 0 : numerador / denominador;
  },

  /**
   * Detectar outliers usando IQR
   */
  detectarOutliers: (datos: number[]): { indices: number[]; valores: number[] } => {
    const sorted = [...datos].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    const outliers = {
      indices: [] as number[],
      valores: [] as number[]
    };
    
    datos.forEach((valor, index) => {
      if (valor < lowerBound || valor > upperBound) {
        outliers.indices.push(index);
        outliers.valores.push(valor);
      }
    });
    
    return outliers;
  }
};

// ============= TRANSFORMADORES DE DATOS =============
export const transformadores = {
  /**
   * Agrupar datos por período
   */
  agruparPorPeriodo: (
    datos: any[],
    campoFecha: string,
    periodo: 'dia' | 'semana' | 'mes' | 'año'
  ): Record<string, any[]> => {
    const agrupados: Record<string, any[]> = {};
    
    datos.forEach(item => {
      const fecha = new Date(item[campoFecha]);
      let clave: string;
      
      switch (periodo) {
        case 'dia':
          clave = format(fecha, 'yyyy-MM-dd');
          break;
        case 'semana':
          clave = format(fecha, 'yyyy-[W]ww');
          break;
        case 'mes':
          clave = format(fecha, 'yyyy-MM');
          break;
        case 'año':
          clave = format(fecha, 'yyyy');
          break;
      }
      
      if (!agrupados[clave]) {
        agrupados[clave] = [];
      }
      agrupados[clave].push(item);
    });
    
    return agrupados;
  },

  /**
   * Crear serie temporal completa
   */
  crearSerieCompleta: (
    fechaInicio: Date,
    fechaFin: Date,
    datos: Record<string, number>,
    valorPorDefecto: number = 0
  ): PuntoGrafico[] => {
    const dias = eachDayOfInterval({ start: fechaInicio, end: fechaFin });
    
    return dias.map(dia => {
      const clave = format(dia, 'yyyy-MM-dd');
      return {
        x: clave,
        y: datos[clave] || valorPorDefecto,
        fecha: dia
      };
    });
  },

  /**
   * Normalizar datos para gráficos
   */
  normalizarParaGrafico: (
    datos: any[],
    campoX: string,
    campoY: string,
    categoria?: string
  ): PuntoGrafico[] => {
    return datos.map(item => ({
      x: item[campoX],
      y: Number(item[campoY]) || 0,
      categoria: categoria ? item[categoria] : undefined,
      metadata: { ...item }
    }));
  },

  /**
   * Crear datos para mapa de calor
   */
  crearMapaCalor: (
    datos: any[],
    campoX: string,
    campoY: string,
    campoValor: string
  ): Array<{ x: any; y: any; value: number }> => {
    return datos.map(item => ({
      x: item[campoX],
      y: item[campoY],
      value: Number(item[campoValor]) || 0
    }));
  }
};

// ============= GENERADORES DE COLOR =============
export const colores: {
  paletas: {
    tulum: string[];
    azul: string[];
    verde: string[];
    rojo: string[];
    purpura: string[];
    naranja: string[];
  };
  gradiente: (colorInicio: string, colorFin: string, pasos: number) => string[];
  obtenerColor: (indice: number, paleta?: string[]) => string;
} = {
  /**
   * Paletas predefinidas
   */
  paletas: {
    tulum: ['#311716', '#9c7561', '#eeb077', '#462625', '#8a6550', '#d4a574'],
    azul: ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'],
    verde: ['#166534', '#16a34a', '#22c55e', '#4ade80', '#bbf7d0'],
    rojo: ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca'],
    purpura: ['#581c87', '#7c3aed', '#8b5cf6', '#a78bfa', '#ddd6fe'],
    naranja: ['#c2410c', '#ea580c', '#fb923c', '#fdba74', '#fed7aa']
  },

  /**
   * Generar gradiente
   */
  gradiente: (colorInicio: string, colorFin: string, pasos: number): string[] => {
    // Convertir colores hex a RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    const rgbToHex = (r: number, g: number, b: number) => {
      return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    };

    const inicio = hexToRgb(colorInicio);
    const fin = hexToRgb(colorFin);

    if (!inicio || !fin) return [colorInicio];

    const gradiente: string[] = [];
    
    for (let i = 0; i < pasos; i++) {
      const factor = i / (pasos - 1);
      const r = Math.round(inicio.r + factor * (fin.r - inicio.r));
      const g = Math.round(inicio.g + factor * (fin.g - inicio.g));
      const b = Math.round(inicio.b + factor * (fin.b - inicio.b));
      
      gradiente.push(rgbToHex(r, g, b));
    }
    
    return gradiente;
  },

  /**
   * Obtener color por índice de forma cíclica
   */
  obtenerColor: (indice: number, paleta: string[] = colores.paletas.tulum): string => {
    return paleta[indice % paleta.length];
  }
};

// ============= VALIDADORES =============
export const validadores = {
  /**
   * Validar rango de fechas
   */
  validarFechas: (inicio: string, fin: string): { esValido: boolean; error?: string } => {
    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);
    
    if (fechaInicio > fechaFin) {
      return { esValido: false, error: 'La fecha de inicio debe ser menor a la fecha fin' };
    }
    
    const diferenciaDias = differenceInDays(fechaFin, fechaInicio);
    if (diferenciaDias > 365) {
      return { esValido: false, error: 'El período no puede ser mayor a 1 año' };
    }
    
    if (diferenciaDias < 0) {
      return { esValido: false, error: 'Las fechas no son válidas' };
    }
    
    return { esValido: true };
  },

  /**
   * Validar datos mínimos para gráfico
   */
  validarDatosGrafico: (datos: any[]): { esValido: boolean; error?: string } => {
    if (!datos || datos.length === 0) {
      return { esValido: false, error: 'No hay datos para mostrar' };
    }
    
    if (datos.length < 2) {
      return { esValido: false, error: 'Se necesitan al menos 2 puntos de datos' };
    }
    
    return { esValido: true };
  }
};

// ============= UTILIDADES DE EXPORTACIÓN =============
export const exportacion = {
  /**
   * Preparar datos para CSV
   */
  prepararCSV: (datos: any[], columnas: string[]): string => {
    const headers = columnas.join(',');
    const filas = datos.map(fila => 
      columnas.map(col => {
        const valor = fila[col];
        // Escapar valores que contengan comas o comillas
        if (typeof valor === 'string' && (valor.includes(',') || valor.includes('"'))) {
          return `"${valor.replace(/"/g, '""')}"`;
        }
        return valor;
      }).join(',')
    );
    
    return [headers, ...filas].join('\n');
  },

  /**
   * Crear configuración de exportación
   */
  crearConfiguracion: (opciones: Partial<ConfiguracionExportacion> = {}): ConfiguracionExportacion => {
    return {
      incluirGraficos: true,
      incluirTablas: true,
      incluirResumen: true,
      formato: 'pdf',
      orientacion: 'portrait',
      ...opciones
    };
  }
};

// ============= UTILIDADES MATEMÁTICAS =============
export const matematicas = {
  /**
   * Calcular percentil
   */
  percentil: (datos: number[], p: number): number => {
    const sorted = [...datos].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    
    if (index % 1 === 0) {
      return sorted[index];
    } else {
      const lower = sorted[Math.floor(index)];
      const upper = sorted[Math.ceil(index)];
      return lower + (upper - lower) * (index % 1);
    }
  },

  /**
   * Calcular desviación estándar
   */
  desviacionEstandar: (datos: number[]): number => {
    if (datos.length === 0) return 0;
    
    const media = datos.reduce((acc, val) => acc + val, 0) / datos.length;
    const varianza = datos.reduce((acc, val) => acc + Math.pow(val - media, 2), 0) / datos.length;
    
    return Math.sqrt(varianza);
  },

  /**
   * Calcular coeficiente de variación
   */
  coeficienteVariacion: (datos: number[]): number => {
    if (datos.length === 0) return 0;
    
    const media = datos.reduce((acc, val) => acc + val, 0) / datos.length;
    const desviacion = matematicas.desviacionEstandar(datos);
    
    return media !== 0 ? (desviacion / media) * 100 : 0;
  }
};
