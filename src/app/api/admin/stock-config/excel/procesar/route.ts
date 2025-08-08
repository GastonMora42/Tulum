// src/app/api/admin/stock-config/excel/procesar/route.ts - VERSIÓN CORREGIDA CON STOCK SERVICE
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { stockService } from '@/server/services/stock/stockService';
import { stockSucursalService } from '@/server/services/stock/stockSucursalService';
import * as XLSX from 'xlsx';

// ⏱️ CONFIGURACIÓN OPTIMIZADA
const MAX_PROCESSING_TIME = 25000; // 25 segundos
const BATCH_SIZE = 15; // Reducido para mejor manejo
const MAX_ROWS = 1000;

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

    console.log(`[EXCEL-PROCESS] ⚡ Iniciando procesamiento: ${file.name}, modo: ${modo}`);

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

    // ✅ 🚀 PROCESAMIENTO SECUENCIAL CON STOCK SERVICE
    let itemsProcesados = 0;
    let itemsErrores = 0;
    const resultados = [];

    // Dividir en lotes para evitar timeout
    const batches = [];
    for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
      batches.push(dataRows.slice(i, i + BATCH_SIZE));
    }

    console.log(`[EXCEL-PROCESS] 🔀 Procesando en ${batches.length} lotes de ${BATCH_SIZE} items`);

    // Procesar cada lote SECUENCIALMENTE para evitar problemas de concurrencia
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // ⏱️ VERIFICAR TIMEOUT
      if (Date.now() - startTime > MAX_PROCESSING_TIME) {
        console.log(`[EXCEL-PROCESS] ⏰ Timeout alcanzado, procesando parcialmente`);
        break;
      }

      console.log(`[EXCEL-PROCESS] 🔄 Procesando lote ${batchIndex + 1}/${batches.length}`);

      // 🔧 PROCESAR CADA ITEM DEL LOTE SECUENCIALMENTE
      for (let itemIndex = 0; itemIndex < batch.length; itemIndex++) {
        const row = batch[itemIndex];
        const globalRowIndex = batchIndex * BATCH_SIZE + itemIndex;
        const filaNumero = globalRowIndex + 2; // +2 porque empezamos en fila 2 del Excel

        try {
          const resultado = await procesarItemConStockService(
            row,
            filaNumero,
            columnIndices,
            productosMap,
            sucursalId,
            modo,
            user.id,
            cargaMasiva.id,
            file.name
          );

          if (resultado.success) {
            itemsProcesados++;
            resultados.push({
              fila: filaNumero,
              producto: resultado.data.producto,
              stockAnterior: resultado.data.stockAnterior,
              stockNuevo: resultado.data.stockFinal,
              diferencia: resultado.data.diferencia,
              estado: 'procesado'
            });

            console.log(`[EXCEL-PROCESS] ✅ Item ${itemsProcesados}/${dataRows.length}: ${resultado.data.producto.nombre} (${resultado.data.stockAnterior} → ${resultado.data.stockFinal})`);
          } else {
            itemsErrores++;
            resultados.push({
              fila: filaNumero,
              estado: 'error',
              error: resultado.error
            });

            console.log(`[EXCEL-PROCESS] ❌ Error fila ${filaNumero}: ${resultado.error}`);
          }

        } catch (error) {
          itemsErrores++;
          const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
          
          console.error(`[EXCEL-PROCESS] ❌ Error inesperado fila ${filaNumero}:`, error);
          
          resultados.push({
            fila: filaNumero,
            estado: 'error',
            error: errorMsg
          });

          // Crear item de error en la base de datos
          try {
            await prisma.cargaMasivaStockItem.create({
              data: {
                cargaId: cargaMasiva.id,
                codigoBarras: row[columnIndices.id] || '',
                nombreProducto: `Fila ${filaNumero}`,
                cantidadCargar: 0,
                estado: 'error',
                error: errorMsg.substring(0, 500)
              }
            });
          } catch (dbError) {
            console.error(`[EXCEL-PROCESS] Error guardando item de error:`, dbError);
          }
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
          procesamientoSecuencial: true,
          usoStockService: true
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

// 🎯 NUEVA FUNCIÓN: PROCESAR ITEM USANDO STOCK SERVICE
async function procesarItemConStockService(
  row: any[],
  filaNumero: number,
  columnIndices: any,
  productosMap: Map<string, any>,
  sucursalId: string,
  modo: string,
  usuarioId: string,
  cargaId: string,
  fileName: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  
  try {
    // 1. VALIDAR Y EXTRAER DATOS
    const productoId = row[columnIndices.id]?.toString().trim();
    const nuevoStockStr = row[columnIndices.nuevoStock]?.toString().trim();

    if (!productoId || !nuevoStockStr) {
      throw new Error(`Fila ${filaNumero}: ID o Stock vacío`);
    }

    const nuevoStock = parseFloat(nuevoStockStr);
    if (isNaN(nuevoStock) || nuevoStock < 0) {
      throw new Error(`Fila ${filaNumero}: Stock debe ser un número positivo (recibido: ${nuevoStockStr})`);
    }

    // 2. VERIFICAR PRODUCTO
    const producto = productosMap.get(productoId);
    if (!producto) {
      throw new Error(`Fila ${filaNumero}: Producto no encontrado - ${productoId}`);
    }

    console.log(`[EXCEL-PROCESS] 🔍 Procesando: ${producto.nombre} (${productoId}) → ${nuevoStock}`);

    // 3. OBTENER STOCK ACTUAL (SIEMPRE FRESCO DE LA BD)
    const stockActual = await prisma.stock.findFirst({
      where: {
        productoId: producto.id,
        ubicacionId: sucursalId
      }
    });

    const cantidadAnterior = stockActual?.cantidad || 0;
    console.log(`[EXCEL-PROCESS] 📊 Stock actual de ${producto.nombre}: ${cantidadAnterior}`);

    // 4. CALCULAR AJUSTE SEGÚN MODO
    let cantidadAjuste = 0;
    let cantidadFinal = 0;

    switch (modo) {
      case 'incrementar':
        cantidadAjuste = nuevoStock;
        cantidadFinal = cantidadAnterior + nuevoStock;
        break;
      case 'establecer':
        cantidadAjuste = nuevoStock - cantidadAnterior;
        cantidadFinal = nuevoStock;
        break;
      case 'decrementar':
        cantidadAjuste = -nuevoStock;
        cantidadFinal = Math.max(0, cantidadAnterior - nuevoStock);
        break;
      default:
        throw new Error(`Modo inválido: ${modo}`);
    }

    console.log(`[EXCEL-PROCESS] 🧮 Cálculo: ${cantidadAnterior} ${modo === 'incrementar' ? '+' : modo === 'decrementar' ? '-' : '→'} ${nuevoStock} = ${cantidadFinal} (ajuste: ${cantidadAjuste})`);

    // 5. APLICAR AJUSTE USANDO STOCK SERVICE (SOLO SI HAY CAMBIO)
    let resultadoStock = null;
    if (cantidadAjuste !== 0) {
      console.log(`[EXCEL-PROCESS] 🔄 Aplicando ajuste de ${cantidadAjuste} para ${producto.nombre}`);
      
      resultadoStock = await stockService.ajustarStock({
        productoId: producto.id,
        ubicacionId: sucursalId,
        cantidad: cantidadAjuste,
        motivo: `Carga Excel: ${fileName} - Fila ${filaNumero}`,
        usuarioId: usuarioId,
        allowNegative: true // Admin puede hacer ajustes negativos
      });

      console.log(`[EXCEL-PROCESS] ✅ Stock ajustado para ${producto.nombre}. Nuevo stock: ${resultadoStock.stock.cantidad}`);
    } else {
      console.log(`[EXCEL-PROCESS] ⏸️ Sin cambios para ${producto.nombre} (ajuste = 0)`);
    }

    // 6. VERIFICAR STOCK FINAL REAL
    const stockFinalVerificacion = await prisma.stock.findFirst({
      where: {
        productoId: producto.id,
        ubicacionId: sucursalId
      }
    });

    const stockFinalReal = stockFinalVerificacion?.cantidad || 0;
    console.log(`[EXCEL-PROCESS] 🔍 Stock final verificado para ${producto.nombre}: ${stockFinalReal}`);

    // 7. CREAR REGISTRO EN CARGA MASIVA
    await prisma.cargaMasivaStockItem.create({
      data: {
        cargaId: cargaId,
        productoId: producto.id,
        codigoBarras: producto.codigoBarras,
        nombreProducto: producto.nombre,
        cantidadCargar: nuevoStock,
        cantidadAnterior: cantidadAnterior,
        cantidadFinal: stockFinalReal,
        estado: 'procesado',
        procesadoEn: new Date()
      }
    });

    console.log(`[EXCEL-PROCESS] 📝 Registro creado para ${producto.nombre}: ${cantidadAnterior} → ${stockFinalReal}`);

    // 8. GENERAR/ACTUALIZAR CONFIGURACIÓN Y ALERTAS
    try {
      await stockSucursalService.crearConfiguracionAutomatica(
        producto.id, 
        sucursalId, 
        usuarioId, 
        stockFinalReal
      );
      
      await stockSucursalService.verificarYGenerarAlertas(producto.id, sucursalId);
    } catch (configError) {
      console.warn(`[EXCEL-PROCESS] ⚠️ No se pudo crear configuración/alertas para ${producto.nombre}:`, configError);
      // No fallar la operación por esto
    }

    return {
      success: true,
      data: {
        producto: {
          id: producto.id,
          nombre: producto.nombre,
          codigoBarras: producto.codigoBarras
        },
        stockAnterior: cantidadAnterior,
        stockFinal: stockFinalReal,
        diferencia: stockFinalReal - cantidadAnterior,
        ajusteAplicado: cantidadAjuste,
        movimiento: resultadoStock?.movimiento || null
      }
    };

  } catch (error) {
    console.error(`[EXCEL-PROCESS] ❌ Error procesando fila ${filaNumero}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}