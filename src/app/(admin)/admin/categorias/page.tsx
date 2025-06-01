// src/app/(admin)/admin/categorias/page.tsx - VERSIÓN CORREGIDA
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, Plus, Search, Edit, Trash, Image as ImageIcon, Save, X } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { ImageUploader } from '@/components/ui/ImageUploader';

interface Categoria {
  id: string;
  nombre: string;
  imagen?: string;
  _count: {
    productos: number;
  };
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    imagen: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategorias();
  }, []);

  const loadCategorias = async () => {
    try {
      setIsLoading(true);
      const response = await authenticatedFetch('/api/admin/categorias');
      if (response.ok) {
        const data = await response.json();
        setCategorias(data);
      }
    } catch (error) {
      console.error('Error cargando categorías:', error);
      setError('Error al cargar categorías');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategorias = categorias.filter(categoria =>
    categoria.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      
      const url = editingCategoria 
        ? `/api/admin/categorias/${editingCategoria.id}`
        : '/api/admin/categorias';
      
      const response = await authenticatedFetch(url, {
        method: editingCategoria ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          imagen: formData.imagen || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar categoría');
      }

      await loadCategorias();
      setShowModal(false);
      setEditingCategoria(null);
      setFormData({ nombre: '', imagen: '' });
    } catch (error) {
      console.error('Error guardando categoría:', error);
      setError(error instanceof Error ? error.message : 'Error al guardar categoría');
    } finally {
      setIsSaving(false);
    }
  };

  const openModal = (categoria?: Categoria) => {
    setEditingCategoria(categoria || null);
    setFormData({
      nombre: categoria?.nombre || '',
      imagen: categoria?.imagen || ''
    });
    setError(null);
    setShowModal(true);
  };

  const handleImageUpload = (imageUrl: string) => {
    console.log('🖼️ Imagen cargada para categoría:', imageUrl);
    setFormData(prev => ({
      ...prev,
      imagen: imageUrl
    }));
  };

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-black">Gestión de Categorías</h1>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Categoría
          </button>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar categorías..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Grid de categorías */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-600">Cargando categorías...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategorias.map((categoria) => (
              <div key={categoria.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="aspect-video bg-gray-100 relative">
                  {categoria.imagen ? (
                    <img
                      src={categoria.imagen}
                      alt={categoria.nombre}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Error cargando imagen de categoría:', categoria.imagen);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {categoria.nombre}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {categoria._count.productos} productos
                  </p>
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => openModal(categoria)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-indigo-600 hover:text-indigo-900"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal mejorado */}
        {showModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">
                  {editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Nombre de la categoría"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Imagen
                  </label>
                  <ImageUploader
                    type="product"
                    initialImage={formData.imagen}
                    onImageUpload={handleImageUpload}
                  />
                  {formData.imagen && (
                    <div className="mt-2">
                      <img 
                        src={formData.imagen} 
                        alt="Preview" 
                        className="w-full h-32 object-cover rounded-md border border-gray-200"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={isSaving}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !formData.nombre.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ContrastEnhancer>
  );
}