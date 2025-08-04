// src/app/api/admin/stock-config/excel/procesar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { stockService } from '@/server/services/stock/stockService';
import { stockSucursalService } from '@/server/services/stock/stockSucursalService';
import * as XLSX from 'xlsx';

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

    console.log(`[EXCEL-PROCESS] Procesando archivo: ${file.name} para sucursal: ${sucursalId}`);

    // Verificar que la sucursal existe
    const sucursal = await prisma.ubicacion.findUnique({
      where: { id: sucursalId }
    });

    if (!sucursal) {
      return NextResponse.json(
        { error: 'Sucursal no encontrada' },
        { status: 404 }
      );
    }

    // Leer archivo Excel
    const buffer = Buffer.from(await file.arrayBuffer());
    let workbook: XLSX.WorkBook;
    
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch (xlsxError) {
      console.error('[EXCEL-PROCESS] Error leyendo archivo Excel:', xlsxError);
      return NextResponse.json(
        { error: 'Archivo Excel inválido o corrupto' },
        { status: 400 }
      );
    }

    // Obtener la primera hoja (datos de productos)
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      return NextResponse.json(
        { error: 'No se encontraron datos en el archivo Excel' },
        { status: 400 }
      );
    }

    // Convertir hoja a JSON
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

    // Obtener encabezados (primera fila)
    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1);

    console.log(`[EXCEL-PROCESS] Encabezados encontrados:`, headers);
    console.log(`[EXCEL-PROCESS] Filas de datos: ${dataRows.length}`);

    // Validar encabezados requeridos
    const requiredHeaders = ['ID', 'Nuevo Stock'];
    const missingHeaders = requiredHeaders.filter(header => 
      !headers.some(h => h && h.toString().trim() === header)
    );

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { 
          error: `Faltan columnas requeridas: ${missingHeaders.join(', ')}`,
          headers: headers,
          required: requiredHeaders
        },
        { status: 400 }
      );
    }

    // Mapear índices de columnas
    const columnIndices = {
      id: headers.findIndex(h => h && h.toString().trim() === 'ID'),
      nuevoStock: headers.findIndex(h => h && h.toString().trim() === 'Nuevo Stock'),
      observaciones: headers.findIndex(h => h && h.toString().trim() === 'Observaciones')
    };

    console.log(`[EXCEL-PROCESS] Índices de columnas:`, columnIndices);

    // Crear registro de carga masiva
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

    console.log(`[EXCEL-PROCESS] Registro de carga creado: ${cargaMasiva.id}`);

    let itemsProcesados = 0;
    let itemsErrores = 0;
    const resultados = [];

    // Procesar cada fila
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      try {
        // Extraer datos de la fila
        const productoId = row[columnIndices.id]?.toString().trim();
        const nuevoStockStr = row[columnIndices.nuevoStock]?.toString().trim();
        const observaciones = columnIndices.observaciones >= 0 ? 
          row[columnIndices.observaciones]?.toString().trim() || '' : '';

        if (!productoId) {
          throw new Error(`Fila ${i + 2}: ID de producto vacío`);
        }

        if (!nuevoStockStr) {
          throw new Error(`Fila ${i + 2}: Nuevo Stock vacío`);
        }

        const nuevoStock = parseFloat(nuevoStockStr);
        if (isNaN(nuevoStock) || nuevoStock < 0) {
          throw new Error(`Fila ${i + 2}: Nuevo Stock debe ser un número positivo (valor: ${nuevoStockStr})`);
        }

        console.log(`[EXCEL-PROCESS] Procesando fila ${i + 2}: Producto ${productoId}, Stock ${nuevoStock}`);

        // Verificar que el producto existe
        const producto = await prisma.producto.findUnique({
          where: { id: productoId, activo: true },
          include: { categoria: true }
        });

        if (!producto) {
          throw new Error(`Fila ${i + 2}: Producto con ID ${productoId} no encontrado o inactivo`);
        }

        // Obtener stock actual
        const stockActual = await prisma.stock.findFirst({
          where: {
            productoId: producto.id,
            ubicacionId: sucursalId
          }
        });

        const stockAnterior = stockActual?.cantidad || 0;
        const diferencia = nuevoStock - stockAnterior;

        console.log(`[EXCEL-PROCESS] ${producto.nombre}: ${stockAnterior} -> ${nuevoStock} (${diferencia > 0 ? '+' : ''}${diferencia})`);

        // Solo ajustar si hay diferencia
        if (diferencia !== 0) {
          await stockService.ajustarStock({
            productoId: producto.id,
            ubicacionId: sucursalId,
            cantidad: diferencia,
            motivo: `Carga Excel: ${file.name}${observaciones ? ` - ${observaciones}` : ''}`,
            usuarioId: user.id,
            allowNegative: true // Admin puede ajustar a cualquier valor
          });
        }

        // Crear/actualizar configuración automática si no existe
        try {
          await stockSucursalService.crearConfiguracionAutomatica(
            producto.id,
            sucursalId,
            user.id,
            nuevoStock
          );
        } catch (configError) {
          console.warn(`[EXCEL-PROCESS] No se pudo crear configuración para ${producto.nombre}:`, configError);
        }

        // Registrar ítem procesado
        await prisma.cargaMasivaStockItem.create({
          data: {
            cargaId: cargaMasiva.id,
            productoId: producto.id,
            codigoBarras: producto.codigoBarras,
            nombreProducto: producto.nombre,
            cantidadCargar: nuevoStock,
            cantidadAnterior: stockAnterior,
            cantidadFinal: nuevoStock,
            estado: 'procesado',
            procesadoEn: new Date()
          }
        });

        itemsProcesados++;
        
        resultados.push({
          fila: i + 2,
          producto: {
            id: producto.id,
            nombre: producto.nombre,
            categoria: producto.categoria?.nombre
          },
          stockAnterior,
          stockNuevo: nuevoStock,
          diferencia,
          estado: 'procesado'
        });

        console.log(`[EXCEL-PROCESS] ✅ Fila ${i + 2} procesada exitosamente`);

      } catch (error) {
        console.error(`[EXCEL-PROCESS] ❌ Error en fila ${i + 2}:`, error);
        itemsErrores++;

        // Registrar error
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        
        await prisma.cargaMasivaStockItem.create({
          data: {
            cargaId: cargaMasiva.id,
            nombreProducto: `Fila ${i + 2}`,
            cantidadCargar: 0,
            estado: 'error',
            error: errorMessage.substring(0, 500)
          }
        });

        resultados.push({
          fila: i + 2,
          estado: 'error',
          error: errorMessage
        });
      }
    }

    // Finalizar registro de carga
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

    // Generar alertas para la sucursal
    try {
      await stockSucursalService.verificarAlertasParaSucursal(sucursalId);
    } catch (alertError) {
      console.warn('[EXCEL-PROCESS] Error generando alertas:', alertError);
    }

    const resumen = {
      totalItems: dataRows.length,
      itemsProcesados,
      itemsErrores,
      porcentajeExito: Math.round((itemsProcesados / dataRows.length) * 100)
    };

    console.log(`[EXCEL-PROCESS] 🏁 Procesamiento completado:`, resumen);

    return NextResponse.json({
      success: true,
      mensaje: `Archivo procesado: ${itemsProcesados} productos actualizados${itemsErrores > 0 ? `, ${itemsErrores} errores` : ''}`,
      carga: cargaFinalizada,
      resumen,
      resultados: resultados.slice(0, 20), // Limitar respuesta
      detalles: {
        archivo: file.name,
        sucursal: sucursal.nombre,
        fechaProcesamiento: new Date(),
        usuario: user.name
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