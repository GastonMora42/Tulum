// src/app/api/admin/stock-config/excel/procesar/route.ts - VERSIÓN OPTIMIZADA
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { stockService } from '@/server/services/stock/stockService';
import { stockSucursalService } from '@/server/services/stock/stockSucursalService';
import * as XLSX from 'xlsx';

// ⏱️ CONFIGURACIÓN DE TIMEOUTS
const MAX_PROCESSING_TIME = 25000; // 25 segundos (5s margen para Vercel)
const BATCH_SIZE = 20; // Procesar 20 items por lote
const MAX_ROWS = 1000; // Límite máximo de filas

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

    // ✅ 1. VALIDACIÓN RÁPIDA DE ARCHIVO
    if (file.size > 5 * 1024 * 1024) { // 5MB
      return NextResponse.json(
        { error: 'Archivo demasiado grande (máximo 5MB)' },
        { status: 400 }
      );
    }

    // ✅ 2. VERIFICAR SUCURSAL EXISTE
    const sucursal = await prisma.ubicacion.findUnique({
      where: { id: sucursalId }
    });

    if (!sucursal) {
      return NextResponse.json(
        { error: 'Sucursal no encontrada' },
        { status: 404 }
      );
    }

    // ✅ 3. LEER Y VALIDAR EXCEL
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

    // ✅ 4. CONVERTIR Y VALIDAR DATOS
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

    // ✅ 5. VALIDAR ENCABEZADOS REQUERIDOS
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

    // ✅ 6. CREAR REGISTRO DE CARGA
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

    // ✅ 7. **OPTIMIZACIÓN CLAVE**: PRECARGA DE DATOS
    console.log(`[EXCEL-PROCESS] 🔄 Precargando datos...`);
    
    // Extraer todos los IDs de productos del Excel
    const productIds = dataRows
      .map(row => row[columnIndices.id]?.toString().trim())
      .filter(Boolean);

    // 🚀 CONSULTA EN LOTE: Cargar todos los productos necesarios
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

    // 🚀 CONSULTA EN LOTE: Cargar todo el stock actual de la sucursal
    const stocksMap = new Map();
    const stocks = await prisma.stock.findMany({
      where: {
        ubicacionId: sucursalId,
        productoId: { in: productIds }
      }
    });
    
    stocks.forEach(s => stocksMap.set(s.productoId, s));
    console.log(`[EXCEL-PROCESS] 📊 Stocks cargados: ${stocks.length}`);

    // ✅ 8. **PROCESAMIENTO OPTIMIZADO EN LOTES**
    let itemsProcesados = 0;
    let itemsErrores = 0;
    const resultados = [];
    const stockUpdates = []; // Para batch updates
    const itemsToCreate = []; // Para batch inserts

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

      // Procesar items del lote en paralelo (pero con límite)
      const batchPromises = batch.map(async (row, rowIndex) => {
        const globalRowIndex = batchIndex * BATCH_SIZE + rowIndex;
        return await procesarFilaOptimizada(
          row,
          globalRowIndex + 2, // +2 porque empezamos en fila 2 del Excel
          columnIndices,
          productosMap,
          stocksMap,
          sucursalId,
          modo,
          user.id
        );
      });

      // Esperar todos los items del lote
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Procesar resultados del lote
      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i];
        const globalRowIndex = batchIndex * BATCH_SIZE + i;
        
        if (result.status === 'fulfilled' && result.value.success) {
          itemsProcesados++;
          
          const data = result.value.data;
          stockUpdates.push(data.stockUpdate);
          itemsToCreate.push({
            cargaId: cargaMasiva.id,
            productoId: data.producto.id,
            codigoBarras: data.producto.codigoBarras,
            nombreProducto: data.producto.nombre,
            cantidadCargar: data.cantidadNueva,
            cantidadAnterior: data.cantidadAnterior,
            cantidadFinal: data.cantidadNueva,
            estado: 'procesado',
            procesadoEn: new Date()
          });

          resultados.push({
            fila: globalRowIndex + 2,
            producto: {
              id: data.producto.id,
              nombre: data.producto.nombre
            },
            stockAnterior: data.cantidadAnterior,
            stockNuevo: data.cantidadNueva,
            diferencia: data.cantidadNueva - data.cantidadAnterior,
            estado: 'procesado'
          });
        } else {
          itemsErrores++;
          const errorMsg = result.status === 'rejected' 
            ? result.reason?.message || 'Error desconocido'
            : result.value.error;

          itemsToCreate.push({
            cargaId: cargaMasiva.id,
            nombreProducto: `Fila ${globalRowIndex + 2}`,
            cantidadCargar: 0,
            estado: 'error',
            error: errorMsg.substring(0, 500)
          });

          resultados.push({
            fila: globalRowIndex + 2,
            estado: 'error',
            error: errorMsg
          });
        }
      }
    }

    console.log(`[EXCEL-PROCESS] 📊 Procesamiento completado: ${itemsProcesados} procesados, ${itemsErrores} errores`);

    // ✅ 9. **ACTUALIZACIÓN EN LOTES** - MUY IMPORTANTE PARA PERFORMANCE
    if (stockUpdates.length > 0) {
      console.log(`[EXCEL-PROCESS] 💾 Aplicando ${stockUpdates.length} actualizaciones de stock...`);
      
      try {
        await prisma.$transaction(async (tx) => {
          // Aplicar todas las actualizaciones de stock en lotes
          for (const update of stockUpdates) {
            if (update.shouldCreate) {
              await tx.stock.create({
                data: {
                  productoId: update.productoId,
                  ubicacionId: sucursalId,
                  cantidad: update.cantidadNueva,
                  ultimaActualizacion: new Date()
                }
              });
            } else {
              await tx.stock.update({
                where: { id: update.stockId },
                data: {
                  cantidad: update.cantidadNueva,
                  ultimaActualizacion: new Date(),
                  version: { increment: 1 }
                }
              });
            }

            // Crear movimiento de stock
            if (update.diferencia !== 0) {
              const stockRecord = await tx.stock.findFirst({
                where: {
                  productoId: update.productoId,
                  ubicacionId: sucursalId
                }
              });

              if (stockRecord) {
                await tx.movimientoStock.create({
                  data: {
                    stockId: stockRecord.id,
                    tipoMovimiento: update.diferencia > 0 ? 'entrada' : 'salida',
                    cantidad: Math.abs(update.diferencia),
                    motivo: `Carga Excel: ${file.name}`,
                    usuarioId: user.id,
                    fecha: new Date()
                  }
                });
              }
            }
          }

          // Crear todos los items de la carga en lote
          if (itemsToCreate.length > 0) {
            // Prisma no soporta createMany con MySQL, así que usamos un loop optimizado
            for (const item of itemsToCreate) {
              await tx.cargaMasivaStockItem.create({ data: item });
            }
          }
        });

        console.log(`[EXCEL-PROCESS] ✅ Actualizaciones aplicadas exitosamente`);
      } catch (dbError) {
        console.error(`[EXCEL-PROCESS] ❌ Error en actualización de stock:`, dbError);
        
        // Continuar pero marcar como completado con errores
        itemsErrores += stockUpdates.length;
        itemsProcesados -= stockUpdates.length;
      }
    }

    // ✅ 10. FINALIZAR REGISTRO DE CARGA
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

    // ✅ 11. RESPUESTA OPTIMIZADA
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
      resultados: resultados.slice(0, 50), // Limitar respuesta
      detalles: {
        archivo: file.name,
        sucursal: sucursal.nombre,
        fechaProcesamiento: new Date(),
        usuario: user.name,
        optimizaciones: {
          usoBatches: true,
          batchSize: BATCH_SIZE,
          precargaDatos: true,
          updateEnLotes: true
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

// 🚀 FUNCIÓN OPTIMIZADA PARA PROCESAR CADA FILA
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
    // Extraer datos de la fila
    const productoId = row[columnIndices.id]?.toString().trim();
    const nuevoStockStr = row[columnIndices.nuevoStock]?.toString().trim();

    if (!productoId || !nuevoStockStr) {
      throw new Error(`Fila ${filaNumero}: ID o Stock vacío`);
    }

    const nuevoStock = parseFloat(nuevoStockStr);
    if (isNaN(nuevoStock) || nuevoStock < 0) {
      throw new Error(`Fila ${filaNumero}: Stock debe ser un número positivo`);
    }

    // 🚀 OPTIMIZACIÓN: Usar datos precargados en lugar de consultas
    const producto = productosMap.get(productoId);
    if (!producto) {
      throw new Error(`Fila ${filaNumero}: Producto no encontrado - ${productoId}`);
    }

    const stockActual = stocksMap.get(productoId);
    const cantidadAnterior = stockActual?.cantidad || 0;

    // Calcular diferencia
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

    // Preparar datos para actualización en lote
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