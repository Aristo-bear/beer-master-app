import React, { useState, useEffect, useMemo } from 'react';
import {
  InventoryItem,
  Recipe,
  LogEntry,
  Task,
  ScheduledBrew,
  WorkShift,
  UserAccount,
  Notification,
  BeforeInstallPromptEvent,
  ManualInputModalState,
  Category,
} from '../types';
import { INITIAL_INVENTORY, INITIAL_RECIPES, INITIAL_TASKS } from '../data/initialData';
import { useStickyState } from '../hooks/useStickyState';
import { Sidebar, MobileHeader, PageHeader, TabType } from './Navigation';
import { InventoryModal, EmployeeModal, ManualInputModal, RecipeModal } from './modals';
import {
  DashboardPage,
  InventoryPage,
  ProductionPage,
  AIAssistantPage,
  IntegrationsPage,
  EmployeesPage,
} from '../pages';

interface BreweryAppProps {
  breweryName: string;
  currentUser: UserAccount;
  onLogout: () => void;
}

export const BreweryApp = ({ breweryName, currentUser, onLogout }: BreweryAppProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Persistent State (Scoped to Brewery)
  const [inventory, setInventory] = useStickyState<InventoryItem[]>(
    INITIAL_INVENTORY,
    `${breweryName}_inventory`
  );
  const [recipes, setRecipes] = useStickyState<Recipe[]>(INITIAL_RECIPES, `${breweryName}_recipes`);
  const [logs, setLogs] = useStickyState<LogEntry[]>([], `${breweryName}_logs`);
  const [tasks, setTasks] = useStickyState<Task[]>(INITIAL_TASKS, `${breweryName}_tasks`);
  const [scheduledBrews, setScheduledBrews] = useStickyState<ScheduledBrew[]>(
    [],
    `${breweryName}_schedule`
  );
  const [workShifts, setWorkShifts] = useStickyState<WorkShift[]>([], `${breweryName}_shifts`);
  const [users, setUsers] = useStickyState<UserAccount[]>([], `${breweryName}_users`);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Mobile Menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Modal States
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [newInventoryItem, setNewInventoryItem] = useState<Partial<InventoryItem>>({
    category: 'Сырье',
    unit: 'кг',
    minLevel: 0,
    quantity: 0,
  });

  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe> | null>(null);

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState<UserAccount>({
    username: '',
    password: '',
    role: 'assistant',
  });

  const [manualInputModal, setManualInputModal] = useState<ManualInputModalState>({
    isOpen: false,
    itemId: null,
    type: 'add',
    itemName: '',
  });
  const [manualValue, setManualValue] = useState<string>('');

  // PWA Install Handler
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Calculate Reserved Inventory
  const reservedInventory = useMemo(() => {
    const map: Record<string, number> = {};
    scheduledBrews.forEach(brew => {
      if (brew.status === 'planned') {
        const recipe = recipes.find(r => r.id === brew.recipeId);
        if (recipe) {
          recipe.ingredients.forEach(ing => {
            map[ing.itemId] = (map[ing.itemId] || 0) + ing.amount;
          });
        }
      }
    });
    return map;
  }, [scheduledBrews, recipes]);

  // Check for low stock alerts
  useEffect(() => {
    const lowStockItems = inventory.filter(i => {
      const reserved = reservedInventory[i.id] || 0;
      const available = i.quantity - reserved;
      return available <= i.minLevel;
    });

    const alerts: Notification[] = lowStockItems.map(item => ({
      id: `alert-${item.id}-${Date.now()}`,
      message: `Низкий доступный остаток: ${item.name} (Доступно: ${item.quantity - (reservedInventory[item.id] || 0)} ${item.unit})`,
      type: 'warning',
      read: false,
      timestamp: new Date().toISOString(),
    }));

    if (alerts.length > 0) {
      const newAlerts = alerts.filter(a => !notifications.some(n => n.message === a.message));
      if (newAlerts.length > 0) {
        setNotifications(prev => [...newAlerts, ...prev]);
      }
    }
  }, [inventory, reservedInventory]);

  // Inventory Logic
  const handleUpdateInventory = (itemName: string, change: number, reason: string): string => {
    let itemFound = false;
    const newInventory = inventory.map(item => {
      if (
        item.name.toLowerCase() === itemName.toLowerCase() ||
        item.name.toLowerCase().includes(itemName.toLowerCase())
      ) {
        itemFound = true;
        const newQuantity = Math.max(0, Number((item.quantity + change).toFixed(2)));
        return { ...item, quantity: newQuantity };
      }
      return item;
    });

    if (!itemFound) {
      return `Ошибка: Товар '${itemName}' не найден. Пожалуйста, проверьте название.`;
    }

    setInventory(newInventory);

    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      action: change > 0 ? 'ПРИХОД' : change < 0 ? 'РАСХОД' : 'КОРРЕКЦИЯ',
      details: `${itemName}: ${change > 0 ? '+' : ''}${change} (${reason}) - ${currentUser.username}`,
    };
    setLogs(prev => [newLog, ...prev]);

    return `Успешно: Обновлено ${itemName} на ${change}. Причина: ${reason}.`;
  };

  const handleAddInventoryItem = () => {
    if (!newInventoryItem.name) return;
    const newItem: InventoryItem = {
      id: `item-${Date.now()}`,
      name: newInventoryItem.name,
      category: newInventoryItem.category as Category,
      quantity: Number(newInventoryItem.quantity) || 0,
      unit: 'кг',
      minLevel: Number(newInventoryItem.minLevel) || 0,
    };
    setInventory([...inventory, newItem]);
    setIsInventoryModalOpen(false);
    setNewInventoryItem({ category: 'Сырье', unit: 'кг', minLevel: 0, quantity: 0 });
  };

  const handleDeleteInventoryItem = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить эту позицию?')) {
      setInventory(inventory.filter(i => i.id !== id));
    }
  };

  // Recipe Logic
  const handleSaveRecipe = () => {
    if (!editingRecipe || !editingRecipe.name || !editingRecipe.outputItemId) {
      alert('Пожалуйста, заполните основные поля');
      return;
    }

    const newRecipe: Recipe = {
      id: editingRecipe.id || `rec-${Date.now()}`,
      name: editingRecipe.name,
      outputItemId: editingRecipe.outputItemId,
      outputAmount: Number(editingRecipe.outputAmount) || 0,
      ingredients: editingRecipe.ingredients || [],
    };

    if (editingRecipe.id) {
      setRecipes(recipes.map(r => (r.id === editingRecipe.id ? newRecipe : r)));
    } else {
      setRecipes([...recipes, newRecipe]);
    }
    setIsRecipeModalOpen(false);
    setEditingRecipe(null);
  };

  const handleDeleteRecipe = (id: string) => {
    if (confirm('Удалить эту технологическую карту?')) {
      setRecipes(recipes.filter(r => r.id !== id));
    }
  };

  const handleBrew = (recipe: Recipe, scheduledBrewId?: string) => {
    const missingIngredients: string[] = [];
    recipe.ingredients.forEach(ing => {
      const stockItem = inventory.find(i => i.id === ing.itemId);
      if (!stockItem || stockItem.quantity < ing.amount) {
        missingIngredients.push(stockItem ? stockItem.name : 'Неизвестный компонент');
      }
    });

    if (missingIngredients.length > 0) {
      alert(`Ошибка! Недостаточно ингредиентов на складе: ${missingIngredients.join(', ')}`);
      return;
    }

    const newInventory = inventory.map(item => {
      const isIngredient = recipe.ingredients.find(ing => ing.itemId === item.id);
      if (isIngredient) {
        return { ...item, quantity: Number((item.quantity - isIngredient.amount).toFixed(2)) };
      }
      if (item.id === recipe.outputItemId) {
        return { ...item, quantity: Number((item.quantity + recipe.outputAmount).toFixed(2)) };
      }
      return item;
    });

    setInventory(newInventory);

    if (scheduledBrewId) {
      setScheduledBrews(prev =>
        prev.map(sb => (sb.id === scheduledBrewId ? { ...sb, status: 'completed' } : sb))
      );
    }

    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      action: 'ПРОИЗВОДСТВО',
      details: `Сварено ${recipe.outputAmount}л ${recipe.name}. (${currentUser.username})`,
    };
    setLogs(prev => [newLog, ...prev]);

    setNotifications(prev => [
      {
        id: Date.now().toString(),
        message: `Производство завершено: ${recipe.name}`,
        type: 'success',
        read: false,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  // Schedule Logic
  const handleScheduleBrew = (recipeId: string, date: string) => {
    const newBrew: ScheduledBrew = {
      id: `brew-${Date.now()}`,
      date: date,
      recipeId: recipeId,
      status: 'planned',
    };
    setScheduledBrews([...scheduledBrews, newBrew]);
  };

  const handleDeleteScheduledBrew = (brewId: string) => {
    if (confirm('Удалить запланированную варку? Резерв сырья будет снят.')) {
      setScheduledBrews(scheduledBrews.filter(b => b.id !== brewId));
    }
  };

  const handleScheduleShift = (username: string, type: 'day' | 'night', date: string) => {
    if (workShifts.some(s => s.date === date && s.username === username)) {
      alert('Этот сотрудник уже работает в этот день.');
      return;
    }

    const newShift: WorkShift = {
      id: `shift-${Date.now()}`,
      date: date,
      username: username,
      type: type,
    };
    setWorkShifts([...workShifts, newShift]);
  };

  const handleDeleteShift = (shiftId: string) => {
    if (confirm('Удалить смену сотрудника?')) {
      setWorkShifts(workShifts.filter(s => s.id !== shiftId));
    }
  };

  // Employee Logic
  const handleAddEmployee = () => {
    if (!newEmployee.username || !newEmployee.password) return;
    if (users.some(u => u.username === newEmployee.username)) {
      alert('Пользователь с таким именем уже существует');
      return;
    }
    setUsers([...users, newEmployee]);
    setIsEmployeeModalOpen(false);
    setNewEmployee({ username: '', password: '', role: 'assistant' });
  };

  const handleDeleteEmployee = (username: string) => {
    if (username === currentUser.username) {
      alert('Нельзя удалить самого себя');
      return;
    }
    if (confirm(`Удалить сотрудника ${username}?`)) {
      setUsers(users.filter(u => u.username !== username));
    }
  };

  // Manual Input Modal Logic
  const handleManualInputConfirm = () => {
    const val = parseFloat(manualValue);
    if (!isNaN(val) && manualInputModal.itemId) {
      let change = 0;
      let reason = '';
      if (manualInputModal.type === 'set') {
        const current = manualInputModal.currentValue || 0;
        change = val - current;
        reason = 'Инвентаризация / Коррекция';
      } else {
        change = manualInputModal.type === 'add' ? val : -val;
        reason = 'Ручной ввод (точное значение)';
      }

      if (change !== 0) {
        handleUpdateInventory(manualInputModal.itemName, change, reason);
      }
      setManualInputModal({ ...manualInputModal, isOpen: false });
      setManualValue('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col md:flex-row relative">
      <MobileHeader
        notifications={notifications}
        onClearNotifications={() => setNotifications([])}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
      />

      <Sidebar
        breweryName={breweryName}
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notifications={notifications}
        onClearNotifications={() => setNotifications([])}
        installPrompt={installPrompt}
        onInstallClick={handleInstallClick}
        onLogout={onLogout}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <main className="flex-1 p-4 md:p-8 overflow-x-hidden w-full relative">
        {isInventoryModalOpen && (
          <InventoryModal
            newInventoryItem={newInventoryItem}
            setNewInventoryItem={setNewInventoryItem}
            onClose={() => setIsInventoryModalOpen(false)}
            onAdd={handleAddInventoryItem}
          />
        )}
        {isRecipeModalOpen && (
          <RecipeModal
            editingRecipe={editingRecipe}
            setEditingRecipe={setEditingRecipe}
            inventory={inventory}
            onClose={() => {
              setIsRecipeModalOpen(false);
              setEditingRecipe(null);
            }}
            onSave={handleSaveRecipe}
          />
        )}
        {isEmployeeModalOpen && (
          <EmployeeModal
            newEmployee={newEmployee}
            setNewEmployee={setNewEmployee}
            onClose={() => setIsEmployeeModalOpen(false)}
            onAdd={handleAddEmployee}
          />
        )}
        {manualInputModal.isOpen && (
          <ManualInputModal
            modalState={manualInputModal}
            manualValue={manualValue}
            setManualValue={setManualValue}
            onClose={() => {
              setManualInputModal({ ...manualInputModal, isOpen: false });
              setManualValue('');
            }}
            onConfirm={handleManualInputConfirm}
          />
        )}

        <PageHeader
          activeTab={activeTab}
          notifications={notifications}
          onClearNotifications={() => setNotifications([])}
        />

        {activeTab === 'dashboard' && (
          <DashboardPage
            tasks={tasks}
            setTasks={setTasks}
            logs={logs}
            inventory={inventory}
            reservedInventory={reservedInventory}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryPage
            inventory={inventory}
            reservedInventory={reservedInventory}
            currentUser={currentUser}
            onUpdateInventory={handleUpdateInventory}
            onOpenInventoryModal={() => setIsInventoryModalOpen(true)}
            onOpenManualModal={setManualInputModal}
            onDeleteItem={handleDeleteInventoryItem}
            manualValue={manualValue}
            setManualValue={setManualValue}
          />
        )}

        {activeTab === 'production' && (
          <ProductionPage
            recipes={recipes}
            inventory={inventory}
            scheduledBrews={scheduledBrews}
            workShifts={workShifts}
            users={users}
            currentUser={currentUser}
            onOpenRecipeModal={recipe => {
              setEditingRecipe(recipe || null);
              setIsRecipeModalOpen(true);
            }}
            onDeleteRecipe={handleDeleteRecipe}
            onBrew={handleBrew}
            onScheduleBrew={handleScheduleBrew}
            onDeleteScheduledBrew={handleDeleteScheduledBrew}
            onScheduleShift={handleScheduleShift}
            onDeleteShift={handleDeleteShift}
          />
        )}

        {activeTab === 'ai' && (
          <AIAssistantPage inventory={inventory} onUpdateInventory={handleUpdateInventory} />
        )}

        {activeTab === 'integrations' && <IntegrationsPage />}

        {activeTab === 'employees' && (
          <EmployeesPage
            users={users}
            currentUser={currentUser}
            onOpenEmployeeModal={() => setIsEmployeeModalOpen(true)}
            onDeleteEmployee={handleDeleteEmployee}
          />
        )}
      </main>
    </div>
  );
};
