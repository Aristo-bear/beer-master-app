import React, { useRef } from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { InventoryItem, UserAccount, ManualInputModalState } from '../types';

interface InventoryActionButtonsProps {
  item: InventoryItem;
  currentUser: UserAccount;
  onUpdateInventory: (name: string, change: number, reason: string) => void;
  onOpenManualModal: (config: ManualInputModalState) => void;
  onDelete: (id: string) => void;
}

export const InventoryActionButtons = ({
  item,
  currentUser,
  onUpdateInventory,
  onOpenManualModal,
  onDelete,
}: InventoryActionButtonsProps) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const startPress = (type: 'add' | 'subtract') => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onOpenManualModal({
        isOpen: true,
        itemId: item.id,
        type: type,
        itemName: item.name,
      });
    }, 1500);
  };

  const endPress = (type: 'add' | 'subtract') => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!isLongPress.current) {
      const change = type === 'add' ? 1 : -1;
      onUpdateInventory(item.name, change, 'Быстрое изменение');
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onMouseDown={() => startPress('add')}
        onMouseUp={() => endPress('add')}
        onMouseLeave={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
        }}
        onTouchStart={() => startPress('add')}
        onTouchEnd={e => {
          e.preventDefault();
          endPress('add');
        }}
        className="p-1 hover:bg-gray-600 rounded text-green-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors active:scale-95"
        title="Добавить 1 кг (Удерживайте для ввода)"
        disabled={currentUser.role === 'tester'}
      >
        <Plus className="w-5 h-5 md:w-4 md:h-4" />
      </button>
      <button
        onMouseDown={() => startPress('subtract')}
        onMouseUp={() => endPress('subtract')}
        onMouseLeave={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
        }}
        onTouchStart={() => startPress('subtract')}
        onTouchEnd={e => {
          e.preventDefault();
          endPress('subtract');
        }}
        className="p-1 hover:bg-gray-600 rounded text-red-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors active:scale-95"
        title="Списать 1 кг (Удерживайте для ввода)"
        disabled={currentUser.role === 'tester'}
      >
        <Minus className="w-5 h-5 md:w-4 md:h-4" />
      </button>
      {(currentUser.role === 'admin' || currentUser.role === 'brewer') && (
        <button
          onClick={() => onDelete(item.id)}
          className="p-1 hover:bg-gray-600 rounded text-gray-500 hover:text-red-400 ml-2"
          title="Удалить позицию"
        >
          <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
        </button>
      )}
    </div>
  );
};
