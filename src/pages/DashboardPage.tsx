import React from 'react';
import { Plus, TrendingUp, CheckCircle2, Droplet, CheckSquare, Trash2 } from 'lucide-react';
import { Task, LogEntry, InventoryItem, UserAccount } from '../types';

interface DashboardPageProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  logs: LogEntry[];
  inventory: InventoryItem[];
  reservedInventory: Record<string, number>;
  currentUser: UserAccount;
}

export const DashboardPage = ({
  tasks,
  setTasks,
  logs,
  inventory,
  reservedInventory,
  currentUser,
}: DashboardPageProps) => {
  const [newTaskText, setNewTaskText] = React.useState('');

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      text: newTaskText,
      completed: false,
      priority: 'normal',
    };
    setTasks([newTask, ...tasks]);
    setNewTaskText('');
  };

  const deleteTask = (id: string) => {
    if (currentUser.role === 'assistant' || currentUser.role === 'tester') return;
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-700 bg-gray-900/50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <CheckSquare className="text-amber-500 w-6 h-6" /> Задачи смены
            </h3>
            <span className="text-sm font-medium text-gray-400">
              {tasks.filter(t => t.completed).length} из {tasks.length} выполнено
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
            <div
              className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${tasks.length === 0 ? 0 : Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)}%`,
              }}
            />
          </div>
        </div>
        <div className="p-6">
          {currentUser.role !== 'assistant' && currentUser.role !== 'tester' && (
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                value={newTaskText}
                onChange={e => setNewTaskText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder="Добавить новую задачу для смены..."
                className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 focus:border-amber-500 focus:outline-none"
              />
              <button
                onClick={addTask}
                className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Добавить
              </button>
            </div>
          )}
          <div className="space-y-3">
            {tasks.map(task => (
              <div
                key={task.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all ${task.completed ? 'bg-gray-900/50 border-gray-800 opacity-60' : 'bg-gray-700/30 border-gray-600 hover:bg-gray-700/50'}`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'bg-transparent border-gray-500 hover:border-amber-500'}`}
                  >
                    {task.completed && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                  <span
                    className={`text-sm md:text-base ${task.completed ? 'line-through text-gray-500' : 'text-gray-200'}`}
                  >
                    {task.text}
                  </span>
                </div>
                {currentUser.role !== 'assistant' && currentUser.role !== 'tester' && (
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-gray-500 hover:text-red-400 p-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700 bg-gray-800/50">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" /> Недавняя активность
            </h3>
          </div>
          <div className="p-4">
            <ul className="space-y-3">
              {logs.slice(0, 5).map(log => (
                <li
                  key={log.id}
                  className="flex items-start justify-between text-sm pb-3 border-b border-gray-700 last:border-0"
                >
                  <div>
                    <span
                      className={`font-bold ${log.action === 'ПРИХОД' ? 'text-green-400' : log.action === 'РАСХОД' ? 'text-red-400' : 'text-purple-400'}`}
                    >
                      {log.action}
                    </span>
                    <p className="text-gray-300">{log.details}</p>
                  </div>
                  <span className="text-gray-500 text-xs">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700 bg-gray-800/50">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Droplet className="w-4 h-4 text-amber-500" /> Требуется закупка
            </h3>
          </div>
          <div className="p-4">
            <ul className="space-y-3">
              {inventory
                .filter(i => i.quantity - (reservedInventory[i.id] || 0) <= i.minLevel)
                .map(item => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between text-sm p-3 bg-red-900/10 border border-red-900/30 rounded-lg"
                  >
                    <span className="text-gray-200 font-medium">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-red-400 font-bold">
                        {(item.quantity - (reservedInventory[item.id] || 0)).toFixed(1)} {item.unit}
                      </span>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
