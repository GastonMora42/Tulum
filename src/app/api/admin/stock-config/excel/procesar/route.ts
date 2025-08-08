// src/app/api/admin/stock-config/excel/procesar/route.ts - VERSIÓN CORREGIDA CON TRANSACCIONES OPTIMIZADAS
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { stockService } from '@/server/services/stock/stockService';
import { stockSucursalService } from '@/server/services/stock/stockSucursalService';
import * as XLSX from 'xlsx';

// ⏱️ CONFIGURACIÓN OPTIMIZADA
const MAX_PROCESSING_TIME = 25000; // 25 segundos
const BATCH_SIZE = 20; // Procesar 20 items por lote
const TRANSACTION_BATCH_SIZE = 10; // Máximo 10 items por transacción
const MAX_ROWS = 1000;
const TRANSACTION_TIMEOUT = 5000; // 5 segundos máximo por transacción

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  const authError = await authMiddleware(req);
  if (authError) return authError;

  const permError = await checkPermission('admin')(req);
  if (permError) return permError;

  try {
    const user = (req as any).user;
    const formData = await req.formData();
    
    const file = formData.get('file') as File;
    const sucursalId = formData.get('sucursalId') as string;
    const modo = formData.get('modo') as string || 'establecer';

    if (!file || !sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere archivo y sucursalId' },
        { status: 400 }
      );
    }

    console.log(`[EXCEL-PROCESS] ⚡ Iniciando procesamiento optimizado: ${file.name}`);

    // ✅ VALIDACIONES RÁPIDAS
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Archivo demasiado grande (máximo 5MB)' },
        { status: 400 }
      );
    }

    const sucursal = await prisma.ubicacion.findUnique({
      where: { id: sucursalId }
    });

    if (!sucursal) {
      return NextResponse.json(
        { error: 'Sucursal no encontrada' },
        { status: 404 }
      );
    }

    // ✅ LEER Y VALIDAR EXCEL
    const buffer = Buffer.from(await file.arrayBuffer());
    let workbook: XLSX.WorkBook;
    
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch (xlsxError) {
      return NextResponse.json(
        { error: 'Archivo Excel inválido o corrupto' },
        { status: 400 }
      );
    }

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!worksheet) {
      return NextResponse.json(
        { error: 'No se encontraron datos en el archivo Excel' },
        { status: 400 }
      );
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '' 
    }) as any[][];

    if (jsonData.length < 2) {
      return NextResponse.json(
        { error: 'El archivo no contiene datos de productos' },
        { status: 400 }
      );
    }

    if (jsonData.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Archivo demasiado grande. Máximo ${MAX_ROWS} filas` },
        { status: 400 }
      );
    }

    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1);

    // ✅ VALIDAR ENCABEZADOS
    const columnIndices = {
      id: headers.findIndex(h => h && h.toString().trim() === 'ID'),
      nuevoStock: headers.findIndex(h => h && h.toString().trim() === 'Nuevo Stock'),
      observaciones: headers.findIndex(h => h && h.toString().trim() === 'Observaciones')
    };

    if (columnIndices.id === -1 || columnIndices.nuevoStock === -1) {
      return NextResponse.json(
        { error: 'Faltan columnas requeridas: ID, Nuevo Stock' },
        { status: 400 }
      );
    }

    console.log(`[EXCEL-PROCESS] 📊 Archivo validado: ${dataRows.length} filas`);

    // ✅ CREAR REGISTRO DE CARGA
    const cargaMasiva = await prisma.cargaMasivaStock.create({
      data: {
        nombre: `Carga Excel: ${file.name}`,
        descripcion: `Carga masiva desde Excel - ${file.name}`,
        sucursalId,
        usuarioId: user.id,
        totalItems: dataRows.length,
        estado: 'procesando',
        archivoNombre: file.name
      }
    });

    console.log(`[EXCEL-PROCESS] 📝 Registro creado: ${cargaMasiva.id}`);

    // ✅ PRECARGA DE DATOS
    console.log(`[EXCEL-PROCESS] 🔄 Precargando datos...`);
    
    const productIds = dataRows
      .map(row => row[columnIndices.id]?.toString().trim())
      .filter(Boolean);

    const productosMap = new Map();
    const productos = await prisma.producto.findMany({
      where: { 
        id: { in: productIds },
        activo: true 
      },
      include: { categoria: true }
    });
    
    productos.forEach(p => productosMap.set(p.id, p));
    console.log(`[EXCEL-PROCESS] 📦 Productos cargados: ${productos.length}/${productIds.length}`);

    const stocksMap = new Map();
    const stocks = await prisma.stock.findMany({
      where: {
        ubicacionId: sucursalId,
        productoId: { in: productIds }
      }
    });
    
    stocks.forEach(s => stocksMap.set(s.productoId, s));
    console.log(`[EXCEL-PROCESS] 📊 Stocks cargados: ${stocks.length}`);

    // ✅ 🚀 PROCESAMIENTO OPTIMIZADO CON TRANSACCIONES DIVIDIDAS
    let itemsProcesados = 0;
    let itemsErrores = 0;
    const resultados = [];

    // Dividir en lotes para evitar timeout
    const batches = [];
    for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
      batches.push(dataRows.slice(i, i + BATCH_SIZE));
    }

    console.log(`[EXCEL-PROCESS] 🔀 Procesando en ${batches.length} lotes de ${BATCH_SIZE} items`);

    // Procesar cada lote
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // ⏱️ VERIFICAR TIMEOUT
      if (Date.now() - startTime > MAX_PROCESSING_TIME) {
        console.log(`[EXCEL-PROCESS] ⏰ Timeout alcanzado, procesando parcialmente`);
        break;
      }

      console.log(`[EXCEL-PROCESS] 🔄 Procesando lote ${batchIndex + 1}/${batches.length}`);

      // 🔧 PROCESAR LOTE CON TRANSACCIONES DIVIDIDAS
      const batchResults = await procesarLoteConTransaccionesDivididas(
        batch,
        batchIndex * BATCH_SIZE,
        columnIndices,
        productosMap,
        stocksMap,
        sucursalId,
        modo,
        user.id,
        cargaMasiva.id,
        file.name
      );

      // Procesar resultados del lote
      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i];
        const globalRowIndex = batchIndex * BATCH_SIZE + i;
        
        if (result.success) {
          itemsProcesados++;
          resultados.push({
            fila: globalRowIndex + 2,
            producto: result.data.producto,
            stockAnterior: result.data.cantidadAnterior,
            stockNuevo: result.data.cantidadNueva,
            diferencia: result.data.cantidadNueva - result.data.cantidadAnterior,
            estado: 'procesado'
          });
        } else {
          itemsErrores++;
          resultados.push({
            fila: globalRowIndex + 2,
            estado: 'error',
            error: result.error
          });
        }
      }
    }

    console.log(`[EXCEL-PROCESS] 📊 Procesamiento completado: ${itemsProcesados} procesados, ${itemsErrores} errores`);

    // ✅ FINALIZAR REGISTRO DE CARGA
    const cargaFinalizada = await prisma.cargaMasivaStock.update({
      where: { id: cargaMasiva.id },
      data: {
        estado: itemsErrores === 0 ? 'completado' : 'completado_con_errores',
        itemsProcesados,
        itemsErrores,
        fechaFin: new Date()
      },
      include: {
        sucursal: true,
        usuario: {
          select: { name: true, email: true }
        }
      }
    });

    const resumen = {
      totalItems: dataRows.length,
      itemsProcesados,
      itemsErrores,
      porcentajeExito: Math.round((itemsProcesados / dataRows.length) * 100),
      tiempoProcesamiento: Math.round((Date.now() - startTime) / 1000)
    };

    console.log(`[EXCEL-PROCESS] 🏁 Completado en ${resumen.tiempoProcesamiento}s:`, resumen);

    return NextResponse.json({
      success: true,
      mensaje: `Archivo procesado: ${itemsProcesados} productos actualizados${itemsErrores > 0 ? `, ${itemsErrores} errores` : ''}`,
      carga: cargaFinalizada,
      resumen,
      resultados: resultados.slice(0, 50),
      detalles: {
        archivo: file.name,
        sucursal: sucursal.nombre,
        fechaProcesamiento: new Date(),
        usuario: user.name,
        optimizaciones: {
          usoBatches: true,
          batchSize: BATCH_SIZE,
          transactionBatchSize: TRANSACTION_BATCH_SIZE,
          precargaDatos: true,
          transaccionesDivididas: true
        }
      }
    });

  } catch (error) {
    console.error('[EXCEL-PROCESS] ❌ Error general:', error);
    return NextResponse.json(
      { 
        error: 'Error al procesar archivo Excel',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// 🚀 NUEVA FUNCIÓN: PROCESAR LOTE CON TRANSACCIONES DIVIDIDAS
async function procesarLoteConTransaccionesDivididas(
  batch: any[],
  startIndex: number,
  columnIndices: any,
  productosMap: Map<string, any>,
  stocksMap: Map<string, any>,
  sucursalId: string,
  modo: string,
  usuarioId: string,
  cargaId: string,
  fileName: string
): Promise<Array<{ success: boolean; data?: any; error?: string }>> {
  
  const resultados = [];
  
  // 🔄 DIVIDIR EL LOTE EN SUB-LOTES PARA TRANSACCIONES
  const transactionBatches = [];
  for (let i = 0; i < batch.length; i += TRANSACTION_BATCH_SIZE) {
    transactionBatches.push(batch.slice(i, i + TRANSACTION_BATCH_SIZE));
  }
  
  console.log(`[EXCEL-PROCESS] 🔀 Dividiendo lote en ${transactionBatches.length} transacciones de máximo ${TRANSACTION_BATCH_SIZE} items`);
  
  // Procesar cada sub-lote en su propia transacción
  for (let txIndex = 0; txIndex < transactionBatches.length; txIndex++) {
    const txBatch = transactionBatches[txIndex];
    
    try {
      // 🎯 TRANSACCIÓN OPTIMIZADA CON TIMEOUT
      const txResults = await Promise.race([
        procesarTransaccionOptimizada(
          txBatch, 
          startIndex + txIndex * TRANSACTION_BATCH_SIZE,
          columnIndices,
          productosMap,
          stocksMap,
          sucursalId,
          modo,
          usuarioId,
          cargaId,
          fileName
        ),
        // Timeout de seguridad
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout en transacción')), TRANSACTION_TIMEOUT)
        )
      ]) as Array<{ success: boolean; data?: any; error?: string }>;
      
      resultados.push(...txResults);
      
    } catch (txError) {
      console.error(`[EXCEL-PROCESS] ❌ Error en transacción ${txIndex + 1}:`, txError);
      
      // Marcar todos los items de esta transacción como error
      for (let i = 0; i < txBatch.length; i++) {
        resultados.push({
          success: false,
          error: `Error en transacción: ${txError instanceof Error ? txError.message : 'Error desconocido'}`
        });
      }
    }
  }
  
  return resultados;
}

// 🎯 FUNCIÓN DE TRANSACCIÓN OPTIMIZADA
async function procesarTransaccionOptimizada(
  items: any[],
  startIndex: number,
  columnIndices: any,
  productosMap: Map<string, any>,
  stocksMap: Map<string, any>,
  sucursalId: string,
  modo: string,
  usuarioId: string,
  cargaId: string,
  fileName: string
): Promise<Array<{ success: boolean; data?: any; error?: string }>> {
  
  return await prisma.$transaction(async (tx) => {
    const resultados = [];
    
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const filaNumero = startIndex + i + 2; // +2 porque empezamos en fila 2 del Excel
      
      try {
        // Procesar fila individual
        const resultado = await procesarFilaOptimizada(
          row,
          filaNumero,
          columnIndices,
          productosMap,
          stocksMap,
          sucursalId,
          modo,
          usuarioId
        );
        
        if (!resultado.success) {
          throw new Error(resultado.error);
        }
        
        const data = resultado.data!;
        
        // 🔧 APLICAR CAMBIOS EN LA BASE DE DATOS DENTRO DE LA TRANSACCIÓN
        
        // 1. Crear o actualizar stock
        if (data.stockUpdate.shouldCreate) {
          await tx.stock.create({
            data: {
              productoId: data.stockUpdate.productoId,
              ubicacionId: sucursalId,
              cantidad: data.stockUpdate.cantidadNueva,
              ultimaActualizacion: new Date()
            }
          });
        } else if (data.stockUpdate.diferencia !== 0) {
          await tx.stock.update({
            where: { id: data.stockUpdate.stockId },
            data: {
              cantidad: data.stockUpdate.cantidadNueva,
              ultimaActualizacion: new Date(),
              version: { increment: 1 }
            }
          });
        }
        
        // 2. Crear movimiento de stock si hay cambio
        if (data.stockUpdate.diferencia !== 0) {
          const stockRecord = await tx.stock.findFirst({
            where: {
              productoId: data.stockUpdate.productoId,
              ubicacionId: sucursalId
            }
          });

          if (stockRecord) {
            await tx.movimientoStock.create({
              data: {
                stockId: stockRecord.id,
                tipoMovimiento: data.stockUpdate.diferencia > 0 ? 'entrada' : 'salida',
                cantidad: Math.abs(data.stockUpdate.diferencia),
                motivo: `Carga Excel: ${fileName}`,
                usuarioId: usuarioId,
                fecha: new Date()
              }
            });
          }
        }
        
        // 3. Crear item de carga masiva
        await tx.cargaMasivaStockItem.create({
          data: {
            cargaId: cargaId,
            productoId: data.producto.id,
            codigoBarras: data.producto.codigoBarras,
            nombreProducto: data.producto.nombre,
            cantidadCargar: row[columnIndices.nuevoStock],
            cantidadAnterior: data.cantidadAnterior,
            cantidadFinal: data.cantidadNueva,
            estado: 'procesado',
            procesadoEn: new Date()
          }
        });
        
        resultados.push({
          success: true,
          data
        });
        
      } catch (error) {
        console.error(`[EXCEL-PROCESS] ❌ Error procesando fila ${filaNumero}:`, error);
        
        // Crear item con error dentro de la transacción
        await tx.cargaMasivaStockItem.create({
          data: {
            cargaId: cargaId,
            codigoBarras: row[columnIndices.id] || '',
            nombreProducto: `Fila ${filaNumero}`,
            cantidadCargar: 0,
            estado: 'error',
            error: error instanceof Error ? error.message.substring(0, 500) : 'Error desconocido'
          }
        });
        
        resultados.push({
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }
    
    return resultados;
  }, {
    timeout: TRANSACTION_TIMEOUT // Timeout específico para la transacción
  });
}

// 🚀 FUNCIÓN OPTIMIZADA PARA PROCESAR CADA FILA (sin cambios, mantener la misma)
async function procesarFilaOptimizada(
  row: any[],
  filaNumero: number,
  columnIndices: any,
  productosMap: Map<string, any>,
  stocksMap: Map<string, any>,
  sucursalId: string,
  modo: string,
  usuarioId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  
  try {
    const productoId = row[columnIndices.id]?.toString().trim();
    const nuevoStockStr = row[columnIndices.nuevoStock]?.toString().trim();

    if (!productoId || !nuevoStockStr) {
      throw new Error(`Fila ${filaNumero}: ID o Stock vacío`);
    }

    const nuevoStock = parseFloat(nuevoStockStr);
    if (isNaN(nuevoStock) || nuevoStock < 0) {
      throw new Error(`Fila ${filaNumero}: Stock debe ser un número positivo`);
    }

    const producto = productosMap.get(productoId);
    if (!producto) {
      throw new Error(`Fila ${filaNumero}: Producto no encontrado - ${productoId}`);
    }

    const stockActual = stocksMap.get(productoId);
    const cantidadAnterior = stockActual?.cantidad || 0;

    let cantidadFinal = 0;
    let diferencia = 0;

    switch (modo) {
      case 'incrementar':
        cantidadFinal = cantidadAnterior + nuevoStock;
        diferencia = nuevoStock;
        break;
      case 'establecer':
        cantidadFinal = nuevoStock;
        diferencia = nuevoStock - cantidadAnterior;
        break;
      case 'decrementar':
        cantidadFinal = Math.max(0, cantidadAnterior - nuevoStock);
        diferencia = -(Math.min(cantidadAnterior, nuevoStock));
        break;
      default:
        throw new Error('Modo inválido');
    }

    const stockUpdate = {
      productoId: producto.id,
      stockId: stockActual?.id,
      shouldCreate: !stockActual,
      cantidadAnterior,
      cantidadNueva: cantidadFinal,
      diferencia
    };

    return {
      success: true,
      data: {
        producto,
        cantidadAnterior,
        cantidadNueva: cantidadFinal,
        diferencia,
        stockUpdate
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}