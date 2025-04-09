// src/lib/utils/pdfExport.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TableColumn {
  header: string;
  dataKey: string;
  width?: number;
}

interface ExportOptions {
  title: string;
  subtitle?: string;
  fileName: string;
  columns: TableColumn[];
  data: any[];
  orientation?: 'portrait' | 'landscape';
}

export const exportToPdf = ({
  title,
  subtitle,
  fileName,
  columns,
  data,
  orientation = 'portrait'
}: ExportOptions) => {
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });
  
  // Configurar fuentes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  
  // Añadir título
  doc.text(title, 14, 22);
  
  // Añadir subtítulo si existe
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(subtitle, 14, 30);
  }
  
  // Añadir fecha de generación
  const now = new Date();
  const dateStr = `Generado el: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
  doc.setFontSize(10);
  doc.text(dateStr, 14, subtitle ? 38 : 30);
  
  // Preparar datos para la tabla
  const tableHeaders = columns.map(col => col.header);
  const tableData = data.map(item => 
    columns.map(col => item[col.dataKey])
  );
  
  // Añadir tabla
  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: subtitle ? 42 : 34,
    margin: { top: 10 },
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [66, 66, 255] }
  });
  
  // Guardar PDF
  doc.save(`${fileName}.pdf`);
};