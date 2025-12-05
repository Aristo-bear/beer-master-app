import React from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { Recipe, InventoryItem } from '../../types';

interface RecipeModalProps {
  editingRecipe: Partial<Recipe> | null;
  setEditingRecipe: React.Dispatch<React.SetStateAction<Partial<Recipe> | null>>;
  inventory: InventoryItem[];
  onClose: () => void;
  onSave: () => void;
}

export const RecipeModal = ({
  editingRecipe,
  setEditingRecipe,
  inventory,
  onClose,
  onSave,
}: RecipeModalProps) => {
  if (!editingRecipe) return null;

  const availableProducts = inventory.filter(i => i.category === 'Готовая продукция');
  const availableIngredients = inventory.filter(i => i.category === 'Сырье');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-white mb-4">
          {editingRecipe.id ? 'Редактировать карту' : 'Новая технологическая карта'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Название карты</label>
            <input
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
              value={editingRecipe.name || ''}
              onChange={e => setEditingRecipe({ ...editingRecipe, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Выход продукции (кг)</label>
            <input
              type="number"
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
              value={editingRecipe.outputAmount || 0}
              onChange={e =>
                setEditingRecipe({ ...editingRecipe, outputAmount: Number(e.target.value) })
              }
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Производимый продукт</label>
            <select
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
              value={editingRecipe.outputItemId || ''}
              onChange={e => setEditingRecipe({ ...editingRecipe, outputItemId: e.target.value })}
            >
              <option value="">Выберите продукт...</option>
              {availableProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-gray-300 text-sm">Ингредиенты</h4>
            <button
              onClick={() =>
                setEditingRecipe({
                  ...editingRecipe,
                  ingredients: [...(editingRecipe.ingredients || []), { itemId: '', amount: 0 }],
                })
              }
              className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Добавить компонент
            </button>
          </div>
          <div className="space-y-2 bg-gray-900/50 p-4 rounded border border-gray-700/50">
            {(editingRecipe.ingredients || []).map((ing, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  className="flex-1 bg-gray-800 border border-gray-700 rounded p-1 text-sm text-white"
                  value={ing.itemId}
                  onChange={e => {
                    const newIngs = [...(editingRecipe.ingredients || [])];
                    newIngs[idx].itemId = e.target.value;
                    setEditingRecipe({ ...editingRecipe, ingredients: newIngs });
                  }}
                >
                  <option value="">Выберите сырье...</option>
                  {availableIngredients.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.unit})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.001"
                  className="w-20 bg-gray-800 border border-gray-700 rounded p-1 text-sm text-white"
                  placeholder="Кол-во"
                  value={ing.amount}
                  onChange={e => {
                    const newIngs = [...(editingRecipe.ingredients || [])];
                    newIngs[idx].amount = Number(e.target.value);
                    setEditingRecipe({ ...editingRecipe, ingredients: newIngs });
                  }}
                />
                <button
                  onClick={() => {
                    const newIngs = [...(editingRecipe.ingredients || [])];
                    newIngs.splice(idx, 1);
                    setEditingRecipe({ ...editingRecipe, ingredients: newIngs });
                  }}
                  className="p-1 text-gray-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {(editingRecipe.ingredients || []).length === 0 && (
              <p className="text-gray-500 text-xs italic text-center">Нет ингредиентов</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={onSave}
            className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};
