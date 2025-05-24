// src/app/api/contingencias/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { contingenciaService } from '@/server/services/contingencia/contingenciaService';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;

  try {
    const filtros = await req.json();
    
    // Obtener contingencias con filtros
    const contingencias = await contingenciaService.listarContingencias(filtros);
    
    // Preparar datos para Excel
    const data = contingencias.map(c => ({
      'ID': c.id,
      'Título': c.titulo,
      'Descripción': c.descripcion,
      'Origen': c.origen,
      'Estado': c.estado,
      'Urgente': c.urgente ? 'Sí' : 'No',
      'Tipo': c.tipo || 'N/A',
      'Ubicación': c.ubicacion?.nombre || 'General',
      'Creado por': c.usuario.name,
      'Fecha Creación': new Date(c.fechaCreacion).toLocaleString(),
      'Fecha Respuesta': c.fechaRespuesta ? new Date(c.fechaRespuesta).toLocaleString() : '',
      'Respuesta': c.respuesta || '',
      'Ajuste Realizado': c.ajusteRealizado ? 'Sí' : 'No'
    }));

    // Crear workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 15 }, // ID
      { wch: 30 }, // Título
      { wch: 50 }, // Descripción
      { wch: 15 }, // Origen
      { wch: 15 }, // Estado
      { wch: 10 }, // Urgente
      { wch: 15 }, // Tipo
      { wch: 20 }, // Ubicación
      { wch: 20 }, // Creado por
      { wch: 20 }, // Fecha Creación
      { wch: 20 }, // Fecha Respuesta
      { wch: 50 }, // Respuesta
      { wch: 15 }  // Ajuste Realizado
    ];
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Contingencias');
    
    // Generar buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="contingencias_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });
  } catch (error) {
    console.error('Error al exportar contingencias:', error);
    return NextResponse.json(
      { error: 'Error al exportar contingencias' },
      { status: 500 }
    );
  }
}