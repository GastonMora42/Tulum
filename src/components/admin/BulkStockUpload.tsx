// src/components/admin/BulkStockUpload.tsx - VERSIÓN CORREGIDA
import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle, Info, X, Loader } from 'lucide-react';
import * as XLSX from 'xlsx';
import { authenticatedFetch } from '@/hooks/useAuth';

// ✅ INTERFACES CORREGIDAS Y COMPLETAS
interface Sucursal {
  id: string;
  nombre: string;
  tipo: string;
}

interface BulkItem {
  codigoBarras?: string;
  nombreProducto?: string;
  cantidad: number;
  fila: number;
}

interface BulkStockUploadProps {
  sucursales: Sucursal[];
  onClose: () => void;
  onSuccess: (result: any) => void;
}

interface BulkUploadData {
  sucursalId: string;
  nombre: string;
  descripcion: string;
  modo: 'incrementar' | 'establecer' | 'decrementar';
  items: Array<{
    codigoBarras?: string;
    nombreProducto?: string;
    cantidad: number;
  }>;
}

interface BulkResult {
  carga: any;
  resumen: {
    totalItems: number;
    itemsProcesados: number;
    itemsErrores: number;
    porcentajeExito: number;
  };
  resultados: any[];
}

const BulkStockUpload: React.FC<BulkStockUploadProps> = ({ sucursales, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<BulkItem[]>([]);
  const [uploadData, setUploadData] = useState<BulkUploadData>({
    sucursalId: '',
    nombre: '',
    descripcion: '',
    modo: 'incrementar',
    items: [] // Añadido el campo items requerido
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template de ejemplo para descargar
  const downloadTemplate = () => {
    const template = [
      { 
        'Código de Barras': '1234567890123', 
        'Nombre del Producto': 'Ejemplo Producto 1', 
        'Cantidad': 50 
      },
      { 
        'Código de Barras': '2345678901234', 
        'Nombre del Producto': 'Ejemplo Producto 2', 
        'Cantidad': 30 
      },
      { 
        'Código de Barras': '', 
        'Nombre del Producto': 'Producto sin código', 
        'Cantidad': 20 
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(template);
    
    // Configurar anchos de columna
    ws['!cols'] = [
      { width: 20 }, // Código de Barras
      { width: 30 }, // Nombre del Producto
      { width: 15 }  // Cantidad
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Template Stock');
    XLSX.writeFile(wb, 'template_carga_stock.xlsx');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = async (file: File) => {
    setParsing(true);
    setErrors([]);
    setParsedData([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      // Validar y normalizar datos
      const normalizedData: BulkItem[] = [];
      const validationErrors: string[] = [];

      jsonData.forEach((row: any, index: number) => {
        const rowNum = index + 2; // +2 porque Excel empieza en 1 y tenemos header
        
        // Detectar posibles nombres de columnas
        const codigoBarras = (
          row['Código de Barras'] || 
          row['Codigo de Barras'] || 
          row['CodigoBarras'] || 
          row['Barcode'] || 
          ''
        )?.toString().trim();
                           
        const nombreProducto = (
          row['Nombre del Producto'] || 
          row['Nombre'] || 
          row['Producto'] || 
          row['Product'] || 
          ''
        )?.toString().trim();
                             
        const cantidad = parseFloat(
          row['Cantidad'] || 
          row['Qty'] || 
          row['Stock'] || 
          0
        );

        // Validaciones
        if (!codigoBarras && !nombreProducto) {
          validationErrors.push(`Fila ${rowNum}: Debe especificar código de barras o nombre del producto`);
          return;
        }

        if (isNaN(cantidad) || cantidad < 0) {
          validationErrors.push(`Fila ${rowNum}: Cantidad debe ser un número mayor o igual a 0`);
          return;
        }

        normalizedData.push({
          codigoBarras: codigoBarras || undefined,
          nombreProducto: nombreProducto || undefined,
          cantidad,
          fila: rowNum
        });
      });

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
      }

      setParsedData(normalizedData);
    } catch (error) {
      console.error('Error parsing file:', error);
      setErrors(['Error al procesar el archivo. Asegúrese de que sea un archivo Excel válido.']);
    } finally {
      setParsing(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadData.sucursalId || parsedData.length === 0) {
      return;
    }

    setUploading(true);

    try {
      const requestData: BulkUploadData = {
        ...uploadData,
        items: parsedData.map(item => ({
          codigoBarras: item.codigoBarras,
          nombreProducto: item.nombreProducto,
          cantidad: item.cantidad
        }))
      };

      const response = await authenticatedFetch('/api/admin/stock-config/bulk-load', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const result: BulkResult = await response.json();
        onSuccess(result);
        onClose();
      } else {
        const errorData = await response.json();
        setErrors([errorData.error || 'Error al procesar la carga masiva']);
      }
    } catch (error) {
      console.error('Error uploading:', error);
      setErrors(['Error de conexión al procesar la carga masiva']);
    } finally {
      setUploading(false);
    }
  };

  const resetFile = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateUploadData = <K extends keyof BulkUploadData>(
    key: K, 
    value: BulkUploadData[K]
  ) => {
    setUploadData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Carga Masiva desde Archivo</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={uploading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Instrucciones y template */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Instrucciones para la carga</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• El archivo debe ser Excel (.xlsx) o CSV</li>
                <li>• Debe contener las columnas: "Código de Barras", "Nombre del Producto", "Cantidad"</li>
                <li>• Puede identificar productos por código de barras o nombre</li>
                <li>• Las cantidades deben ser números positivos</li>
              </ul>
              <button
                onClick={downloadTemplate}
                className="mt-3 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                type="button"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar Template
              </button>
            </div>
          </div>
        </div>

        {/* Configuración de carga */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal *</label>
            <select
              value={uploadData.sucursalId}
              onChange={(e) => updateUploadData('sucursalId', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900"
              required
              disabled={uploading}
            >
              <option value="">Seleccionar sucursal</option>
              {sucursales.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modo de Carga *</label>
            <select
              value={uploadData.modo}
              onChange={(e) => updateUploadData('modo', e.target.value as BulkUploadData['modo'])}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900"
              disabled={uploading}
            >
              <option value="incrementar">Incrementar stock existente</option>
              <option value="establecer">Establecer stock exacto</option>
              <option value="decrementar">Decrementar stock</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la carga</label>
            <input
              type="text"
              value={uploadData.nombre}
              onChange={(e) => updateUploadData('nombre', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900"
              placeholder="Ej: Reposición enero 2025"
              disabled={uploading}
            />
          </div>
        </div>

        {/* Selección de archivo */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Archivo Excel/CSV</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={uploading}
            />
            
            {!file ? (
              <div>
                <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Seleccione un archivo Excel o CSV</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  type="button"
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-2 inline" />
                  Seleccionar Archivo
                </button>
              </div>
            ) : (
              <div>
                <FileSpreadsheet className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-gray-900 font-medium">{file.name}</p>
                <p className="text-gray-500 text-sm">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <button
                  onClick={resetFile}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                  type="button"
                  disabled={uploading}
                >
                  Cambiar archivo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Errores de validación */}
        {errors.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
              <h3 className="text-sm font-medium text-red-800">Errores encontrados</h3>
            </div>
            <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Datos parseados */}
        {parsedData.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Datos a cargar ({parsedData.length} items)
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2">Fila</th>
                    <th className="text-left py-2">Código de Barras</th>
                    <th className="text-left py-2">Nombre del Producto</th>
                    <th className="text-right py-2">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 50).map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-1 text-gray-500">{item.fila}</td>
                      <td className="py-1">{item.codigoBarras || '-'}</td>
                      <td className="py-1">{item.nombreProducto || '-'}</td>
                      <td className="py-1 text-right font-medium">{item.cantidad}</td>
                    </tr>
                  ))}
                  {parsedData.length > 50 && (
                    <tr>
                      <td colSpan={4} className="py-2 text-center text-gray-500">
                        ... y {parsedData.length - 50} items más
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Descripción opcional */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
          <textarea
            value={uploadData.descripcion}
            onChange={(e) => updateUploadData('descripcion', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900"
            rows={2}
            placeholder="Descripción adicional sobre esta carga..."
            disabled={uploading}
          />
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={uploading}
            type="button"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleUpload}
            disabled={uploading || !uploadData.sucursalId || parsedData.length === 0 || errors.length > 0}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center transition-colors"
            type="button"
          >
            {uploading ? (
              <>
                <Loader className="animate-spin h-4 w-4 mr-2" />
                Procesando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Cargar Stock ({parsedData.length} items)
              </>
            )}
          </button>
        </div>

        {/* Estado de procesamiento */}
        {parsing && (
          <div className="mt-4 flex items-center justify-center text-blue-600">
            <Loader className="animate-spin h-5 w-5 mr-2" />
            Procesando archivo...
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkStockUpload;