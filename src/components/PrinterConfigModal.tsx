import React, { useState, useEffect } from 'react';
import { X, Printer, Plus, Settings, Check, AlertTriangle } from 'lucide-react';
import { usePrint } from '@/hooks/usePrint';

interface PrinterConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NewPrinterForm {
  name: string;
  type: 'thermal' | 'laser' | 'inkjet';
  paperWidth: number;
  autocut: boolean;
  isDefault: boolean;
}

export function PrinterConfigModal({ isOpen, onClose }: PrinterConfigModalProps) {
  const { availablePrinters, addPrinter, refreshPrinters, isLoading } = usePrint();
  const [showAddForm, setShowAddForm] = useState(false);
  const [testingPrinter, setTestingPrinter] = useState<string | null>(null);
  const [newPrinter, setNewPrinter] = useState<NewPrinterForm>({
    name: '',
    type: 'thermal',
    paperWidth: 80,
    autocut: true,
    isDefault: false
  });

  useEffect(() => {
    if (isOpen) {
      refreshPrinters();
    }
  }, [isOpen, refreshPrinters]);

  const handleAddPrinter = async () => {
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        alert('No se ha configurado una sucursal');
        return;
      }

      const success = await addPrinter({
        name: newPrinter.name,
        type: newPrinter.type,
        sucursalId,
        isDefault: newPrinter.isDefault,
        settings: {
            paperWidth: newPrinter.paperWidth,
            autocut: newPrinter.autocut,
            encoding: 'utf-8',
            isOnline: false
        }
      });

      if (success) {
        setNewPrinter({
          name: '',
          type: 'thermal',
          paperWidth: 80,
          autocut: true,
          isDefault: false
        });
        setShowAddForm(false);
        alert('Impresora configurada correctamente');
      } else {
        alert('Error al configurar la impresora');
      }
    } catch (error) {
      console.error('Error agregando impresora:', error);
      alert('Error al agregar impresora');
    }
  };

  const testPrinter = async (printerId: string) => {
    setTestingPrinter(printerId);
    
    try {
      // Simular test de impresión
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Test de impresión enviado');
    } catch (error) {
      alert('Error en test de impresión');
    } finally {
      setTestingPrinter(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#311716] rounded-xl flex items-center justify-center">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Configuración de Impresoras</h2>
              <p className="text-gray-600">Gestiona las impresoras para facturas y tickets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Impresoras Configuradas */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Impresoras Configuradas</h3>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center space-x-2 px-4 py-2 bg-[#311716] text-white rounded-xl hover:bg-[#462625] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Impresora</span>
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#311716]"></div>
              </div>
            ) : availablePrinters.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <Printer className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No hay impresoras configuradas</p>
                <p className="text-sm text-gray-500">Agrega una impresora para comenzar</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availablePrinters.map((printer) => (
                  <div key={printer.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          printer.isDefault ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <Printer className={`w-4 h-4 ${
                            printer.isDefault ? 'text-green-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{printer.name}</h4>
                          <p className="text-sm text-gray-600 capitalize">{printer.type}</p>
                        </div>
                      </div>
                      {printer.isDefault && (
                        <span className="flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          <Check className="w-3 h-3 mr-1" />
                          Por defecto
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Ancho de papel:</span>
                        <span className="text-gray-900">{printer.settings.paperWidth}mm</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Corte automático:</span>
                        <span className="text-gray-900">
                          {printer.settings.autocut ? 'Sí' : 'No'}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => testPrinter(printer.id)}
                        disabled={testingPrinter === printer.id}
                        className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                      >
                        {testingPrinter === printer.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                            <span>Probando...</span>
                          </>
                        ) : (
                          <>
                            <Settings className="w-3 h-3" />
                            <span>Test</span>
                          </>
                        )}
                      </button>
                      <button className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulario Agregar Impresora */}
          {showAddForm && (
            <div className="bg-gray-50 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Nueva Impresora</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la impresora
                  </label>
                  <input
                    type="text"
                    value={newPrinter.name}
                    onChange={(e) => setNewPrinter(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ej: Fukun POS80-CC"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-[#eeb077]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de impresora
                  </label>
                  <select
                    value={newPrinter.type}
                    onChange={(e) => setNewPrinter(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-[#eeb077]"
                  >
                    <option value="thermal">Térmica (POS)</option>
                    <option value="laser">Láser</option>
                    <option value="inkjet">Tinta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ancho de papel (mm)
                  </label>
                  <select
                    value={newPrinter.paperWidth}
                    onChange={(e) => setNewPrinter(prev => ({ ...prev, paperWidth: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-[#eeb077]"
                  >
                    <option value={58}>58mm</option>
                    <option value={80}>80mm</option>
                    <option value={110}>110mm</option>
                  </select>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newPrinter.autocut}
                      onChange={(e) => setNewPrinter(prev => ({ ...prev, autocut: e.target.checked }))}
                      className="w-4 h-4 text-[#311716] focus:ring-[#eeb077] border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Corte automático</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newPrinter.isDefault}
                      onChange={(e) => setNewPrinter(prev => ({ ...prev, isDefault: e.target.checked }))}
                      className="w-4 h-4 text-[#311716] focus:ring-[#eeb077] border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Por defecto</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddPrinter}
                  disabled={!newPrinter.name.trim()}
                  className="px-6 py-2 bg-[#311716] text-white rounded-lg hover:bg-[#462625] transition-colors disabled:opacity-50"
                >
                  Agregar Impresora
                </button>
              </div>
            </div>
          )}

          {/* Información de Ayuda */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Configuración de Impresoras Térmicas:</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• Asegúrate de que la impresora esté conectada por USB</li>
                  <li>• Instala los drivers correspondientes en el sistema</li>
                  <li>• Para impresoras Fukun POS80-CC usa papel de 80mm</li>
                  <li>• Habilita la impresión automática tras facturar</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}