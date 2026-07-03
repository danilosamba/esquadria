import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { Package, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { formatCurrency, parseDecimal, formatDecimal } from '../utils';

interface Product {
  id: string;
  description: string;
  unit_price: number;
  unit: string;
}

const AdminProducts = () => {
  const { token } = useAuth();
  const { showModal } = useModal();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Form status
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [unit, setUnit] = useState('M');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [message, setMessage] = useState<{type: 'error'|'success', text: string} | null>(null);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setProducts(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const productData = {
        description: description.toUpperCase(),
        unit_price: unitPrice,
        unit
    };

    try {
      const url = editingId ? `/api/products/${editingId}` : '/api/products';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: editingId ? 'Produto atualizado!' : 'Produto cadastrado!' });
      resetForm();
      fetchProducts();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDescription('');
    setUnitPrice(0);
    setUnit('M');
    setEditingId(null);
  };

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    setDescription(p.description);
    setUnitPrice(p.unit_price);
    setUnit(p.unit);
    setMessage(null);
  };

  const handleDelete = async (productId: string) => {
    showModal({
      title: 'Excluir Produto',
      message: 'Tem certeza que deseja excluir este produto?',
      type: 'confirm',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          fetchProducts();
          showModal({
            title: 'Sucesso',
            message: 'Produto excluído com sucesso.',
            type: 'success'
          });
        } catch (e: any) {
          showModal({
            title: 'Erro',
            message: e.message,
            type: 'error'
          });
        }
      }
    });
  };

  return (
    <div className="flex h-full bg-gray-100 p-6 gap-6">
      {/* Sidebar de Cadastro */}
      <div className="w-1/3 bg-white p-6 rounded-lg shadow-sm h-fit">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Package className="text-indigo-600" />
            {editingId ? 'Editar Produto' : 'Cadastrar Produto'}
        </h2>

        {message && (
            <div className={`p-3 rounded mb-4 text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {message.text}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Descrição</label>
                <input
                    type="text"
                    required
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded focus:ring focus:ring-indigo-200 focus:border-indigo-500 outline-none uppercase"
                    placeholder="Descrição do produto"
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Unidade</label>
                    <select
                        value={unit}
                        onChange={e => setUnit(e.target.value)}
                        className="w-full border border-gray-300 p-2 rounded focus:ring focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                    >
                        <option value="M">M</option>
                        <option value="M2">M2</option>
                        <option value="M3">M3</option>
                        <option value="CM">CM</option>
                        <option value="MM">MM</option>
                        <option value="UN">UN</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Preço Unitário</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={formatDecimal(unitPrice)}
                        onChange={e => setUnitPrice(parseDecimal(e.target.value))}
                        className="w-full border border-gray-300 p-2 rounded focus:ring focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                        placeholder="0,00"
                    />
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-indigo-600 text-white font-bold py-2 rounded shadow hover:bg-indigo-700 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                    {editingId ? <Save size={18} /> : <Plus size={18} />}
                    {editingId ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
                {editingId && (
                    <button
                        type="button"
                        onClick={resetForm}
                        className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded shadow hover:bg-gray-300 transition"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>
        </form>
      </div>

      {/* Lista de Produtos */}
      <div className="flex-1 bg-white p-6 rounded-lg shadow-sm overflow-hidden flex flex-col">
        <h2 className="text-xl font-bold mb-4">Produtos Cadastrados</h2>
        <div className="overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white">
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
                        <th className="p-3 font-semibold">Descrição</th>
                        <th className="p-3 font-semibold text-center w-24">Unidade</th>
                        <th className="p-3 font-semibold text-right w-32">Preço Unit.</th>
                        <th className="p-3 font-semibold text-center w-24">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map(p => (
                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3 font-medium text-gray-900 uppercase">{p.description}</td>
                            <td className="p-3 text-center text-gray-600 font-bold">{p.unit}</td>
                            <td className="p-3 text-right font-bold text-gray-700">{formatCurrency(p.unit_price)}</td>
                            <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => handleEdit(p)}
                                        className="text-indigo-500 hover:text-indigo-700 transition"
                                        title="Editar Produto"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(p.id)}
                                        className="text-red-500 hover:text-red-700 transition"
                                        title="Excluir Produto"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {products.length === 0 && (
                        <tr><td colSpan={4} className="p-4 text-center text-gray-400">Nenhum produto cadastrado.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;
