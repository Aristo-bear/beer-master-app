import React, { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Recipe, UserAccount } from '../../types';

interface ScheduleModalProps {
  selectedDate: string;
  recipes: Recipe[];
  users: UserAccount[];
  onScheduleBrew: (recipeId: string) => void;
  onScheduleShift: (username: string, type: 'day' | 'night') => void;
  onClose: () => void;
}

export const ScheduleModal = ({
  selectedDate,
  recipes,
  users,
  onScheduleBrew,
  onScheduleShift,
  onClose,
}: ScheduleModalProps) => {
  const [activeTab, setActiveTab] = useState<'brew' | 'shift'>('brew');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-white mb-2">События на {selectedDate}</h3>

        <div className="flex bg-gray-700 rounded p-1 mb-4">
          <button
            onClick={() => setActiveTab('brew')}
            className={`flex-1 text-sm py-1.5 rounded transition-colors ${activeTab === 'brew' ? 'bg-gray-600 text-white shadow' : 'text-gray-400'}`}
          >
            Варки
          </button>
          <button
            onClick={() => setActiveTab('shift')}
            className={`flex-1 text-sm py-1.5 rounded transition-colors ${activeTab === 'shift' ? 'bg-gray-600 text-white shadow' : 'text-gray-400'}`}
          >
            График работы
          </button>
        </div>

        {activeTab === 'brew' && (
          <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
            {recipes.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-4">Нет рецептов</p>
            )}
            {recipes.map(recipe => (
              <button
                key={recipe.id}
                onClick={() => onScheduleBrew(recipe.id)}
                className="w-full text-left p-3 rounded bg-gray-700 hover:bg-gray-600 text-white flex justify-between items-center transition-colors"
              >
                <span>{recipe.name}</span>
                <span className="text-xs text-gray-400">{recipe.outputAmount}л</span>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'shift' && (
          <div className="space-y-4 mb-6">
            <p className="text-xs text-gray-400">Назначить смену сотруднику:</p>
            <div className="space-y-2">
              {users.map(user => (
                <div
                  key={user.username}
                  className="flex items-center justify-between bg-gray-700 p-2 rounded"
                >
                  <span className="text-sm text-white">{user.username}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onScheduleShift(user.username, 'day')}
                      className="p-1 bg-gray-600 hover:bg-amber-600 rounded text-amber-200 transition-colors"
                      title="Дневная смена"
                    >
                      <Sun className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onScheduleShift(user.username, 'night')}
                      className="p-1 bg-gray-600 hover:bg-indigo-600 rounded text-indigo-200 transition-colors"
                      title="Ночная смена"
                    >
                      <Moon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full bg-gray-600 hover:bg-gray-500 text-white py-2 rounded transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>
  );
};
