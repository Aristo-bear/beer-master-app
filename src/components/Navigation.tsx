import React from 'react';
import {
  Beer,
  BarChart3,
  Package,
  Factory,
  MessageSquare,
  Users,
  ArrowRightLeft,
  Download,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { UserAccount, Notification, BeforeInstallPromptEvent } from '../types';
import { NotificationBell } from './NotificationBell';

export type TabType =
  | 'dashboard'
  | 'inventory'
  | 'production'
  | 'ai'
  | 'integrations'
  | 'employees';

interface NavigationProps {
  breweryName: string;
  currentUser: UserAccount;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  notifications: Notification[];
  onClearNotifications: () => void;
  installPrompt: BeforeInstallPromptEvent | null;
  onInstallClick: () => void;
  onLogout: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

interface NavButtonProps {
  tab: TabType;
  icon: React.ElementType;
  label: string;
  activeTab: TabType;
  onClick: (tab: TabType) => void;
}

const NavButton = ({ tab, icon: Icon, label, activeTab, onClick }: NavButtonProps) => (
  <button
    onClick={() => onClick(tab)}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === tab ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'}`}
  >
    <Icon className="w-5 h-5" /> {label}
  </button>
);

export const MobileHeader = ({
  notifications,
  onClearNotifications,
  onOpenMenu,
}: {
  notifications: Notification[];
  onClearNotifications: () => void;
  onOpenMenu: () => void;
}) => (
  <div className="md:hidden bg-gray-950 p-4 border-b border-gray-800 flex items-center justify-between sticky top-0 z-20">
    <div className="flex items-center gap-2">
      <div className="bg-amber-500 p-1.5 rounded-lg">
        <Beer className="w-5 h-5 text-gray-900" />
      </div>
      <span className="text-lg font-bold tracking-tight text-white">
        BrewMaster<span className="text-amber-500">AI</span>
      </span>
    </div>
    <div className="flex items-center gap-4">
      <NotificationBell notifications={notifications} onClear={onClearNotifications} />
      <button onClick={onOpenMenu} className="text-gray-300">
        <Menu className="w-6 h-6" />
      </button>
    </div>
  </div>
);

export const Sidebar = ({
  breweryName,
  currentUser,
  activeTab,
  setActiveTab,
  installPrompt,
  onInstallClick,
  onLogout,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}: NavigationProps) => {
  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-950 border-r border-gray-800 flex flex-col transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:h-screen md:shrink-0`}
      >
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-lg">
              <Beer className="w-6 h-6 text-gray-900" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-white">
                BrewMaster<span className="text-amber-500">AI</span>
              </span>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest truncate max-w-[120px]">
                {breweryName}
              </span>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavButton
            tab="dashboard"
            icon={BarChart3}
            label="Панель управления"
            activeTab={activeTab}
            onClick={handleTabClick}
          />
          <NavButton
            tab="inventory"
            icon={Package}
            label="Склад"
            activeTab={activeTab}
            onClick={handleTabClick}
          />
          <NavButton
            tab="production"
            icon={Factory}
            label="Производство"
            activeTab={activeTab}
            onClick={handleTabClick}
          />
          <NavButton
            tab="ai"
            icon={MessageSquare}
            label="AI Помощник"
            activeTab={activeTab}
            onClick={handleTabClick}
          />
          {currentUser.role === 'admin' && (
            <NavButton
              tab="employees"
              icon={Users}
              label="Сотрудники"
              activeTab={activeTab}
              onClick={handleTabClick}
            />
          )}
          {currentUser.role === 'admin' && (
            <NavButton
              tab="integrations"
              icon={ArrowRightLeft}
              label="Интеграции"
              activeTab={activeTab}
              onClick={handleTabClick}
            />
          )}

          {installPrompt && (
            <button
              onClick={() => {
                onInstallClick();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-amber-500 hover:bg-amber-900/20 bg-amber-900/10 mt-4"
            >
              <Download className="w-5 h-5" /> Установить приложение
            </button>
          )}
        </nav>

        <div className="p-6 border-t border-gray-800">
          <div className="text-xs text-gray-500 mb-2">Вы вошли как</div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs ${
                  currentUser.role === 'admin'
                    ? 'bg-amber-600'
                    : currentUser.role === 'brewer'
                      ? 'bg-blue-600'
                      : currentUser.role === 'tester'
                        ? 'bg-pink-600'
                        : 'bg-gray-600'
                }`}
              >
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <div className="text-sm font-medium text-gray-300 truncate max-w-[80px]">
                  {currentUser.username}
                </div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Выйти"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export const PageHeader = ({
  activeTab,
  notifications,
  onClearNotifications,
}: {
  activeTab: TabType;
  notifications: Notification[];
  onClearNotifications: () => void;
}) => {
  const titles: Record<TabType, string> = {
    dashboard: 'Панель управления',
    inventory: 'Управление складом',
    production: 'Производство и График',
    ai: 'AI Помощник',
    integrations: 'Системные интеграции',
    employees: 'Управление сотрудниками',
  };

  return (
    <header className="mb-6 hidden md:flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-white capitalize">{titles[activeTab]}</h1>
      </div>
      <div className="flex items-center gap-4">
        <NotificationBell notifications={notifications} onClear={onClearNotifications} />
      </div>
    </header>
  );
};
