import React, { useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Factory,
  Beaker,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { Recipe, InventoryItem, ScheduledBrew, WorkShift, UserAccount } from '../types';
import { ScheduleModal } from '../components/modals';

interface ProductionPageProps {
  recipes: Recipe[];
  inventory: InventoryItem[];
  scheduledBrews: ScheduledBrew[];
  workShifts: WorkShift[];
  users: UserAccount[];
  currentUser: UserAccount;
  onOpenRecipeModal: (recipe?: Partial<Recipe>) => void;
  onDeleteRecipe: (id: string) => void;
  onBrew: (recipe: Recipe, scheduledBrewId?: string) => void;
  onScheduleBrew: (recipeId: string, date: string) => void;
  onDeleteScheduledBrew: (brewId: string) => void;
  onScheduleShift: (username: string, type: 'day' | 'night', date: string) => void;
  onDeleteShift: (shiftId: string) => void;
}

export const ProductionPage = ({
  recipes,
  inventory,
  scheduledBrews,
  workShifts,
  users,
  currentUser,
  onOpenRecipeModal,
  onDeleteRecipe,
  onBrew,
  onScheduleBrew,
  onDeleteScheduledBrew,
  onScheduleShift,
  onDeleteShift,
}: ProductionPageProps) => {
  const [productionView, setProductionView] = useState<'recipes' | 'schedule'>('recipes');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateForEvent, setSelectedDateForEvent] = useState<string | null>(null);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const monthNames = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ];

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const handleScheduleBrewWrapper = (recipeId: string) => {
    if (!selectedDateForEvent) return;
    onScheduleBrew(recipeId, selectedDateForEvent);
    setSelectedDateForEvent(null);
  };

  const handleScheduleShiftWrapper = (username: string, type: 'day' | 'night') => {
    if (!selectedDateForEvent) return;
    onScheduleShift(username, type, selectedDateForEvent);
    setSelectedDateForEvent(null);
  };

  const renderSchedule = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-purple-500" />
          {monthNames[month]} {year}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-4 text-center text-gray-400 mb-2">
        <div>Пн</div>
        <div>Вт</div>
        <div>Ср</div>
        <div>Чт</div>
        <div>Пт</div>
        <div>Сб</div>
        <div>Вс</div>
      </div>
      <div className="grid grid-cols-7 gap-1 md:gap-4">
        {days.map((day, idx) => {
          if (day === null)
            return <div key={`empty-${idx}`} className="h-32 md:h-40 bg-transparent"></div>;

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayBrews = scheduledBrews.filter(b => b.date === dateStr);
          const dayShifts = workShifts.filter(s => s.date === dateStr);
          const isToday = new Date().toISOString().slice(0, 10) === dateStr;

          return (
            <div
              key={day}
              onClick={() => {
                if (currentUser.role !== 'assistant' && currentUser.role !== 'tester')
                  setSelectedDateForEvent(dateStr);
              }}
              className={`h-32 md:h-40 bg-gray-800 border ${isToday ? 'border-amber-500 bg-gray-800/80' : 'border-gray-700'} rounded-lg p-2 flex flex-col items-start justify-start hover:bg-gray-700/50 cursor-pointer overflow-hidden relative`}
            >
              <span
                className={`text-sm font-bold mb-1 ${isToday ? 'text-amber-500' : 'text-gray-300'}`}
              >
                {day}
              </span>

              <div className="w-full flex-1 overflow-y-auto space-y-1 scrollbar-hide">
                {dayBrews.map(brew => {
                  const recipe = recipes.find(r => r.id === brew.recipeId);
                  return (
                    <div
                      key={brew.id}
                      className={`w-full text-xs p-1 rounded text-left flex justify-between items-center group ${
                        brew.status === 'completed'
                          ? 'bg-green-900/40 text-green-300 border border-green-900/50'
                          : 'bg-blue-900/40 text-blue-300 border border-blue-900/50 hover:bg-blue-800/60'
                      }`}
                    >
                      <span
                        className="truncate cursor-pointer flex-1"
                        onClick={e => {
                          e.stopPropagation();
                          if (
                            brew.status === 'planned' &&
                            confirm(`Начать варку: ${recipe?.name}?`)
                          ) {
                            if (recipe) onBrew(recipe, brew.id);
                          }
                        }}
                        title={recipe?.name}
                      >
                        {brew.status === 'completed' && (
                          <CheckCircle2 className="inline w-3 h-3 mr-1" />
                        )}
                        {recipe?.name}
                      </span>
                      {(currentUser.role === 'admin' || currentUser.role === 'brewer') &&
                        brew.status === 'planned' && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onDeleteScheduledBrew(brew.id);
                            }}
                            className="text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                    </div>
                  );
                })}

                {dayShifts.map(shift => (
                  <div
                    key={shift.id}
                    className="w-full text-[10px] p-1 rounded flex justify-between items-center bg-gray-700/50 text-gray-300 border border-gray-600/50 group"
                  >
                    <span className="flex items-center gap-1 truncate">
                      {shift.type === 'day' ? (
                        <Sun className="w-3 h-3 text-amber-400" />
                      ) : (
                        <Moon className="w-3 h-3 text-indigo-400" />
                      )}
                      {shift.username}
                    </span>
                    {(currentUser.role === 'admin' || currentUser.role === 'brewer') && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteShift(shift.id);
                        }}
                        className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDateForEvent && (
        <ScheduleModal
          selectedDate={selectedDateForEvent}
          recipes={recipes}
          users={users}
          onScheduleBrew={handleScheduleBrewWrapper}
          onScheduleShift={handleScheduleShiftWrapper}
          onClose={() => setSelectedDateForEvent(null)}
        />
      )}
    </div>
  );

  const renderRecipes = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end">
        {currentUser.role !== 'assistant' && currentUser.role !== 'tester' && (
          <button
            onClick={() =>
              onOpenRecipeModal({ name: '', ingredients: [], outputAmount: 0, outputItemId: '' })
            }
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
          >
            <Plus className="w-4 h-4" /> Создать карту
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {recipes.map(recipe => (
          <div
            key={recipe.id}
            className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg flex flex-col group"
          >
            <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Factory className="w-5 h-5 text-purple-500" />
                {recipe.name}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded">
                  {recipe.outputAmount}л
                </span>
                {currentUser.role !== 'assistant' && currentUser.role !== 'tester' && (
                  <>
                    <button
                      onClick={() => onOpenRecipeModal(JSON.parse(JSON.stringify(recipe)))}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteRecipe(recipe.id)}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="p-6 flex-1">
              <h4 className="text-gray-400 text-xs uppercase font-semibold mb-3">Состав:</h4>
              <ul className="space-y-2 mb-6">
                {recipe.ingredients.map((ing, idx) => {
                  const item = inventory.find(i => i.id === ing.itemId);
                  const hasEnough = item && item.quantity >= ing.amount;
                  return (
                    <li
                      key={idx}
                      className="flex justify-between items-center text-sm border-b border-gray-700 pb-2 last:border-0"
                    >
                      <span className="text-gray-300">{item?.name || 'Неизвестно'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">
                          {ing.amount} {item?.unit}
                        </span>
                        {!hasEnough && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={() => onBrew(recipe)}
                disabled={currentUser.role === 'tester'}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Beaker className="w-5 h-5" /> Произвести
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex bg-gray-800 p-1 rounded-lg w-full md:w-auto md:inline-flex mb-6 border border-gray-700">
        <button
          onClick={() => setProductionView('recipes')}
          className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all ${productionView === 'recipes' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
        >
          Техкарты
        </button>
        <button
          onClick={() => setProductionView('schedule')}
          className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all ${productionView === 'schedule' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
        >
          Календарь и График
        </button>
      </div>
      {productionView === 'recipes' ? renderRecipes() : renderSchedule()}
    </div>
  );
};
