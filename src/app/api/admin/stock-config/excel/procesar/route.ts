// src/app/api/admin/stock-config/excel/procesar-async/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import * as XLSX from 'xlsx';

// 🚀 PROCESAMIENTO ASÍNCRONO PARA ARCHIVOS GRANDES
export async function POST(req: NextRequest) {
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

    console.log(`[EXCEL-ASYNC] 🚀 Iniciando procesamiento asíncrono: ${file.name}`);

    // Validar archivo rápidamente
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    const dataRows = jsonData.slice(1).filter(row => row && row.length > 0);

    // ✅ CREAR REGISTRO INMEDIATAMENTE
    const cargaMasiva = await prisma.cargaMasivaStock.create({
      data: {
        nombre: `Carga Async: ${file.name}`,
        descripcion: `Procesamiento asíncrono de ${dataRows.length} items`,
        sucursalId,
        usuarioId: user.id,
        totalItems: dataRows.length,
        estado: 'en_cola', // Estado especial para async
        archivoNombre: file.name
      }
    });

    // ✅ RESPUESTA INMEDIATA CON ID DE SEGUIMIENTO
    const response = NextResponse.json({
      success: true,
      mensaje: `Archivo en cola de procesamiento`,
      cargaId: cargaMasiva.id,
      totalItems: dataRows.length,
      estimatedTime: Math.ceil(dataRows.length / 10), // Estimación en segundos
      pollUrl: `/api/admin/stock-config/excel/status/${cargaMasiva.id}`
    });

    // 🔥 PROCESAR EN BACKGROUND (NO AWAIT)
    procesarEnBackground(cargaMasiva.id, buffer, sucursalId, modo, user.id);

    return response;

  } catch (error) {
    console.error('[EXCEL-ASYNC] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Error al procesar archivo' },
      { status: 500 }
    );
  }
}

// 🔥 FUNCIÓN DE PROCESAMIENTO EN BACKGROUND
async function procesarEnBackground(
  cargaId: string,
  buffer: Buffer,
  sucursalId: string,
  modo: string,
  usuarioId: string
) {
  try {
    console.log(`[EXCEL-BG] 🔄 Iniciando procesamiento background para carga ${cargaId}`);

    // Actualizar estado
    await prisma.cargaMasivaStock.update({
      where: { id: cargaId },
      data: { estado: 'procesando' }
    });

    // Procesar archivo
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1).filter(row => row && row.length > 0);

    const columnIndices = {
      id: headers.findIndex(h => h && h.toString().trim() === 'ID'),
      nuevoStock: headers.findIndex(h => h && h.toString().trim() === 'Nuevo Stock')
    };

    // Preparar items válidos
    const itemsValidos = [];
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const productoId = row[columnIndices.id]?.toString().trim();
      const nuevoStockStr = row[columnIndices.nuevoStock]?.toString().trim();
      
      if (productoId && nuevoStockStr) {
        const nuevoStock = parseFloat(nuevoStockStr);
        if (!isNaN(nuevoStock) && nuevoStock >= 0) {
          itemsValidos.push({
            fila: i + 2,
            productoId,
            nuevoStock
          });
        }
      }
    }

    console.log(`[EXCEL-BG] 📊 Items válidos: ${itemsValidos.length}`);

    // Procesar en lotes pequeños con delays
    let procesados = 0;
    let errores = 0;
    const LOTE_SIZE = 10;
    const DELAY_BETWEEN_BATCHES = 100; // 100ms entre lotes

    for (let i = 0; i < itemsValidos.length; i += LOTE_SIZE) {
      const lote = itemsValidos.slice(i, i + LOTE_SIZE);
      
      try {
        const resultado = await procesarLoteBackground(lote, sucursalId, modo, usuarioId, cargaId);
        procesados += resultado.procesados;
        errores += resultado.errores;

        // Actualizar progreso
        await prisma.cargaMasivaStock.update({
          where: { id: cargaId },
          data: {
            itemsProcesados: procesados,
            itemsErrores: errores
          }
        });

        console.log(`[EXCEL-BG] ✅ Lote ${Math.floor(i/LOTE_SIZE) + 1}: ${resultado.procesados} procesados`);

        // Pequeño delay para no sobrecargar la BD
        if (i + LOTE_SIZE < itemsValidos.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }

      } catch (loteError) {
        console.error(`[EXCEL-BG] ❌ Error en lote:`, loteError);
        errores += lote.length;
      }
    }

    // Finalizar
    await prisma.cargaMasivaStock.update({
      where: { id: cargaId },
      data: {
        estado: errores === 0 ? 'completado' : 'completado_con_errores',
        itemsProcesados: procesados,
        itemsErrores: errores,
        fechaFin: new Date()
      }
    });

    console.log(`[EXCEL-BG] 🏁 Completado: ${procesados} procesados, ${errores} errores`);

  } catch (error) {
    console.error(`[EXCEL-BG] ❌ Error general:`, error);
    
    await prisma.cargaMasivaStock.update({
      where: { id: cargaId },
      data: {
        estado: 'error',
        fechaFin: new Date()
      }
    });
  }
}

// Función auxiliar para procesar lotes en background
async function procesarLoteBackground(
  items: any[],
  sucursalId: string,
  modo: string,
  usuarioId: string,
  cargaId: string
) {
  const productIds = items.map(item => item.productoId);
  
  const [productos, stocks] = await Promise.all([
    prisma.producto.findMany({
      where: { id: { in: productIds }, activo: true },
      select: { id: true, nombre: true, codigoBarras: true }
    }),
    prisma.stock.findMany({
      where: { 
        productoId: { in: productIds },
        ubicacionId: sucursalId 
      }
    })
  ]);

  const productosMap = new Map(productos.map(p => [p.id, p]));
  const stocksMap = new Map(stocks.map(s => [s.productoId, s]));

  return await prisma.$transaction(async (tx) => {
    let procesados = 0;
    let errores = 0;

    const operaciones = [];

    for (const item of items) {
      try {
        const producto = productosMap.get(item.productoId);
        if (!producto) {
          throw new Error(`Producto no encontrado: ${item.productoId}`);
        }

        const stockActual = stocksMap.get(item.productoId);
        const cantidadAnterior = stockActual?.cantidad || 0;

        let cantidadFinal = 0;
        switch (modo) {
          case 'incrementar':
            cantidadFinal = cantidadAnterior + item.nuevoStock;
            break;
          case 'establecer':
            cantidadFinal = item.nuevoStock;
            break;
          case 'decrementar':
            cantidadFinal = Math.max(0, cantidadAnterior - item.nuevoStock);
            break;
        }

        // Stock update/create
        if (stockActual) {
          operaciones.push(
            tx.stock.update({
              where: { id: stockActual.id },
              data: { cantidad: cantidadFinal, ultimaActualizacion: new Date() }
            })
          );
        } else if (cantidadFinal > 0) {
          operaciones.push(
            tx.stock.create({
              data: {
                productoId: item.productoId,
                ubicacionId: sucursalId,
                cantidad: cantidadFinal,
                ultimaActualizacion: new Date()
              }
            })
          );
        }

        // Item de carga
        operaciones.push(
          tx.cargaMasivaStockItem.create({
            data: {
              cargaId,
              productoId: item.productoId,
              codigoBarras: producto.codigoBarras,
              nombreProducto: producto.nombre,
              cantidadCargar: item.nuevoStock,
              cantidadAnterior,
              cantidadFinal,
              estado: 'procesado',
              procesadoEn: new Date()
            }
          })
        );

        procesados++;

      } catch (error) {
        errores++;
        operaciones.push(
          tx.cargaMasivaStockItem.create({
            data: {
              cargaId,
              nombreProducto: `Fila ${item.fila}`,
              cantidadCargar: 0,
              estado: 'error',
              error: error instanceof Error ? error.message.substring(0, 200) : 'Error'
            }
          })
        );
      }
    }

    await Promise.all(operaciones);
    return { procesados, errores };
  });
}

// API PARA CONSULTAR ESTADO
// src/app/api/admin/stock-config/excel/status/[id]/route.ts
export async function GET(
  req: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    const carga = await prisma.cargaMasivaStock.findUnique({
      where: { id: params.id },
      include: {
        sucursal: { select: { nombre: true } },
        usuario: { select: { name: true } }
      }
    });

    if (!carga) {
      return NextResponse.json({ error: 'Carga no encontrada' }, { status: 404 });
    }

    const progreso = carga.totalItems > 0 
      ? Math.round(((carga.itemsProcesados + carga.itemsErrores) / carga.totalItems) * 100)
      : 0;

    return NextResponse.json({
      id: carga.id,
      estado: carga.estado,
      progreso,
      itemsProcesados: carga.itemsProcesados,
      itemsErrores: carga.itemsErrores,
      totalItems: carga.totalItems,
      porcentajeExito: carga.itemsProcesados > 0 
        ? Math.round((carga.itemsProcesados / (carga.itemsProcesados + carga.itemsErrores)) * 100) 
        : 0,
      fechaInicio: carga.fechaInicio,
      fechaFin: carga.fechaFin,
      estimatedTimeRemaining: carga.estado === 'procesando' 
        ? Math.max(0, Math.ceil((carga.totalItems - carga.itemsProcesados - carga.itemsErrores) * 0.5))
        : 0
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error consultando estado' }, { status: 500 });
  }
}