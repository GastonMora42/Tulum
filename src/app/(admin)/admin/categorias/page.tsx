// src/app/(admin)/admin/categorias/page.tsx - NUEVA PÁGINA PARA GESTIONAR CATEGORÍAS
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, Plus, Search, Edit, Trash, Image as ImageIcon } from 'lucide-react';
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
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategorias = categorias.filter(categoria =>
    categoria.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async () => {
    try {
      const url = editingCategoria 
        ? `/api/admin/categorias/${editingCategoria.id}`
        : '/api/admin/categorias';
      
      const response = await authenticatedFetch(url, {
        method: editingCategoria ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        loadCategorias();
        setShowModal(false);
        setEditingCategoria(null);
        setFormData({ nombre: '', imagen: '' });
      }
    } catch (error) {
      console.error('Error guardando categoría:', error);
    }
  };

  const openModal = (categoria?: Categoria) => {
    setEditingCategoria(categoria || null);
    setFormData({
      nombre: categoria?.nombre || '',
      imagen: categoria?.imagen || ''
    });
    setShowModal(true);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategorias.map((categoria) => (
            <div key={categoria.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="aspect-video bg-gray-100 relative">
                {categoria.imagen ? (
                  <img
                    src={categoria.imagen}
                    alt={categoria.nombre}
                    className="w-full h-full object-cover"
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

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-lg font-semibold mb-4">
                {editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Imagen
                  </label>
                  <ImageUploader
                    type="category"
                    initialImage={formData.imagen}
                    onImageUpload={(url) => setFormData({...formData, imagen: url})}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ContrastEnhancer>
  );
}