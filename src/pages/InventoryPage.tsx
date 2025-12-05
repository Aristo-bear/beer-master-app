import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { InventoryItem, UserAccount, ManualInputModalState } from '../types';
import { InventoryActionButtons } from '../components/InventoryActionButtons';

interface InventoryPageProps {
  inventory: InventoryItem[];
  reservedInventory: Record<string, number>;
  currentUser: UserAccount;
  onUpdateInventory: (name: string, change: number, reason: string) => string;
  onOpenInventoryModal: () => void;
  onOpenManualModal: (config: ManualInputModalState) => void;
  onDeleteItem: (id: string) => void;
  manualValue: string;
  setManualValue: React.Dispatch<React.SetStateAction<string>>;
}

export const InventoryPage = ({
  inventory,
  reservedInventory,
  currentUser,
  onUpdateInventory,
  onOpenInventoryModal,
  onOpenManualModal,
  onDeleteItem,
  setManualValue,
}: InventoryPageProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInventory = inventory.filter(
    item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Поиск по названию или категории..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        {(currentUser.role === 'admin' || currentUser.role === 'brewer') && (
          <button
            onClick={onOpenInventoryModal}
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Добавить позицию
          </button>
        )}
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-full">
            <thead>
              <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Название</th>
                <th className="p-4 font-semibold hidden md:table-cell">Категория</th>
                <th className="p-4 font-semibold text-center">Всего</th>
                <th className="p-4 font-semibold text-center text-amber-500">Резерв</th>
                <th className="p-4 font-semibold text-center text-green-500">Доступно</th>
                <th className="p-4 font-semibold text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredInventory.map(item => {
                const reserved = reservedInventory[item.id] || 0;
                const available = Math.max(0, item.quantity - reserved);

                return (
                  <tr key={item.id} className="hover:bg-gray-700/50 transition-colors">
                    <td className="p-4 text-white font-medium">
                      {item.name}
                      <div className="md:hidden text-xs text-gray-500 mt-1">{item.category}</div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${item.category === 'Сырье' ? 'bg-amber-900/30 text-amber-300' : 'bg-blue-900/30 text-blue-300'}`}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        onClick={() => {
                          if (currentUser.role !== 'tester') {
                            onOpenManualModal({
                              isOpen: true,
                              itemId: item.id,
                              type: 'set',
                              itemName: item.name,
                              currentValue: item.quantity,
                            });
                            setManualValue(item.quantity.toString());
                          }
                        }}
                        className={`font-bold ${currentUser.role !== 'tester' ? 'cursor-pointer hover:underline decoration-dashed underline-offset-4' : ''} text-gray-200`}
                      >
                        {item.quantity.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {reserved > 0 ? (
                        <span className="text-amber-400 font-bold">
                          {reserved.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`font-bold ${available <= item.minLevel ? 'text-red-400' : 'text-green-400'}`}
                      >
                        {available.toLocaleString()}
                      </span>
                      <span className="text-gray-500 text-xs ml-1">{item.unit}</span>
                    </td>
                    <td className="p-4 text-right">
                      <InventoryActionButtons
                        item={item}
                        currentUser={currentUser}
                        onUpdateInventory={onUpdateInventory}
                        onOpenManualModal={onOpenManualModal}
                        onDelete={onDeleteItem}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-500 text-center mt-2">
        Колонки: Всего = физический остаток, Резерв = запланированные варки, Доступно = для новых
        задач
      </p>
    </div>
  );
};
