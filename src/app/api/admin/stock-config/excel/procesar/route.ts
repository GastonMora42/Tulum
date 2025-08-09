// src/app/api/admin/stock-config/excel/procesar/route.ts - SIN TRANSACCIONES COMPLEJAS
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import * as XLSX from 'xlsx';

// ⚡ CONFIGURACIÓN SIMPLE Y EFECTIVA
const MAX_PROCESSING_TIME = 18000; // 18 segundos
const SIMPLE_BATCH_SIZE = 5; // Lotes muy pequeños
const MAX_ROWS = 500;

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

    console.log(`[EXCEL-SIMPLE] ⚡ Iniciando procesamiento simple: ${file.name}`);

    // ✅ VALIDACIONES BÁSICAS
    if (file.size > 3 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Archivo demasiado grande (máximo 3MB)' },
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

    // ✅ PROCESAR EXCEL
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (jsonData.length < 2) {
      return NextResponse.json(
        { error: 'El archivo no contiene datos' },
        { status: 400 }
      );
    }

    if (jsonData.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Máximo ${MAX_ROWS} filas permitidas` },
        { status: 400 }
      );
    }

    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1).filter(row => row && row.length > 0);

    const columnIndices = {
      id: headers.findIndex(h => h && h.toString().trim() === 'ID'),
      nuevoStock: headers.findIndex(h => h && h.toString().trim() === 'Nuevo Stock')
    };

    if (columnIndices.id === -1 || columnIndices.nuevoStock === -1) {
      return NextResponse.json(
        { error: 'Faltan columnas: ID, Nuevo Stock' },
        { status: 400 }
      );
    }

    console.log(`[EXCEL-SIMPLE] 📊 Procesando ${dataRows.length} filas`);

    // ✅ CREAR REGISTRO DE CARGA
    const cargaMasiva = await prisma.cargaMasivaStock.create({
      data: {
        nombre: `Carga Simple: ${file.name}`,
        descripcion: `Procesamiento sin transacciones complejas`,
        sucursalId,
        usuarioId: user.id,
        totalItems: dataRows.length,
        estado: 'procesando',
        archivoNombre: file.name
      }
    });

    console.log(`[EXCEL-SIMPLE] 📝 Carga creada: ${cargaMasiva.id}`);

    // ✅ 🚀 PROCESAMIENTO SIMPLE - SIN TRANSACCIONES COMPLEJAS
    let itemsProcesados = 0;
    let itemsErrores = 0;
    const resultados = [];

    // Dividir en lotes pequeños
    const batches = [];
    for (let i = 0; i < dataRows.length; i += SIMPLE_BATCH_SIZE) {
      batches.push(dataRows.slice(i, i + SIMPLE_BATCH_SIZE));
    }

    console.log(`[EXCEL-SIMPLE] 🔀 Procesando ${batches.length} lotes de ${SIMPLE_BATCH_SIZE} items`);

    // Procesar cada lote
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // ⏱️ CONTROL DE TIEMPO
      if (Date.now() - startTime > MAX_PROCESSING_TIME) {
        console.log(`[EXCEL-SIMPLE] ⏰ Timeout alcanzado en lote ${batchIndex + 1}`);
        break;
      }

      console.log(`[EXCEL-SIMPLE] 🔄 Procesando lote ${batchIndex + 1}/${batches.length}`);

      // 🎯 PROCESAR CADA ITEM DEL LOTE INDIVIDUALMENTE
      for (let itemIndex = 0; itemIndex < batch.length; itemIndex++) {
        const row = batch[itemIndex];
        const globalIndex = batchIndex * SIMPLE_BATCH_SIZE + itemIndex;
        const filaNumero = globalIndex + 2;

        try {
          const resultado = await procesarItemSimple(
            row,
            filaNumero,
            columnIndices,
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

            if (itemsProcesados % 10 === 0) {
              console.log(`[EXCEL-SIMPLE] ✅ Procesados: ${itemsProcesados}/${dataRows.length}`);
            }
          } else {
            itemsErrores++;
            resultados.push({
              fila: filaNumero,
              estado: 'error',
              error: resultado.error
            });
          }

        } catch (error) {
          itemsErrores++;
          console.error(`[EXCEL-SIMPLE] ❌ Error fila ${filaNumero}:`, error);
          
          resultados.push({
            fila: filaNumero,
            estado: 'error',
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }

        // Pequeña pausa cada 10 items para no sobrecargar
        if ((globalIndex + 1) % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Actualizar progreso cada lote
      try {
        await prisma.cargaMasivaStock.update({
          where: { id: cargaMasiva.id },
          data: {
            itemsProcesados,
            itemsErrores
          }
        });
      } catch (updateError) {
        console.warn(`[EXCEL-SIMPLE] ⚠️ Error actualizando progreso:`, updateError);
      }
    }

    console.log(`[EXCEL-SIMPLE] 📊 Completado: ${itemsProcesados} procesados, ${itemsErrores} errores`);

    // ✅ FINALIZAR CARGA
    const tiempoProcesamiento = Math.round((Date.now() - startTime) / 1000);
    
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
        usuario: { select: { name: true, email: true } }
      }
    });

    const resumen = {
      totalItems: dataRows.length,
      itemsProcesados,
      itemsErrores,
      porcentajeExito: Math.round((itemsProcesados / dataRows.length) * 100),
      tiempoProcesamiento
    };

    console.log(`[EXCEL-SIMPLE] 🏁 Finalizado en ${tiempoProcesamiento}s:`, resumen);

    return NextResponse.json({
      success: true,
      mensaje: `Procesamiento completado: ${itemsProcesados}/${dataRows.length} productos actualizados`,
      carga: cargaFinalizada,
      resumen,
      resultados: resultados.slice(0, 30),
      detalles: {
        archivo: file.name,
        sucursal: sucursal.nombre,
        modo,
        optimizacion: 'operaciones-atomicas'
      }
    });

  } catch (error) {
    console.error('[EXCEL-SIMPLE] ❌ Error general:', error);
    return NextResponse.json(
      { 
        error: 'Error procesando archivo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// 🎯 FUNCIÓN SIMPLE - SIN TRANSACCIONES COMPLEJAS
async function procesarItemSimple(
  row: any[],
  filaNumero: number,
  columnIndices: any,
  sucursalId: string,
  modo: string,
  usuarioId: string,
  cargaId: string,
  fileName: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  
  try {
    // 1. EXTRAER Y VALIDAR DATOS
    const productoId = row[columnIndices.id]?.toString().trim();
    const nuevoStockStr = row[columnIndices.nuevoStock]?.toString().trim();

    if (!productoId || !nuevoStockStr) {
      throw new Error(`Fila ${filaNumero}: ID o Stock vacío`);
    }

    const nuevoStock = parseFloat(nuevoStockStr);
    if (isNaN(nuevoStock) || nuevoStock < 0) {
      throw new Error(`Fila ${filaNumero}: Stock inválido (${nuevoStockStr})`);
    }

    // 2. VERIFICAR PRODUCTO
    const producto = await prisma.producto.findFirst({
      where: { 
        id: productoId, 
        activo: true 
      },
      select: { 
        id: true, 
        nombre: true, 
        codigoBarras: true 
      }
    });

    if (!producto) {
      throw new Error(`Fila ${filaNumero}: Producto no encontrado - ${productoId}`);
    }

    // 3. OBTENER STOCK ACTUAL
    const stockActual = await prisma.stock.findFirst({
      where: {
        productoId: producto.id,
        ubicacionId: sucursalId
      }
    });

    const cantidadAnterior = stockActual?.cantidad || 0;

    // 4. CALCULAR NUEVA CANTIDAD
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
        throw new Error(`Modo inválido: ${modo}`);
    }

    // 5. 🎯 OPERACIONES ATÓMICAS SIMPLES (SIN TRANSACCIONES COMPLEJAS)
    
    let stockFinalReal = cantidadFinal;

    // A. ACTUALIZAR O CREAR STOCK
    if (stockActual) {
      // Actualizar stock existente
      const stockActualizado = await prisma.stock.update({
        where: { id: stockActual.id },
        data: {
          cantidad: cantidadFinal,
          ultimaActualizacion: new Date(),
          version: { increment: 1 }
        }
      });
      stockFinalReal = stockActualizado.cantidad;
    } else if (cantidadFinal > 0) {
      // Crear stock nuevo
      const stockNuevo = await prisma.stock.create({
        data: {
          productoId: producto.id,
          ubicacionId: sucursalId,
          cantidad: cantidadFinal,
          ultimaActualizacion: new Date()
        }
      });
      stockFinalReal = stockNuevo.cantidad;
    }

    // B. CREAR MOVIMIENTO DE STOCK (SI HAY CAMBIO)
    if (diferencia !== 0) {
      try {
        // Obtener el stock actualizado para el movimiento
        const stockParaMovimiento = await prisma.stock.findFirst({
          where: {
            productoId: producto.id,
            ubicacionId: sucursalId
          }
        });

        if (stockParaMovimiento) {
          await prisma.movimientoStock.create({
            data: {
              stockId: stockParaMovimiento.id,
              tipoMovimiento: diferencia > 0 ? 'entrada' : 'salida',
              cantidad: Math.abs(diferencia),
              motivo: `Carga Excel: ${fileName} - Fila ${filaNumero}`,
              usuarioId: usuarioId,
              fecha: new Date()
            }
          });
        }
      } catch (movError) {
        console.warn(`[EXCEL-SIMPLE] ⚠️ Error creando movimiento para ${producto.nombre}:`, movError);
        // No fallar por esto, el stock ya se actualizó
      }
    }

    // C. REGISTRAR ITEM DE CARGA
    try {
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
    } catch (itemError) {
      console.warn(`[EXCEL-SIMPLE] ⚠️ Error registrando item para ${producto.nombre}:`, itemError);
      // No fallar por esto, el stock ya se actualizó
    }

    // 6. VERIFICAR STOCK FINAL
    const verificacion = await prisma.stock.findFirst({
      where: {
        productoId: producto.id,
        ubicacionId: sucursalId
      }
    });

    const stockFinalVerificado = verificacion?.cantidad || 0;

    return {
      success: true,
      data: {
        producto: {
          id: producto.id,
          nombre: producto.nombre,
          codigoBarras: producto.codigoBarras
        },
        stockAnterior: cantidadAnterior,
        stockFinal: stockFinalVerificado,
        diferencia: stockFinalVerificado - cantidadAnterior,
        modoAplicado: modo
      }
    };

  } catch (error) {
    // MANEJAR ERROR CREANDO REGISTRO
    try {
      await prisma.cargaMasivaStockItem.create({
        data: {
          cargaId: cargaId,
          nombreProducto: `Error Fila ${filaNumero}`,
          cantidadCargar: 0,
          estado: 'error',
          error: error instanceof Error ? error.message.substring(0, 300) : 'Error desconocido'
        }
      });
    } catch (errorRegError) {
      console.warn(`[EXCEL-SIMPLE] ⚠️ Error registrando error:`, errorRegError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}