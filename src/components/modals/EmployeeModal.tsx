import React from 'react';
import { UserAccount, UserRole } from '../../types';

interface EmployeeModalProps {
  newEmployee: UserAccount;
  setNewEmployee: React.Dispatch<React.SetStateAction<UserAccount>>;
  onClose: () => void;
  onAdd: () => void;
}

export const EmployeeModal = ({
  newEmployee,
  setNewEmployee,
  onClose,
  onAdd,
}: EmployeeModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-white mb-4">Добавить сотрудника</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Имя пользователя</label>
            <input
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
              value={newEmployee.username}
              onChange={e => setNewEmployee({ ...newEmployee, username: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Пароль</label>
            <input
              type="password"
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
              value={newEmployee.password}
              onChange={e => setNewEmployee({ ...newEmployee, password: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Должность</label>
            <select
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
              value={newEmployee.role}
              onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value as UserRole })}
            >
              <option value="admin">Администратор</option>
              <option value="brewer">Пивовар</option>
              <option value="assistant">Помощник пивовара</option>
              <option value="tester">Тестер</option>
            </select>
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
            className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2 rounded transition-colors"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  );
};
