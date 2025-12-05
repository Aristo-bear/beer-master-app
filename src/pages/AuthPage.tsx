import React, { useState } from 'react';
import { Beer, Building, User, Lock, AlertTriangle } from 'lucide-react';
import { UserAccount } from '../types';
import { INITIAL_INVENTORY, INITIAL_RECIPES } from '../data/initialData';

interface AuthPageProps {
  onLogin: (breweryName: string, user: UserAccount) => void;
}

export const AuthPage = ({ onLogin }: AuthPageProps) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({ brewery: '', user: '', password: '' });
  const [error, setError] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.brewery || !formData.user || !formData.password) {
      setError('Заполните все поля');
      return;
    }

    const usersKey = `${formData.brewery}_users`;
    const storedUsersStr = localStorage.getItem(usersKey);
    const users: UserAccount[] = storedUsersStr ? JSON.parse(storedUsersStr) : [];

    if (authMode === 'register') {
      if (users.length > 0) {
        setError('Пивоварня с таким именем уже существует. Пожалуйста, войдите.');
        return;
      }
      const newAdmin: UserAccount = {
        username: formData.user,
        password: formData.password,
        role: 'admin',
      };
      localStorage.setItem(usersKey, JSON.stringify([newAdmin]));

      // Seed initial data for this brewery
      localStorage.setItem(`${formData.brewery}_inventory`, JSON.stringify(INITIAL_INVENTORY));
      localStorage.setItem(`${formData.brewery}_recipes`, JSON.stringify(INITIAL_RECIPES));

      onLogin(formData.brewery, newAdmin);
    } else {
      const foundUser = users.find(
        u => u.username === formData.user && u.password === formData.password
      );
      if (foundUser) {
        onLogin(formData.brewery, foundUser);
      } else {
        setError('Неверное имя пивоварни, пользователь или пароль.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-amber-500 p-3 rounded-xl mb-4">
            <Beer className="w-8 h-8 text-gray-900" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            BrewMaster<span className="text-amber-500">AI</span>
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            {authMode === 'login' ? 'Вход в систему' : 'Регистрация пивоварни'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
              Название пивоварни
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={formData.brewery}
                onChange={e => setFormData({ ...formData, brewery: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 focus:border-amber-500 focus:outline-none transition-colors"
                placeholder="Например: CraftBest"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
              {authMode === 'register' ? 'Имя администратора' : 'Пользователь'}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={formData.user}
                onChange={e => setFormData({ ...formData, user: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 focus:border-amber-500 focus:outline-none transition-colors"
                placeholder="admin"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
              Пароль
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 focus:border-amber-500 focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded border border-red-900/50 flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold py-3 rounded-lg transition-colors mt-4 shadow-lg shadow-amber-500/20"
          >
            {authMode === 'login' ? 'Войти' : 'Создать базу данных'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setAuthMode(authMode === 'login' ? 'register' : 'login');
              setError('');
            }}
            className="text-sm text-amber-500 hover:text-amber-400 underline decoration-dashed underline-offset-4"
          >
            {authMode === 'login'
              ? 'Первый запуск? Зарегистрировать пивоварню'
              : 'Уже есть аккаунт? Войти'}
          </button>
        </div>
      </div>
    </div>
  );
};
