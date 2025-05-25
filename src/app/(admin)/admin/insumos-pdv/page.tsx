// src/app/(admin)/admin/insumos-pdv/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, Filter } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface InsumoPdv {
  id: string;
  nombre: string;
  descripcion?: string;
  unidadMedida: string;
  stockMinimo: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function InsumosPdvAdminPage() {
  const [insumos, setInsumos] = useState<InsumoPdv[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<InsumoPdv | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchInsumos();
  }, [currentPage, searchTerm, filter]);

  const fetchInsumos = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search: searchTerm,
        soloActivos: filter === 'active' ? 'true' : 'false'
      });

      const response = await authenticatedFetch(`/api/admin/insumos-pdv?${params}`);
      const data = await response.json();
      
      setInsumos(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error al cargar insumos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de desactivar este insumo?')) return;

    try {
      await authenticatedFetch(`/api/admin/insumos-pdv/${id}`, {
        method: 'DELETE'
      });
      fetchInsumos();
    } catch (error) {
      console.error('Error al eliminar insumo:', error);
    }
  };

  const filteredInsumos = insumos.filter(insumo => {
    const matchesSearch = insumo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         insumo.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filter === 'all' || 
                         (filter === 'active' && insumo.activo) ||
                         (filter === 'inactive' && !insumo.activo);
    
    return matchesSearch && matchesFilter;
  });

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#311716] to-[#462625] rounded-xl p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Gestión de Insumos PDV</h1>
              <p className="text-white/80">Administrar papel térmico, bolsas y otros insumos</p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#eeb077] hover:bg-[#d9a15d] text-[#311716] font-semibold"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Nuevo Insumo
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Buscar insumos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="h-4 w-4 text-gray-400" />}
                className="w-full"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-[#eeb077]"
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-blue-600 font-semibold">{insumos.length}</p>
                  <p className="text-blue-600/70 text-sm">Total Insumos</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-green-600 font-semibold">
                    {insumos.filter(i => i.activo).length}
                  </p>
                  <p className="text-green-600/70 text-sm">Activos</p>
                </div>
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
                <div>
                  <p className="text-red-600 font-semibold">
                    {insumos.filter(i => !i.activo).length}
                  </p>
                  <p className="text-red-600/70 text-sm">Inactivos</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin h-8 w-8 border-4 border-[#311716] border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Insumo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unidad
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Mínimo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Creado
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInsumos.map((insumo) => (
                    <tr key={insumo.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {insumo.nombre}
                            </div>
                            {insumo.descripcion && (
                              <div className="text-sm text-gray-500">
                                {insumo.descripcion}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {insumo.unidadMedida}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {insumo.stockMinimo}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          insumo.activo 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {insumo.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(insumo.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => setEditingInsumo(insumo)}
                            className="p-1 rounded-full hover:bg-gray-100 text-blue-600"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(insumo.id)}
                            className="p-1 rounded-full hover:bg-gray-100 text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-6 py-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  Página {currentPage} de {totalPages}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        {showCreateModal && (
          <CreateInsumoModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              fetchInsumos();
            }}
          />
        )}

        {editingInsumo && (
          <EditInsumoModal
            insumo={editingInsumo}
            onClose={() => setEditingInsumo(null)}
            onSuccess={() => {
              setEditingInsumo(null);
              fetchInsumos();
            }}
          />
        )}
      </div>
    </ContrastEnhancer>
  );
}

// Modal para crear insumo
function CreateInsumoModal({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    unidadMedida: '',
    stockMinimo: 0,
    activo: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await authenticatedFetch('/api/admin/insumos-pdv', {
        method: 'POST',
        body: JSON.stringify(form)
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al crear insumo');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear insumo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Crear Nuevo Insumo</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
              placeholder="Ej: Papel térmico 80mm"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-[#eeb077]"
                placeholder="Descripción opcional del insumo"
              />
            </div>

            <Input
              label="Unidad de Medida"
              value={form.unidadMedida}
              onChange={(e) => setForm({ ...form, unidadMedida: e.target.value })}
              required
              placeholder="Ej: rollo, paquete, unidad"
            />

            <Input
              label="Stock Mínimo"
              type="number"
              value={form.stockMinimo}
              onChange={(e) => setForm({ ...form, stockMinimo: parseInt(e.target.value) || 0 })}
              required
              min="0"
            />

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                className="mr-2"
              />
              <label className="text-sm text-gray-700">Activo</label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                className="bg-[#311716] hover:bg-[#462625]"
              >
                Crear Insumo
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Modal para editar insumo
function EditInsumoModal({ insumo, onClose, onSuccess }: {
  insumo: InsumoPdv;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    nombre: insumo.nombre,
    descripcion: insumo.descripcion || '',
    unidadMedida: insumo.unidadMedida,
    stockMinimo: insumo.stockMinimo,
    activo: insumo.activo
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await authenticatedFetch(`/api/admin/insumos-pdv/${insumo.id}`, {
        method: 'PATCH',
        body: JSON.stringify(form)
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al actualizar insumo');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar insumo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Editar Insumo</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-[#eeb077]"
              />
            </div>

            <Input
              label="Unidad de Medida"
              value={form.unidadMedida}
              onChange={(e) => setForm({ ...form, unidadMedida: e.target.value })}
              required
            />

            <Input
              label="Stock Mínimo"
              type="number"
              value={form.stockMinimo}
              onChange={(e) => setForm({ ...form, stockMinimo: parseInt(e.target.value) || 0 })}
              required
              min="0"
            />

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                className="mr-2"
              />
              <label className="text-sm text-gray-700">Activo</label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                className="bg-[#311716] hover:bg-[#462625]"
              >
                Actualizar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}