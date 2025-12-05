import React from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { UserAccount } from '../types';

interface EmployeesPageProps {
  users: UserAccount[];
  currentUser: UserAccount;
  onOpenEmployeeModal: () => void;
  onDeleteEmployee: (username: string) => void;
}

export const EmployeesPage = ({
  users,
  currentUser,
  onOpenEmployeeModal,
  onDeleteEmployee,
}: EmployeesPageProps) => {
  if (currentUser.role !== 'admin') {
    return <div className="p-8 text-center text-gray-500">Доступ запрещен</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Сотрудники</h2>
        <button
          onClick={onOpenEmployeeModal}
          className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
        >
          <UserPlus className="w-4 h-4" /> Добавить сотрудника
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-900 text-gray-400 text-xs uppercase">
              <th className="p-4">Пользователь</th>
              <th className="p-4">Должность</th>
              <th className="p-4">Пароль</th>
              <th className="p-4 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {users.map((user, idx) => (
              <tr key={idx} className="hover:bg-gray-700/50">
                <td className="p-4 font-medium text-white">{user.username}</td>
                <td className="p-4">
                  <span
                    className={`text-xs px-2 py-1 rounded uppercase font-bold ${
                      user.role === 'admin'
                        ? 'bg-amber-900/30 text-amber-500'
                        : user.role === 'brewer'
                          ? 'bg-blue-900/30 text-blue-500'
                          : user.role === 'tester'
                            ? 'bg-pink-900/30 text-pink-500'
                            : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {user.role === 'admin'
                      ? 'Администратор'
                      : user.role === 'brewer'
                        ? 'Пивовар'
                        : user.role === 'tester'
                          ? 'Тестер'
                          : 'Помощник'}
                  </span>
                </td>
                <td className="p-4 text-gray-500 font-mono text-xs">{user.password}</td>
                <td className="p-4 text-right">
                  {user.username !== currentUser.username && (
                    <button
                      onClick={() => onDeleteEmployee(user.username)}
                      className="text-gray-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
