'use client';

import { useEffect, useState } from 'react';

interface Product {
  _id: string;
  sku: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  unit: string;
}

interface Recipe {
  _id: string;
  product: { _id: string; name: string; cost: number };
  portionSize: number;
  portionUnit: string;
  ingredients: Array<{
    product: { _id?: string; name: string; unit: string } | string;
    quantity: number;
    unit: string;
    cost: number;
  }>;
  totalCost: number;
  costPerPortion: number;
  yieldFactor: number;
  prepTime?: number;
  cookTime?: number;
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const [formData, setFormData] = useState({
    product: '',
    portionSize: 1,
    portionUnit: 'pcs',
    yieldFactor: 1,
    prepTime: 0,
    cookTime: 0,
    ingredients: [] as Array<{
      product: string;
      quantity: number;
      unit: string;
    }>,
  });

  const [currentIngredient, setCurrentIngredient] = useState({
    product: '',
    quantity: 0,
    unit: 'gram',
  });

  useEffect(() => {
    loadRecipes();
    loadProducts();
  }, []);

  const loadRecipes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/recipes', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Recipes loaded:', data);
        setRecipes(data.recipes || data.data || []);
      }
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/products', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Products loaded for recipes:', data);
        setProducts(data.products || data.data || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const addIngredient = () => {
    if (!currentIngredient.product || currentIngredient.quantity <= 0) {
      alert('Pilih produk dan masukkan jumlah yang valid!');
      return;
    }

    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { ...currentIngredient }],
    });

    setCurrentIngredient({
      product: '',
      quantity: 0,
      unit: 'gram',
    });
  };

  const removeIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.ingredients.length === 0) {
      alert('Tambahkan minimal 1 bahan!');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingRecipe 
        ? `/api/recipes/${editingRecipe._id}`
        : '/api/recipes';
      const method = editingRecipe ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert(editingRecipe ? 'Resep berhasil diupdate!' : 'Resep berhasil ditambahkan!');
        setShowModal(false);
        setEditingRecipe(null);
        resetForm();
        loadRecipes();
        loadProducts(); // Reload to update products with hasRecipe flag
      } else {
        const error = await response.json();
        alert(error.error || 'Gagal menyimpan resep!');
      }
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert('Terjadi kesalahan!');
    }
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormData({
      product: recipe.product._id,
      portionSize: recipe.portionSize,
      portionUnit: recipe.portionUnit,
      yieldFactor: recipe.yieldFactor,
      prepTime: recipe.prepTime || 0,
      cookTime: recipe.cookTime || 0,
      ingredients: recipe.ingredients.map(ing => {
        const productId = typeof ing.product === 'string' 
          ? ing.product 
          : (ing.product._id || '');
        return {
          product: productId,
          quantity: ing.quantity,
          unit: ing.unit,
        };
      }),
    });
    setShowModal(true);
  };

  const handleDelete = async (recipeId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus resep ini?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert('Resep berhasil dihapus!');
        loadRecipes();
        loadProducts(); // Reload to update products
      } else {
        const error = await response.json();
        alert(error.error || 'Gagal menghapus resep!');
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Terjadi kesalahan!');
    }
  };

  const resetForm = () => {
    setFormData({
      product: '',
      portionSize: 1,
      portionUnit: 'pcs',
      yieldFactor: 1,
      prepTime: 0,
      cookTime: 0,
      ingredients: [],
    });
    setCurrentIngredient({
      product: '',
      quantity: 0,
      unit: 'gram',
    });
    setEditingRecipe(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getProductName = (id: string) => {
    return products.find(p => p._id === id)?.name || 'Unknown';
  };

  const getProductUnit = (id: string) => {
    return products.find(p => p._id === id)?.unit || 'pcs';
  };

  const calculateFoodCostPercentage = (recipe: Recipe) => {
    return ((recipe.costPerPortion / recipe.product.cost) * 100).toFixed(1);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Resep & BOM (Bill of Materials)</h1>
          <p className="text-gray-600 text-sm mt-1">
            Kelola resep produk dan hitung HPP otomatis
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Tambah Resep
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-lg">
        <div className="flex items-start">
          <div className="shrink-0">
            <span className="text-2xl">💡</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-blue-800">
              Fitur Resep & BOM
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Saat transaksi, stok bahan baku akan terpotong otomatis berdasarkan resep. 
              HPP dihitung otomatis dengan yield factor untuk memperhitungkan susut bahan.
            </p>
          </div>
        </div>
      </div>

      {/* Recipes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.map(recipe => (
          <div key={recipe._id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
            {/* Header */}
            <div className="bg-linear-to-r from-orange-500 to-red-500 p-4 text-white">
              <h3 className="text-lg font-bold">{recipe.product.name}</h3>
              <p className="text-sm text-orange-100">
                {recipe.portionSize} {recipe.portionUnit}
              </p>
            </div>

            {/* Body */}
            <div className="p-4">
              {/* Ingredients */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Bahan:</h4>
                <div className="space-y-1">
                  {recipe.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        • {typeof ing.product === 'string' ? 'Product' : ing.product.name}
                      </span>
                      <span className="font-medium">
                        {ing.quantity} {ing.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost Details */}
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="font-semibold">{formatCurrency(recipe.totalCost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cost/Portion:</span>
                  <span className="font-bold text-orange-600">
                    {formatCurrency(recipe.costPerPortion)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Harga Jual:</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(recipe.product.cost)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Food Cost:</span>
                  <span className={`font-bold ${
                    parseFloat(calculateFoodCostPercentage(recipe)) > 40 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {calculateFoodCostPercentage(recipe)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Yield Factor:</span>
                  <span className="font-medium">{(recipe.yieldFactor * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Time Info */}
              {((recipe.prepTime && recipe.prepTime > 0) || (recipe.cookTime && recipe.cookTime > 0)) && (
                <div className="border-t mt-3 pt-3 flex gap-4 text-xs text-gray-600">
                  {recipe.prepTime && recipe.prepTime > 0 && (
                    <div>⏱️ Prep: {recipe.prepTime} min</div>
                  )}
                  {recipe.cookTime && recipe.cookTime > 0 && (
                    <div>🔥 Cook: {recipe.cookTime} min</div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="border-t mt-3 pt-3 flex gap-2">
                <button
                  onClick={() => handleEdit(recipe)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(recipe._id)}
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  🗑️ Hapus
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {recipes.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-md">
          <span className="text-6xl mb-4 block">🍳</span>
          <p>Belum ada resep</p>
          <p className="text-sm mt-2">Tambahkan resep untuk produk Anda</p>
        </div>
      )}

      {/* Add/Edit Recipe Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingRecipe ? 'Edit Resep' : 'Tambah Resep'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Selection */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">1. Produk Akhir</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pilih Produk *
                    </label>
                    <select
                      required
                      value={formData.product}
                      onChange={(e) => setFormData({...formData, product: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={products.length === 0}
                    >
                      <option value="">
                        {products.length === 0 ? 'Tidak ada produk tersedia' : 'Pilih Produk'}
                      </option>
                      {products.map(product => (
                        <option key={product._id} value={product._id}>
                          {product.name} - {formatCurrency(product.price)}
                        </option>
                      ))}
                    </select>
                    {products.length === 0 ? (
                      <div className="text-xs text-red-500 mt-1">
                        ⚠️ Silakan tambahkan produk terlebih dahulu di halaman Products
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 mt-1">
                        {products.length} produk tersedia
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Yield Factor *
                    </label>
                    <input
                      type="number"
                      required
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={formData.yieldFactor}
                      onChange={(e) => setFormData({...formData, yieldFactor: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1.0"
                    />
                    <p className="text-xs text-gray-500 mt-1">0.1-1.0 (susut)</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Jumlah Porsi *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.portionSize}
                      onChange={(e) => setFormData({...formData, portionSize: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Porsi *
                    </label>
                    <select
                      required
                      value={formData.portionUnit}
                      onChange={(e) => setFormData({...formData, portionUnit: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pcs">Pcs</option>
                      <option value="porsi">Porsi</option>
                      <option value="pack">Pack</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Ingredients */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">2. Bahan Baku</h3>
                
                {/* Add Ingredient Form */}
                <div className="grid grid-cols-12 gap-2 mb-4">
                  <div className="col-span-6">
                    <select
                      value={currentIngredient.product}
                      onChange={(e) => setCurrentIngredient({...currentIngredient, product: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={products.length === 0}
                    >
                      <option value="">
                        {products.length === 0 ? 'Tidak ada bahan tersedia' : 'Pilih Bahan'}
                      </option>
                      {products.map(product => (
                        <option key={product._id} value={product._id}>
                          {product.name} ({product.stock} {product.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={currentIngredient.quantity || ''}
                      onChange={(e) => setCurrentIngredient({...currentIngredient, quantity: parseFloat(e.target.value)})}
                      placeholder="Jumlah"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <select
                      value={currentIngredient.unit}
                      onChange={(e) => setCurrentIngredient({...currentIngredient, unit: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="gram">Gram</option>
                      <option value="kg">Kg</option>
                      <option value="ml">ML</option>
                      <option value="liter">Liter</option>
                      <option value="pcs">Pcs</option>
                    </select>
                  </div>

                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={addIngredient}
                      className="w-full h-full bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Ingredients List */}
                {formData.ingredients.length > 0 && (
                  <div className="bg-white rounded-lg p-3 space-y-2">
                    {formData.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm">
                          <span className="font-semibold">{getProductName(ing.product)}</span>
                          {' - '}
                          <span className="text-gray-600">
                            {ing.quantity} {ing.unit}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeIngredient(idx)}
                          className="text-red-600 hover:text-red-800 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional Fields */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">3. Info Tambahan (Opsional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prep Time (menit)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.prepTime}
                      onChange={(e) => setFormData({...formData, prepTime: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cook Time (menit)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.cookTime}
                      onChange={(e) => setFormData({...formData, cookTime: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium"
                >
                  {editingRecipe ? 'Update Resep' : 'Simpan Resep'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
