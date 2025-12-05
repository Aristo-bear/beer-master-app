import React from 'react';
import { ManualInputModalState } from '../../types';

interface ManualInputModalProps {
  modalState: ManualInputModalState;
  manualValue: string;
  setManualValue: React.Dispatch<React.SetStateAction<string>>;
  onClose: () => void;
  onConfirm: () => void;
}

export const ManualInputModal = ({
  modalState,
  manualValue,
  setManualValue,
  onClose,
  onConfirm,
}: ManualInputModalProps) => {
  if (!modalState.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-sm p-6">
        <h3 className="text-xl font-bold text-white mb-2">
          {modalState.type === 'add'
            ? 'Поступление'
            : modalState.type === 'subtract'
              ? 'Списание'
              : 'Корректировка остатка'}
        </h3>
        <p className="text-gray-400 text-sm mb-4">{modalState.itemName}</p>

        <div className="relative mb-6">
          <input
            type="number"
            step="0.1"
            autoFocus
            value={manualValue}
            onChange={e => setManualValue(e.target.value)}
            placeholder="0.0"
            className="w-full bg-gray-900 border border-gray-700 text-3xl font-mono text-center text-white rounded-lg p-4 focus:border-blue-500 focus:outline-none"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">кг</span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 text-white py-3 rounded-lg font-bold ${
              modalState.type === 'add'
                ? 'bg-green-600 hover:bg-green-500'
                : modalState.type === 'subtract'
                  ? 'bg-red-600 hover:bg-red-500'
                  : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
};
