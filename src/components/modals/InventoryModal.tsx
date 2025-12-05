import React from 'react';
import { InventoryItem, Category } from '../../types';

interface InventoryModalProps {
  newInventoryItem: Partial<InventoryItem>;
  setNewInventoryItem: React.Dispatch<React.SetStateAction<Partial<InventoryItem>>>;
  onClose: () => void;
  onAdd: () => void;
}

export const InventoryModal = ({
  newInventoryItem,
  setNewInventoryItem,
  onClose,
  onAdd,
}: InventoryModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-white mb-4">Добавить позицию</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Название</label>
            <input
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
              value={newInventoryItem.name || ''}
              onChange={e => setNewInventoryItem({ ...newInventoryItem, name: e.target.value })}
              placeholder="Например: Солод Pale Ale"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Категория</label>
              <select
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                value={newInventoryItem.category}
                onChange={e =>
                  setNewInventoryItem({ ...newInventoryItem, category: e.target.value as Category })
                }
              >
                <option value="Сырье">Сырье</option>
                <option value="Готовая продукция">Готовая продукция</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Ед. измерения</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-gray-400 cursor-not-allowed"
                value="кг"
                disabled
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Нач. остаток (кг)</label>
              <input
                type="number"
                step="0.1"
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                value={newInventoryItem.quantity}
                onChange={e =>
                  setNewInventoryItem({ ...newInventoryItem, quantity: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Мин. уровень (кг)</label>
              <input
                type="number"
                step="0.1"
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                value={newInventoryItem.minLevel}
                onChange={e =>
                  setNewInventoryItem({ ...newInventoryItem, minLevel: Number(e.target.value) })
                }
              />
            </div>
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
            onClick={onAdd}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded transition-colors"
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
};
