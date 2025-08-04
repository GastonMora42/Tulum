// src/app/api/admin/stock-config/excel/plantilla/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  const permError = await checkPermission('admin')(req);
  if (permError) return permError;

  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');

    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere sucursalId' },
        { status: 400 }
      );
    }

    console.log(`[EXCEL-API] Generando plantilla para sucursal: ${sucursalId}`);

    // Obtener información de la sucursal
    const sucursal = await prisma.ubicacion.findUnique({
      where: { id: sucursalId }
    });

    if (!sucursal) {
      return NextResponse.json(
        { error: 'Sucursal no encontrada' },
        { status: 404 }
      );
    }

    // Obtener todos los productos activos con su stock y categoría
    const productos = await prisma.producto.findMany({
      where: { activo: true },
      include: {
        categoria: true,
        stocks: {
          where: { ubicacionId: sucursalId }
        }
      },
      orderBy: [
        { categoria: { nombre: 'asc' } },
        { nombre: 'asc' }
      ]
    });

    console.log(`[EXCEL-API] Encontrados ${productos.length} productos`);

    // Preparar datos para Excel
    const excelData = productos.map(producto => {
      const stock = producto.stocks[0]?.cantidad || 0;
      
      return {
        'ID': producto.id,
        'Código de Barras': producto.codigoBarras || '',
        'Nombre del Producto': producto.nombre,
        'Categoría': producto.categoria?.nombre || 'Sin categoría',
        'Stock Actual': stock,
        'Nuevo Stock': stock, // Campo que el usuario debe modificar
        'Precio': producto.precio || 0,
        'Stock Mínimo': producto.stockMinimo || 0,
        'Observaciones': '' // Campo opcional para comentarios
      };
    });

    // Crear libro de trabajo
    const workbook = XLSX.utils.book_new();
    
    // Crear hoja principal con los datos
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Configurar anchos de columna
    const columnWidths = [
      { wch: 10 }, // ID
      { wch: 15 }, // Código de Barras
      { wch: 30 }, // Nombre del Producto
      { wch: 15 }, // Categoría
      { wch: 12 }, // Stock Actual
      { wch: 12 }, // Nuevo Stock
      { wch: 10 }, // Precio
      { wch: 12 }, // Stock Mínimo
      { wch: 20 }  // Observaciones
    ];
    worksheet['!cols'] = columnWidths;

    // Agregar estilos a la hoja (encabezados en negrita)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const headerCell = XLSX.utils.encode_cell({ r: 0, c: col });
      if (worksheet[headerCell]) {
        worksheet[headerCell].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "EEEEEE" } }
        };
      }
    }

    // Agregar hoja con los datos
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Productos');

    // Crear hoja de instrucciones
    const instrucciones = [
      ['INSTRUCCIONES PARA USO DE LA PLANTILLA'],
      [''],
      ['1. NO MODIFIQUE las columnas: ID, Código de Barras, Nombre del Producto, Categoría'],
      ['2. SOLO MODIFIQUE la columna "Nuevo Stock" con los valores deseados'],
      ['3. El campo "Observaciones" es opcional'],
      ['4. Guarde el archivo y súbalo usando el botón "Procesar Archivo"'],
      [''],
      ['IMPORTANTE:'],
      ['- Los valores de "Nuevo Stock" deben ser números positivos'],
      ['- No deje celdas vacías en "Nuevo Stock"'],
      ['- El sistema actualizará el stock estableciendo estos valores exactos'],
      [''],
      ['Información de la carga:'],
      [`Sucursal: ${sucursal.nombre}`],
      [`Fecha de generación: ${new Date().toLocaleString()}`],
      [`Total de productos: ${productos.length}`]
    ];

    const instruccionesWs = XLSX.utils.aoa_to_sheet(instrucciones);
    instruccionesWs['!cols'] = [{ wch: 80 }];
    
    // Estilo para el título
    if (instruccionesWs['A1']) {
      instruccionesWs['A1'].s = {
        font: { bold: true, size: 14 },
        fill: { fgColor: { rgb: "DDDDDD" } }
      };
    }

    XLSX.utils.book_append_sheet(workbook, instruccionesWs, 'Instrucciones');

    // Generar buffer del archivo Excel
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true
    });

    console.log(`[EXCEL-API] ✅ Plantilla generada exitosamente`);

    // Configurar headers para descarga
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', `attachment; filename="plantilla_stock_${sucursal.nombre}_${new Date().toISOString().split('T')[0]}.xlsx"`);
    headers.set('Content-Length', excelBuffer.length.toString());

    return new NextResponse(excelBuffer, { headers });

  } catch (error) {
    console.error('[EXCEL-API] ❌ Error generando plantilla:', error);
    return NextResponse.json(
      { 
        error: 'Error al generar plantilla Excel',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}