import React, { useState, useEffect, useRef, useMemo } from "react";
import './index.css';
import { createRoot } from "react-dom/client";
import { GoogleGenAI, Type } from "@google/genai";
import { api } from "./src/services/api";
// Import Types separately to avoid runtime errors in browser
import type { FunctionDeclaration } from "@google/genai";
import { UserAccount, InventoryItem, Recipe, ScheduledBrew, WorkShift, Task, Ingredient, Message, ManualInputModalState, Block, Attachment, Notification } from "./src/types";

import {
    Beer,
    Package,
    ArrowRightLeft,
    MessageSquare,
    BarChart3,
    Database,
    FileSpreadsheet,
    RefreshCw,
    Send,
    Plus,
    Minus,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Droplet,
    FileText,
    Copy,
    ExternalLink,
    Search,
    Bell,
    Factory,
    Server,
    Beaker,
    Mail,
    Calendar as CalendarIcon,
    Menu,
    X,
    Lock,
    User,
    Building,
    LogOut,
    CheckSquare,
    Shield,
    Users,
    Trash2,
    Edit,
    Save,
    Clock,
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    UserPlus,
    Sun,
    Moon,
    Briefcase,
    Download,
    Link as LinkIcon,
    QrCode,
    Smartphone,
    Laptop,
    Settings,
    Cloud,
    Key,
    Paperclip
} from "lucide-react";

// --- Types ---

declare global {
    interface Window {
        process: {
            env: {
                [key: string]: string | undefined
            }
        };
    }
}

type Category = "Сырье" | "Готовая продукция";
type UserRole = "admin" | "brewer" | "assistant" | "tester";





interface BreweryData {
    inventory: InventoryItem[];
    recipes: Recipe[];
    logs: Block[];
    tasks: Task[];
    scheduledBrews: ScheduledBrew[];
    workShifts: WorkShift[];
    users: UserAccount[];
}

// PWA Install Event Interface
interface BeforeInstallPromptEvent extends Event {
    prompt: () => void;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// --- Blockchain Logic ---

const calculateHash = (index: number, previousHash: string, timestamp: string, data: any): string => {
    const str = index + previousHash + timestamp + JSON.stringify(data);
    // Simple hash function for demonstration (DJB2 variant)
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i); /* hash * 33 + c */
    }
    // Return positive hex string
    return (hash >>> 0).toString(16);
};

const createGenesisBlock = (): Block => {
    const timestamp = new Date().toISOString();
    return {
        index: 0,
        timestamp: timestamp,
        data: { action: "GENESIS", details: "Blockchain Started", user: "SYSTEM" },
        previousHash: "0",
        hash: calculateHash(0, "0", timestamp, { action: "GENESIS", details: "Blockchain Started", user: "SYSTEM" })
    };
};

const createNextBlock = (lastBlock: Block, data: any): Block => {
    const nextIndex = lastBlock.index + 1;
    const nextTimestamp = new Date().toISOString();
    const nextHash = calculateHash(nextIndex, lastBlock.hash, nextTimestamp, data);
    return {
        index: nextIndex,
        timestamp: nextTimestamp,
        data: data,
        previousHash: lastBlock.hash,
        hash: nextHash
    };
};

// --- Initial Data ---

const INITIAL_DATA: BreweryData = {
    inventory: [
        { id: "rm-1", name: "Солод Pilsner", category: "Сырье", quantity: 1250, unit: "кг", minLevel: 500 },
        { id: "rm-2", name: "Хмель Citra", category: "Сырье", quantity: 45, unit: "кг", minLevel: 10 },
        { id: "rm-3", name: "Хмель Mosaic", category: "Сырье", quantity: 12, unit: "кг", minLevel: 10 },
        { id: "rm-4", name: "Дрожжи US-05", category: "Сырье", quantity: 5, unit: "кг", minLevel: 1 },
        { id: "rm-5", name: "Солод Munich", category: "Сырье", quantity: 300, unit: "кг", minLevel: 100 },
        { id: "fg-1", name: "Hazy IPA", category: "Готовая продукция", quantity: 1200, unit: "кг", minLevel: 200 },
        { id: "fg-2", name: "Stout", category: "Готовая продукция", quantity: 450, unit: "кг", minLevel: 100 },
    ],
    recipes: [
        {
            id: "rec-1",
            name: "Варка Hazy IPA (500л)",
            outputItemId: "fg-1",
            outputAmount: 500,
            ingredients: [
                { itemId: "rm-1", amount: 100 },
                { itemId: "rm-2", amount: 5 },
                { itemId: "rm-3", amount: 2 },
                { itemId: "rm-4", amount: 0.5 },
            ]
        },
        {
            id: "rec-2",
            name: "Варка Stout (500л)",
            outputItemId: "fg-2",
            outputAmount: 500,
            ingredients: [
                { itemId: "rm-1", amount: 80 },
                { itemId: "rm-5", amount: 20 },
                { itemId: "rm-2", amount: 2 },
                { itemId: "rm-4", amount: 0.5 },
            ]
        }
    ],
    logs: [createGenesisBlock()],
    tasks: [
        { id: "t-1", text: "Проверить температуру в ЦКТ №4", completed: false, priority: "high" },
    ],
    scheduledBrews: [],
    workShifts: [],
    users: []
};

// --- AI Configuration ---
const updateInventoryTool: FunctionDeclaration = {
    name: "updateInventory",
    description: "Обновляет количество товара на складе. Используйте положительные числа для поступления, отрицательные для расхода.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            itemName: {
                type: Type.STRING,
                description: "Название товара (например, 'Солод Pilsner', 'Hazy IPA')."
            },
            quantityChange: {
                type: Type.NUMBER,
                description: "Количество для добавления или вычитания."
            },
            reason: {
                type: Type.STRING,
                description: "Причина обновления (например, 'Пришла поставка', 'Варка №44', 'Продажа дистрибьютору')."
            }
        },
        required: ["itemName", "quantityChange", "reason"]
    }
};

const getInventoryTool: FunctionDeclaration = {
    name: "getInventory",
    description: "Возвращает текущий список товаров на складе.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            // Adding a dummy property because Type.OBJECT cannot be empty
            query: {
                type: Type.STRING,
                description: "Optional query"
            }
        },
    }
};

// --- Notification Component ---
interface NotificationBellProps {
    notifications: Notification[];
    onClear: () => void;
}

const NotificationBell = ({ notifications, onClear }: NotificationBellProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-gray-900 flex items-center justify-center text-[10px] font-bold text-white">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-gray-700 bg-gray-900/50 flex justify-between items-center">
                        <span className="font-semibold text-sm text-white">Уведомления</span>
                        <button onClick={onClear} className="text-xs text-blue-400 hover:text-blue-300">
                            Очистить
                        </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-xs">Нет новых уведомлений</div>
                        ) : (
                            notifications.map(note => (
                                <div key={note.id} className="p-3 border-b border-gray-700 last:border-0 hover:bg-gray-700/50 transition-colors">
                                    <div className="flex gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                                        <div>
                                            <p className="text-sm text-gray-200">{note.message}</p>
                                            <span className="text-[10px] text-gray-500">
                                                {new Date(note.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Inventory Action Buttons Component ---
interface InventoryActionButtonsProps {
    item: InventoryItem;
    currentUser: UserAccount;
    onUpdateInventory: (name: string, change: number, reason: string) => void;
    onOpenManualModal: (config: any) => void;
    onDelete: (id: string) => void;
}

const InventoryActionButtons = ({ item, currentUser, onUpdateInventory, onOpenManualModal, onDelete }: InventoryActionButtonsProps) => {
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
                itemName: item.name
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
            onUpdateInventory(item.name, change, "Быстрое изменение");
        }
    };

    return (
        <div className="flex items-center justify-end gap-2">
            <button
                onMouseDown={() => startPress('add')}
                onMouseUp={() => endPress('add')}
                onMouseLeave={() => { if (timerRef.current) clearTimeout(timerRef.current); }}
                onTouchStart={() => startPress('add')}
                onTouchEnd={(e) => { e.preventDefault(); endPress('add'); }}
                className="p-1 hover:bg-gray-600 rounded text-green-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors active:scale-95"
                title="Добавить 1 кг (Удерживайте для ввода)"
                disabled={currentUser.role === 'tester'}
            >
                <Plus className="w-5 h-5 md:w-4 md:h-4" />
            </button>
            <button
                onMouseDown={() => startPress('subtract')}
                onMouseUp={() => endPress('subtract')}
                onMouseLeave={() => { if (timerRef.current) clearTimeout(timerRef.current); }}
                onTouchStart={() => startPress('subtract')}
                onTouchEnd={(e) => { e.preventDefault(); endPress('subtract'); }}
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

// --- Main Application Component (Authenticated) ---

const BreweryApp = ({
    breweryName,
    currentUser,
    data,
    updateData,
    onLogout,
    installPrompt,
    handleInstallClick
}: {
    breweryName: string,
    currentUser: UserAccount,
    data: BreweryData,
    updateData: (newData: Partial<BreweryData>) => void,
    onLogout: () => void,
    installPrompt: BeforeInstallPromptEvent | null,
    handleInstallClick: () => void
}) => {
    const [activeTab, setActiveTab] = useState<"dashboard" | "inventory" | "production" | "ai" | "integrations" | "employees">("dashboard");
    const [productionView, setProductionView] = useState<"recipes" | "schedule">("recipes");

    const { inventory, recipes, logs, tasks, scheduledBrews, workShifts, users } = data;

    const [newTaskText, setNewTaskText] = useState("");
    const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [searchQuery, setSearchQuery] = useState("");

    // Notifications
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Mobile Menu
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDateForEvent, setSelectedDateForEvent] = useState<string | null>(null);
    const [scheduleModalTab, setScheduleModalTab] = useState<'brew' | 'shift'>('brew');

    // --- Modal States ---
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
    const [newInventoryItem, setNewInventoryItem] = useState<Partial<InventoryItem>>({ category: "Сырье", unit: "кг", minLevel: 0, quantity: 0 });

    const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe> | null>(null);

    // Employee Modal
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
    const [newEmployee, setNewEmployee] = useState<UserAccount>({ username: "", password: "", role: "assistant" });

    // Manual Input Modal State
    const [manualInputModal, setManualInputModal] = useState<{
        isOpen: boolean,
        itemId: string | null,
        type: 'add' | 'subtract' | 'set',
        itemName: string,
        currentValue?: number
    }>({
        isOpen: false, itemId: null, type: 'add', itemName: ''
    });
    const [manualValue, setManualValue] = useState<string>("");

    // AI State
    const [messages, setMessages] = useState<Message[]>([
        { role: "model", text: "Здравствуйте! Я AI-помощник пивовара. Я помогу управлять запасами. Вы можете написать мне, например: 'Привезли 50 кг солода' или 'Разлили 500 кг стаута'." }
    ]);
    const [inputMessage, setInputMessage] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Import/Export State
    const [importKey, setImportKey] = useState("");

    // --- Effects ---

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

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const lowStockItems = inventory.filter(i => {
            const reserved = reservedInventory[i.id] || 0;
            const available = i.quantity - reserved;
            return available <= i.minLevel;
        });

        const alerts: Notification[] = lowStockItems.map(item => ({
            id: `alert-${item.id}-${Date.now()}`,
            message: `Низкий доступный остаток: ${item.name} (Доступно: ${item.quantity - (reservedInventory[item.id] || 0)} ${item.unit})`,
            type: "warning",
            read: false,
            timestamp: new Date().toISOString()
        }));

        if (alerts.length > 0) {
            const newAlerts = alerts.filter(a => !notifications.some(n => n.message === a.message));
            if (newAlerts.length > 0) {
                setNotifications(prev => [...newAlerts, ...prev]);
            }
        }
    }, [inventory, reservedInventory]);

    // --- Logic ---

    const handleUpdateInventory = async (itemName: string, change: number, reason: string): Promise<string> => {
        const item = inventory.find(i => i.name.toLowerCase() === itemName.toLowerCase() || i.name.toLowerCase().includes(itemName.toLowerCase()));

        if (!item) {
            return `Ошибка: Товар '${itemName}' не найден. Пожалуйста, проверьте название.`;
        }

        const newQuantity = Math.max(0, Number((item.quantity + change).toFixed(2)));
        const newItem = { ...item, quantity: newQuantity };

        try {
            await api.data.inventory.batchUpdate([newItem]);

            const lastBlock = logs[logs.length - 1] || createGenesisBlock();
            const newBlock = createNextBlock(lastBlock, {
                action: change > 0 ? "ПРИХОД" : change < 0 ? "РАСХОД" : "КОРРЕКЦИЯ",
                details: `${itemName}: ${change > 0 ? '+' : ''}${change} (${reason})`,
                user: currentUser.username
            });
            await api.data.logs.add(newBlock);

            // Optimistic update
            const newInventory = inventory.map(i => i.id === item.id ? newItem : i);
            updateData({ inventory: newInventory, logs: [...logs, newBlock] });

            return `Успешно: Обновлено ${itemName} на ${change}. Причина: ${reason}.`;
        } catch (e: any) {
            console.error(e);
            return `Ошибка при обновлении данных на сервере.`;
        }
    };
    const handleAddInventoryItem = async () => {
        if (!newInventoryItem.name) return;
        const newItem: InventoryItem = {
            id: `item-${Date.now()}`,
            name: newInventoryItem.name,
            category: newInventoryItem.category as Category,
            quantity: Number(newInventoryItem.quantity) || 0,
            unit: "кг",
            minLevel: Number(newInventoryItem.minLevel) || 0
        };

        const lastBlock = logs[logs.length - 1] || createGenesisBlock();
        const newBlock = createNextBlock(lastBlock, { action: "НОВАЯ ПОЗИЦИЯ", details: `Добавлено: ${newItem.name}`, user: currentUser.username });

        try {
            await api.data.inventory.batchUpdate([newItem]);
            await api.data.logs.add(newBlock);

            updateData({
                inventory: [...inventory, newItem],
                logs: [...logs, newBlock]
            });

            setIsInventoryModalOpen(false);
            setNewInventoryItem({ category: "Сырье", unit: "кг", minLevel: 0, quantity: 0 });
        } catch (e) {
            alert('Failed to save item');
        }
    };
    const handleDeleteInventoryItem = async (id: string) => {
        if (confirm("Вы уверены, что хотите удалить эту позицию?")) {
            const item = inventory.find(i => i.id === id);
            if (item) {
                const lastBlock = logs[logs.length - 1] || createGenesisBlock();
                const newBlock = createNextBlock(lastBlock, { action: "УДАЛЕНИЕ", details: `Удалена позиция: ${item.name}`, user: currentUser.username });

                try {
                    await api.data.inventory.delete(id);
                    await api.data.logs.add(newBlock);

                    updateData({
                        inventory: inventory.filter(i => i.id !== id),
                        logs: [...logs, newBlock]
                    });
                } catch (e) {
                    alert('Failed to delete item');
                }
            }
        }
    };

    const handleSaveRecipe = async () => {
        if (!editingRecipe || !editingRecipe.name || !editingRecipe.outputItemId) {
            alert("Пожалуйста, заполните основные поля");
            return;
        }

        const newRecipe: Recipe = {
            id: editingRecipe.id || `rec-${Date.now()}`,
            name: editingRecipe.name,
            outputItemId: editingRecipe.outputItemId,
            outputAmount: Number(editingRecipe.outputAmount) || 0,
            ingredients: editingRecipe.ingredients || []
        };

        try {
            // Sync recipes (optimistic)
            let updatedRecipes = [];
            if (editingRecipe.id) {
                updatedRecipes = recipes.map(r => r.id === editingRecipe.id ? newRecipe : r);
            } else {
                updatedRecipes = [...recipes, newRecipe];
            }

            await api.data.updateEntity('recipes', updatedRecipes);
            updateData({ recipes: updatedRecipes });
            setIsRecipeModalOpen(false);
            setEditingRecipe(null);
        } catch (e) {
            alert('Failed to save recipe');
        }
    };

    const handleDeleteRecipe = async (id: string) => {
        if (confirm("Удалить эту технологическую карту?")) {
            try {
                await api.data.deleteEntity('recipes', id);
                updateData({ recipes: recipes.filter(r => r.id !== id) });
            } catch (e) {
                alert('Failed to delete recipe');
            }
        }
    };

    const handleBrew = async (recipe: Recipe, scheduledBrewId?: string) => {
        const missingIngredients: string[] = [];
        recipe.ingredients.forEach(ing => {
            const stockItem = inventory.find(i => i.id === ing.itemId);
            if (!stockItem || stockItem.quantity < ing.amount) {
                missingIngredients.push(stockItem ? stockItem.name : "Неизвестный компонент");
            }
        });

        if (missingIngredients.length > 0) {
            alert(`Ошибка! Недостаточно ингредиентов на складе: ${missingIngredients.join(", ")}`);
            return;
        }

        const itemsToUpdate: InventoryItem[] = [];

        const newInventory = inventory.map(item => {
            const isIngredient = recipe.ingredients.find(ing => ing.itemId === item.id);
            if (isIngredient) {
                const updated = { ...item, quantity: Number((item.quantity - isIngredient.amount).toFixed(2)) };
                itemsToUpdate.push(updated);
                return updated;
            }
            if (item.id === recipe.outputItemId) {
                const updated = { ...item, quantity: Number((item.quantity + recipe.outputAmount).toFixed(2)) };
                itemsToUpdate.push(updated);
                return updated;
            }
            return item;
        });

        let newScheduledBrews = scheduledBrews;
        if (scheduledBrewId) {
            newScheduledBrews = scheduledBrews.map(sb =>
                sb.id === scheduledBrewId ? { ...sb, status: 'completed' } : sb
            );
        }

        const lastBlock = logs[logs.length - 1] || createGenesisBlock();
        const newBlock = createNextBlock(lastBlock, { action: "ПРОИЗВОДСТВО", details: `Сварено ${recipe.outputAmount}л ${recipe.name}`, user: currentUser.username });

        try {
            await api.data.inventory.batchUpdate(itemsToUpdate);
            await api.data.logs.add(newBlock);
            if (scheduledBrewId) {
                await api.data.updateEntity('scheduledBrews', newScheduledBrews);
            }

            updateData({
                inventory: newInventory,
                scheduledBrews: newScheduledBrews,
                logs: [...logs, newBlock]
            });

            setNotifications(prev => [{
                id: Date.now().toString(),
                message: `Производство завершено: ${recipe.name}`,
                type: "success",
                read: false,
                timestamp: new Date().toISOString()
            }, ...prev]);
        } catch (e) {
            alert('Failed to record brew');
        }
    };

    const handleScheduleBrew = async (recipeId: string) => {
        if (!selectedDateForEvent) return;

        const newBrew: ScheduledBrew = {
            id: `brew-${Date.now()}`,
            date: selectedDateForEvent,
            recipeId: recipeId,
            status: "planned"
        };

        try {
            const newSchedule = [...scheduledBrews, newBrew];
            await api.data.updateEntity('scheduledBrews', newSchedule);
            updateData({ scheduledBrews: newSchedule });
            setSelectedDateForEvent(null);
        } catch (e) {
            alert('Failed to schedule brew');
        }
    };

    const handleDeleteScheduledBrew = async (brewId: string) => {
        if (confirm("Удалить запланированную варку? Резерв сырья будет снят.")) {
            try {
                await api.data.deleteEntity('scheduledBrews', brewId);
                updateData({ scheduledBrews: scheduledBrews.filter(b => b.id !== brewId) });
            } catch (e) {
                alert('Failed to delete scheduled brew');
            }
        }
    };

    const handleScheduleShift = async (username: string, type: "day" | "night") => {
        if (!selectedDateForEvent) return;
        if (workShifts.some(s => s.date === selectedDateForEvent && s.username === username)) {
            alert("Этот сотрудник уже работает в этот день.");
            return;
        }

        const newShift: WorkShift = {
            id: `shift-${Date.now()}`,
            date: selectedDateForEvent,
            username: username,
            type: type
        };

        try {
            const newShifts = [...workShifts, newShift];
            await api.data.updateEntity('workShifts', newShifts);
            updateData({ workShifts: newShifts });
            setSelectedDateForEvent(null);
        } catch (e) {
            alert('Failed to schedule shift');
        }
    };

    const handleDeleteShift = async (shiftId: string) => {
        if (confirm("Удалить смену сотрудника?")) {
            try {
                await api.data.deleteEntity('workShifts', shiftId);
                updateData({ workShifts: workShifts.filter(s => s.id !== shiftId) });
            } catch (e) {
                alert('Failed to delete shift');
            }
        }
    };

    const toggleTask = async (id: string) => {
        const updatedTasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
        try {
            await api.data.updateEntity('tasks', updatedTasks);
            updateData({ tasks: updatedTasks });
        } catch (e) {
            console.error(e);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limit file size (e.g., 500KB) to prevent LocalStorage quota exceeded
        if (file.size > 500 * 1024) {
            alert("Файл слишком большой! Максимальный размер: 500KB (ограничение локального хранилища).");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setPendingAttachment({
                    id: `att-${Date.now()}`,
                    name: file.name,
                    type: file.type,
                    data: event.target.result as string,
                    size: file.size
                });
            }
        };
        reader.readAsDataURL(file);
    };

    const addTask = async () => {
        if (!newTaskText.trim() && !pendingAttachment) return;

        const newTask: Task = {
            id: Date.now().toString(),
            text: newTaskText,
            completed: false,
            priority: "high",
            attachments: pendingAttachment ? [pendingAttachment] : []
        };

        try {
            const newTasks = [newTask, ...tasks];
            await api.data.updateEntity('tasks', newTasks);
            updateData({ tasks: newTasks });
            setNewTaskText("");
            setPendingAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (e) {
            alert('Failed to add task');
        }
    };

    const deleteTask = async (id: string) => {
        if (currentUser.role === 'assistant' || currentUser.role === 'tester') return;
        try {
            await api.data.deleteEntity('tasks', id);
            updateData({ tasks: tasks.filter(t => t.id !== id) });
        } catch (e) {
            console.error(e);
        }
    };

    const handleAddEmployee = async () => {
        if (!newEmployee.username || !newEmployee.password) return;
        if (users.some(u => u.username === newEmployee.username)) {
            alert("Пользователь с таким именем уже существует");
            return;
        }

        const lastBlock = logs[logs.length - 1] || createGenesisBlock();
        const newBlock = createNextBlock(lastBlock, { action: "СОТРУДНИКИ", details: `Добавлен сотрудник: ${newEmployee.username} (${newEmployee.role})`, user: currentUser.username });

        try {
            // Pass breweryId as breweryName for the backend register logic
            await api.users.add({ ...newEmployee, breweryId: currentUser.breweryId });
            await api.data.logs.add(newBlock);

            updateData({
                users: [...users, newEmployee],
                logs: [...logs, newBlock]
            });

            setIsEmployeeModalOpen(false);
            setNewEmployee({ username: "", password: "", role: "assistant" });
        } catch (e: any) {
            alert(`Ошибка при добавлении сотрудника: ${e.message}`);
        }
    };

    const handleDeleteEmployee = async (username: string) => {
        if (username === currentUser.username) {
            alert("Нельзя удалить самого себя");
            return;
        }
        if (confirm(`Удалить сотрудника ${username}?`)) {
            const lastBlock = logs[logs.length - 1] || createGenesisBlock();
            const newBlock = createNextBlock(lastBlock, { action: "СОТРУДНИКИ", details: `Удален сотрудник: ${username}`, user: currentUser.username });

            try {
                await api.users.delete(username);
                await api.data.logs.add(newBlock);

                updateData({
                    users: users.filter(u => u.username !== username),
                    logs: [...logs, newBlock]
                });
            } catch (e) {
                alert('Failed to delete employee');
            }
        }
    };

    // --- Import/Export Logic ---
    // const handleExportDatabase = () => {
    //     // Basic encoding for demonstration - in production use real encryption
    //     const payload = {
    //         breweryName,
    //         data: data
    //     };
    //     const jsonStr = JSON.stringify(payload);
    //     const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
    //     prompt("Скопируйте этот ключ и передайте сотруднику:", encoded);
    // };

    // const handleImportDatabase = () => {
    //     try {
    //         if (!importKey) { alert("Введите ключ"); return; }
    //         const decoded = decodeURIComponent(escape(atob(importKey)));
    //         const parsed = JSON.parse(decoded);

    //         if (!parsed.breweryName || !parsed.data) {
    //             alert("Неверный формат ключа");
    //             return;
    //         }

    //         if (confirm(`Импортировать базу данных пивоварни "${parsed.breweryName}"? Текущие данные будут перезаписаны.`)) {
    //             updateData(parsed.data); // This updates state, parent saves to local storage
    //             alert("База данных успешно обновлена!");
    //             setImportKey("");
    //         }
    //     } catch (e) {
    //         alert("Ошибка импорта: Неверный ключ");
    //         console.error(e);
    //     }
    // };

    const sendMessage = async () => {
        if (!inputMessage.trim()) return;

        const userMsg = inputMessage;
        setInputMessage("");
        setMessages(prev => [...prev, { role: "user", text: userMsg }]);
        setIsProcessing(true);

        try {
            const ai = new GoogleGenAI({ apiKey: window.process.env.API_KEY });

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [
                    ...messages.slice(-6).map(m => ({ role: m.role, parts: [{ text: m.text }] })),
                    { role: "user", parts: [{ text: userMsg }] }
                ],
                config: {
                    tools: [{ functionDeclarations: [updateInventoryTool, getInventoryTool] }],
                    systemInstruction: "Вы — менеджер склада пивоварни. Общайтесь только на русском языке. Будьте кратким и профессиональным. Все веса измеряются в кг. При обновлении запасов подтверждайте новый остаток.",
                }
            });

            const functionCalls = response.candidates?.[0]?.content?.parts?.[0]?.functionCall
                ? [response.candidates[0].content.parts[0].functionCall]
                : response.functionCalls;

            let finalResponseText = response.text || "";

            if (functionCalls && functionCalls.length > 0) {
                for (const call of functionCalls) {
                    let resultString = "";
                    if (call.name === "updateInventory") {
                        const { itemName, quantityChange, reason } = call.args as any;
                        resultString = await handleUpdateInventory(itemName, quantityChange, reason);
                    } else if (call.name === "getInventory") {
                        resultString = JSON.stringify(inventory.map(i => `${i.name}: ${i.quantity} ${i.unit}`));
                    }

                    const toolResponse = await ai.models.generateContent({
                        model: "gemini-2.5-flash",
                        contents: [
                            { role: "user", parts: [{ text: userMsg }] },
                            { role: "model", parts: [{ functionCall: call }] },
                            { role: "function", parts: [{ functionResponse: { name: call.name, response: { result: resultString } } }] }
                        ]
                    });

                    finalResponseText = toolResponse.text || "Склад обновлен.";
                }
            }

            setMessages(prev => [...prev, { role: "model", text: finalResponseText }]);

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: "model", text: "Извините, произошла ошибка при обработке запроса." }]);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- Render Functions ---

    const renderInventoryModal = () => (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6">
                <h3 className="text-xl font-bold text-white mb-4">Добавить позицию</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Название</label>
                        <input
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                            value={newInventoryItem.name || ""}
                            onChange={e => setNewInventoryItem({ ...newInventoryItem, name: e.target.value })}
                            placeholder="Например: Солод Pale Ale"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Категория</label>
                            <select
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                                value={newInventoryItem.category}
                                onChange={e => setNewInventoryItem({ ...newInventoryItem, category: e.target.value as Category })}
                            >
                                <option value="Сырье">Сырье</option>
                                <option value="Готовая продукция">Готовая продукция</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Ед. измерения</label>
                            <input
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-gray-400 cursor-not-allowed"
                                value="кг"
                                disabled
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Нач. остаток (кг)</label>
                            <input
                                type="number"
                                step="0.1"
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                                value={newInventoryItem.quantity}
                                onChange={e => setNewInventoryItem({ ...newInventoryItem, quantity: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Мин. уровень (кг)</label>
                            <input
                                type="number"
                                step="0.1"
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                                value={newInventoryItem.minLevel}
                                onChange={e => setNewInventoryItem({ ...newInventoryItem, minLevel: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={() => setIsInventoryModalOpen(false)}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition-colors"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleAddInventoryItem}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded transition-colors"
                    >
                        Добавить
                    </button>
                </div>
            </div>
        </div>
    );

    const renderEmployeeModal = () => (
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
                        <label className="block text-xs text-gray-400 mb-1">Должность и уровень доступа</label>
                        <select
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                            value={newEmployee.role}
                            onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value as UserRole })}
                        >
                            <option value="admin">Администратор (Полный доступ)</option>
                            <option value="brewer">Пивовар (Склад, Варки, Техкарты)</option>
                            <option value="assistant">Помощник (Склад, Варки по плану)</option>
                            <option value="tester">Тестер (Просмотр и Дегустация)</option>
                        </select>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={() => setIsEmployeeModalOpen(false)}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition-colors"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleAddEmployee}
                        className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2 rounded transition-colors"
                    >
                        Создать
                    </button>
                </div>
            </div>
        </div>
    );

    const renderManualInputModal = () => {
        if (!manualInputModal.isOpen) return null;
        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-sm p-6">
                    <h3 className="text-xl font-bold text-white mb-2">
                        {manualInputModal.type === 'add' ? 'Поступление' : manualInputModal.type === 'subtract' ? 'Списание' : 'Корректировка остатка'}
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">{manualInputModal.itemName}</p>

                    <div className="relative mb-6">
                        <input
                            type="number"
                            step="0.1"
                            autoFocus
                            value={manualValue}
                            onChange={(e) => setManualValue(e.target.value)}
                            placeholder="0.0"
                            className="w-full bg-gray-900 border border-gray-700 text-3xl font-mono text-center text-white rounded-lg p-4 focus:border-blue-500 focus:outline-none"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">кг</span>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                setManualInputModal({ ...manualInputModal, isOpen: false });
                                setManualValue("");
                            }}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={() => {
                                const val = parseFloat(manualValue);
                                if (!isNaN(val) && manualInputModal.itemId) {
                                    let change = 0;
                                    let reason = "";
                                    if (manualInputModal.type === 'set') {
                                        const current = manualInputModal.currentValue || 0;
                                        change = val - current;
                                        reason = "Инвентаризация / Коррекция";
                                    } else {
                                        change = manualInputModal.type === 'add' ? val : -val;
                                        reason = "Ручной ввод (точное значение)";
                                    }

                                    if (change !== 0) {
                                        handleUpdateInventory(manualInputModal.itemName, change, reason);
                                    }
                                    setManualInputModal({ ...manualInputModal, isOpen: false });
                                    setManualValue("");
                                }
                            }}
                            className={`flex-1 text-white py-3 rounded-lg font-bold ${manualInputModal.type === 'add' ? 'bg-green-600 hover:bg-green-500' :
                                manualInputModal.type === 'subtract' ? 'bg-red-600 hover:bg-red-500' :
                                    'bg-blue-600 hover:bg-blue-500'
                                }`}
                        >
                            Подтвердить
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const renderRecipeModal = () => {
        if (!editingRecipe) return null;

        const availableProducts = inventory.filter(i => i.category === "Готовая продукция");
        const availableIngredients = inventory.filter(i => i.category === "Сырье");

        return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                    <h3 className="text-xl font-bold text-white mb-4">
                        {editingRecipe.id ? "Редактировать карту" : "Новая технологическая карта"}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Название карты</label>
                            <input
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                                value={editingRecipe.name || ""}
                                onChange={e => setEditingRecipe({ ...editingRecipe, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Выход продукции (кг)</label>
                            <input
                                type="number"
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                                value={editingRecipe.outputAmount || 0}
                                onChange={e => setEditingRecipe({ ...editingRecipe, outputAmount: Number(e.target.value) })}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs text-gray-400 mb-1">Производимый продукт</label>
                            <select
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                                value={editingRecipe.outputItemId || ""}
                                onChange={e => setEditingRecipe({ ...editingRecipe, outputItemId: e.target.value })}
                            >
                                <option value="">Выберите продукт...</option>
                                {availableProducts.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-gray-300 text-sm">Ингредиенты</h4>
                            <button
                                onClick={() => setEditingRecipe({
                                    ...editingRecipe,
                                    ingredients: [...(editingRecipe.ingredients || []), { itemId: "", amount: 0 }]
                                })}
                                className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" /> Добавить компонент
                            </button>
                        </div>
                        <div className="space-y-2 bg-gray-900/50 p-4 rounded border border-gray-700/50">
                            {(editingRecipe.ingredients || []).map((ing, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <select
                                        className="flex-1 bg-gray-800 border border-gray-700 rounded p-1 text-sm text-white"
                                        value={ing.itemId}
                                        onChange={e => {
                                            const newIngs = [...(editingRecipe.ingredients || [])];
                                            newIngs[idx].itemId = e.target.value;
                                            setEditingRecipe({ ...editingRecipe, ingredients: newIngs });
                                        }}
                                    >
                                        <option value="">Выберите сырье...</option>
                                        {availableIngredients.map(i => (
                                            <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        step="0.001"
                                        className="w-20 bg-gray-800 border border-gray-700 rounded p-1 text-sm text-white"
                                        placeholder="Кол-во"
                                        value={ing.amount}
                                        onChange={e => {
                                            const newIngs = [...(editingRecipe.ingredients || [])];
                                            newIngs[idx].amount = Number(e.target.value);
                                            setEditingRecipe({ ...editingRecipe, ingredients: newIngs });
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            const newIngs = [...(editingRecipe.ingredients || [])];
                                            newIngs.splice(idx, 1);
                                            setEditingRecipe({ ...editingRecipe, ingredients: newIngs });
                                        }}
                                        className="p-1 text-gray-500 hover:text-red-400"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {(editingRecipe.ingredients || []).length === 0 && (
                                <p className="text-gray-500 text-xs italic text-center">Нет ингредиентов</p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={() => { setIsRecipeModalOpen(false); setEditingRecipe(null); }}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition-colors"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleSaveRecipe}
                            className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded transition-colors flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" /> Сохранить
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderSchedule = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

        const days = [];
        for (let i = 0; i < startDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(i);

        const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
        const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

        const getEventsForDay = (day: number) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const brews = scheduledBrews.filter(b => b.date === dateStr);
            const shifts = workShifts.filter(s => s.date === dateStr);
            return { brews, shifts, dateStr };
        };

        const renderAddEventModal = () => {
            if (!selectedDateForEvent) return null;
            return (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Планирование на {new Date(selectedDateForEvent).toLocaleDateString()}</h3>
                        <div className="flex border-b border-gray-700 mb-4">
                            <button className={`flex-1 py-2 text-sm font-medium ${scheduleModalTab === 'brew' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-gray-400'}`} onClick={() => setScheduleModalTab('brew')}>Варка</button>
                            <button className={`flex-1 py-2 text-sm font-medium ${scheduleModalTab === 'shift' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`} onClick={() => setScheduleModalTab('shift')}>Смена</button>
                        </div>
                        <div className="min-h-[200px]">
                            {scheduleModalTab === 'brew' ? (
                                <div className="space-y-3">
                                    {recipes.length > 0 ? recipes.map(r => (
                                        <button key={r.id} onClick={() => handleScheduleBrew(r.id)} className="w-full text-left p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors flex justify-between items-center">
                                            <span className="text-white font-medium">{r.name}</span>
                                            <span className="text-xs text-gray-400">{r.outputAmount}л</span>
                                        </button>
                                    )) : <p className="text-center text-gray-500 py-4">Нет рецептов</p>}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {users.filter(u => u.role !== 'admin').length > 0 ? users.filter(u => u.role !== 'admin').map(u => (
                                        <div key={u.username} className="flex gap-2">
                                            <button onClick={() => handleScheduleShift(u.username, 'day')} className="flex-1 p-3 rounded-lg bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-200 border border-yellow-900/50 flex flex-col items-center"><Sun className="w-5 h-5 mb-1" /><span>{u.username} (День)</span></button>
                                            <button onClick={() => handleScheduleShift(u.username, 'night')} className="flex-1 p-3 rounded-lg bg-blue-900/30 hover:bg-blue-900/50 text-blue-200 border border-blue-900/50 flex flex-col items-center"><Moon className="w-5 h-5 mb-1" /><span>{u.username} (Ночь)</span></button>
                                        </div>
                                    )) : <p className="text-center text-gray-500 py-4">Нет сотрудников</p>}
                                </div>
                            )}
                        </div>
                        <button onClick={() => setSelectedDateForEvent(null)} className="w-full mt-6 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition-colors">Отмена</button>
                    </div>
                </div>
            );
        };

        return (
            <div className="space-y-6">
                {renderAddEventModal()}
                <div className="flex items-center justify-between bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-700 rounded-lg text-gray-300"><ChevronLeft className="w-5 h-5" /></button>
                    <h2 className="text-xl font-bold text-white capitalize">{monthName}</h2>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-700 rounded-lg text-gray-300"><ChevronRight className="w-5 h-5" /></button>
                </div>
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                    <div className="grid grid-cols-7 bg-gray-900 border-b border-gray-700">
                        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (<div key={d} className="p-3 text-center text-xs font-semibold text-gray-500 uppercase">{d}</div>))}
                    </div>
                    <div className="grid grid-cols-7 auto-rows-fr">
                        {days.map((day, idx) => {
                            if (day === null) return <div key={`empty-${idx}`} className="bg-gray-800/50 border-r border-b border-gray-700 min-h-[120px]"></div>;
                            const { brews, shifts, dateStr } = getEventsForDay(day);
                            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                            return (
                                <div key={day} onClick={() => setSelectedDateForEvent(dateStr)} className={`p-2 border-r border-b border-gray-700 min-h-[120px] transition-colors hover:bg-gray-700/30 cursor-pointer relative group ${isToday ? 'bg-amber-900/10' : ''}`}>
                                    <span className={`text-sm font-medium ${isToday ? 'text-amber-500' : 'text-gray-400'}`}>{day}</span>
                                    <div className="mt-2 space-y-1">
                                        {brews.map(b => {
                                            const recipe = recipes.find(r => r.id === b.recipeId);
                                            return (
                                                <div key={b.id} className="text-[10px] p-1 rounded bg-purple-900/40 border border-purple-500/30 text-purple-200 truncate group-hover:whitespace-normal relative z-10">
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteScheduledBrew(b.id); }} className="absolute right-0 top-0 bottom-0 px-1 hover:text-red-300 hidden group-hover:flex items-center bg-purple-900/80">×</button>
                                                    {recipe?.name} {b.status === 'completed' && <CheckCircle2 className="inline w-3 h-3 ml-1 text-green-400" />}
                                                </div>
                                            );
                                        })}
                                        {shifts.map(s => (
                                            <div key={s.id} className={`text-[10px] p-1 rounded border truncate relative group-hover:whitespace-normal z-10 ${s.type === 'day' ? 'bg-yellow-900/40 border-yellow-500/30 text-yellow-200' : 'bg-blue-900/40 border-blue-500/30 text-blue-200'}`}>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteShift(s.id); }} className={`absolute right-0 top-0 bottom-0 px-1 hover:text-red-300 hidden group-hover:flex items-center ${s.type === 'day' ? 'bg-yellow-900/80' : 'bg-blue-900/80'}`}>×</button>
                                                {s.username} ({s.type === 'day' ? 'Д' : 'Н'})
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderInventory = () => {
        const filteredInventory = inventory.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Поиск по названию или категории..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    {(currentUser.role === 'admin' || currentUser.role === 'brewer') && (
                        <button
                            onClick={() => setIsInventoryModalOpen(true)}
                            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" /> Добавить позицию
                        </button>
                    )}
                </div>

                <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-full">
                            <thead>
                                <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                                    <th className="p-4 font-semibold">Название</th>
                                    <th className="p-4 font-semibold hidden md:table-cell">Категория</th>
                                    <th className="p-4 font-semibold text-center">Всего</th>
                                    <th className="p-4 font-semibold text-center text-amber-500">Резерв</th>
                                    <th className="p-4 font-semibold text-center text-green-500">Доступно</th>
                                    <th className="p-4 font-semibold text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {filteredInventory.map((item) => {
                                    const reserved = reservedInventory[item.id] || 0;
                                    const available = Math.max(0, item.quantity - reserved);

                                    return (
                                        <tr key={item.id} className="hover:bg-gray-700/50 transition-colors">
                                            <td className="p-4 text-white font-medium">
                                                {item.name}
                                                <div className="md:hidden text-xs text-gray-500 mt-1">{item.category}</div>
                                            </td>
                                            <td className="p-4 hidden md:table-cell">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.category === 'Сырье' ? 'bg-amber-900/30 text-amber-300' : 'bg-blue-900/30 text-blue-300'}`}>
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span
                                                    onClick={() => {
                                                        if (currentUser.role !== 'tester') {
                                                            setManualInputModal({
                                                                isOpen: true,
                                                                itemId: item.id,
                                                                type: 'set',
                                                                itemName: item.name,
                                                                currentValue: item.quantity
                                                            });
                                                            setManualValue(item.quantity.toString());
                                                        }
                                                    }}
                                                    className={`font-bold ${currentUser.role !== 'tester' ? 'cursor-pointer hover:underline decoration-dashed underline-offset-4' : ''} text-gray-200`}
                                                >
                                                    {item.quantity.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                {reserved > 0 ? (
                                                    <span className="text-amber-400 font-bold">{reserved.toLocaleString()}</span>
                                                ) : (
                                                    <span className="text-gray-600">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`font-bold ${available <= item.minLevel ? 'text-red-400' : 'text-green-400'}`}>
                                                    {available.toLocaleString()}
                                                </span>
                                                <span className="text-gray-500 text-xs ml-1">{item.unit}</span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <InventoryActionButtons
                                                    item={item}
                                                    currentUser={currentUser}
                                                    onUpdateInventory={handleUpdateInventory}
                                                    onOpenManualModal={setManualInputModal}
                                                    onDelete={handleDeleteInventoryItem}
                                                />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderEmployees = () => {
        if (currentUser.role !== 'admin') return <div className="p-8 text-center text-gray-500">Доступ запрещен</div>;

        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h2 className="text-xl font-bold text-white">Сотрудники</h2>
                    <button
                        onClick={() => setIsEmployeeModalOpen(true)}
                        className="flex-1 md:flex-none bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium text-sm"
                    >
                        <UserPlus className="w-4 h-4" /> Добавить
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
                                        <span className={`text-xs px-2 py-1 rounded uppercase font-bold ${user.role === 'admin' ? 'bg-amber-900/30 text-amber-500' :
                                            user.role === 'brewer' ? 'bg-blue-900/30 text-blue-500' :
                                                user.role === 'tester' ? 'bg-pink-900/30 text-pink-500' :
                                                    'bg-gray-700 text-gray-400'
                                            }`}>
                                            {user.role === 'admin' ? 'Администратор' : user.role === 'brewer' ? 'Пивовар' : user.role === 'tester' ? 'Тестер' : 'Помощник'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-500 font-mono text-xs">{user.password}</td>
                                    <td className="p-4 text-right">
                                        {user.username !== currentUser.username && (
                                            <button
                                                onClick={() => handleDeleteEmployee(user.username)}
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
                <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-900/50 flex items-start gap-3">
                    <Key className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                        <h4 className="text-blue-300 text-sm font-bold">Синхронизация сотрудников</h4>
                        <p className="text-gray-400 text-xs mt-1">
                            Так как система работает локально, новые сотрудники не получат доступ автоматически.
                            Чтобы передать им актуальную базу данных, перейдите в раздел "Интеграции" и используйте функцию "Экспорт базы (Ключ)".
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    const NavButton = ({ tab, icon: Icon, label }: { tab: typeof activeTab, icon: any, label: string }) => (
        <button
            onClick={() => { setActiveTab(tab); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === tab ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'}`}
        >
            <Icon className="w-5 h-5" /> {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col md:flex-row relative">
            {/* Mobile Header */}
            <div className="md:hidden bg-gray-950 p-4 border-b border-gray-800 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-2">
                    <div className="bg-amber-500 p-1.5 rounded-lg"><Beer className="w-5 h-5 text-gray-900" /></div>
                    <span className="text-lg font-bold tracking-tight text-white">BrewMaster<span className="text-amber-500">AI</span></span>
                </div>
                <div className="flex items-center gap-4">
                    <NotificationBell notifications={notifications} onClear={() => setNotifications([])} />
                    <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-300"><Menu className="w-6 h-6" /></button>
                </div>
            </div>

            {isMobileMenuOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />}

            <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-950 border-r border-gray-800 flex flex-col transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:h-screen md:shrink-0`}>
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-500 p-2 rounded-lg"><Beer className="w-6 h-6 text-gray-900" /></div>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold tracking-tight text-white">BrewMaster<span className="text-amber-500">AI</span></span>
                            <span className="text-xs text-gray-500 uppercase tracking-widest">{breweryName}</span>
                        </div>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-400"><X className="w-6 h-6" /></button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <NavButton tab="dashboard" icon={BarChart3} label="Панель управления" />
                    <NavButton tab="inventory" icon={Package} label="Склад" />
                    <NavButton tab="production" icon={Factory} label="Производство" />
                    <NavButton tab="ai" icon={MessageSquare} label="AI Помощник" />
                    {currentUser.role === 'admin' && <NavButton tab="employees" icon={Users} label="Сотрудники" />}
                    <NavButton tab="integrations" icon={ArrowRightLeft} label="Интеграции" />

                    {installPrompt && (
                        <button
                            onClick={() => { handleInstallClick(); setIsMobileMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-amber-500 hover:bg-amber-900/20 bg-amber-900/10 mt-4 animate-pulse"
                        >
                            <Download className="w-5 h-5" /> Установить приложение
                        </button>
                    )}
                </nav>

                <div className="p-6 border-t border-gray-800">
                    <div className="text-xs text-gray-500 mb-2">Вы вошли как</div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs ${currentUser.role === 'admin' ? 'bg-amber-600' :
                                currentUser.role === 'brewer' ? 'bg-blue-600' :
                                    currentUser.role === 'tester' ? 'bg-pink-600' :
                                        'bg-gray-600'
                                }`}>
                                {currentUser.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                                <div className="text-sm font-medium text-gray-300 truncate max-w-[80px]">{currentUser.username}</div>
                            </div>
                        </div>
                        <button onClick={onLogout} className="text-gray-400 hover:text-red-400 transition-colors" title="Выйти"><LogOut className="w-5 h-5" /></button>
                    </div>
                </div>
            </aside>

            <main className="flex-1 p-4 md:p-8 overflow-x-hidden w-full relative">
                {isInventoryModalOpen && renderInventoryModal()}
                {isRecipeModalOpen && renderRecipeModal()}
                {isEmployeeModalOpen && renderEmployeeModal()}
                {manualInputModal.isOpen && renderManualInputModal()}

                <header className="mb-6 hidden md:flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white capitalize">
                            {activeTab === 'dashboard' && 'Панель управления'}
                            {activeTab === 'inventory' && 'Управление складом'}
                            {activeTab === 'production' && 'Производство и График'}
                            {activeTab === 'ai' && 'AI Помощник'}
                            {activeTab === 'integrations' && 'Системные интеграции'}
                            {activeTab === 'employees' && 'Управление сотрудниками'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationBell notifications={notifications} onClear={() => setNotifications([])} />
                    </div>
                </header>

                {activeTab === 'dashboard' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden">
                            <div className="p-6 border-b border-gray-700 bg-gray-900/50">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-3"><CheckSquare className="text-amber-500 w-6 h-6" /> Задачи смены</h3>
                                    <span className="text-sm font-medium text-gray-400">{tasks.filter(t => t.completed).length} из {tasks.length} выполнено</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
                                    <div className="bg-amber-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${tasks.length === 0 ? 0 : Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)}%` }}></div>
                                </div>
                            </div>
                            <div className="p-6">
                                {currentUser.role !== 'assistant' && currentUser.role !== 'tester' && (
                                    <div className="mb-6 space-y-2">
                                        <div className="flex gap-3">
                                            <div className="flex-1 relative">
                                                <input
                                                    type="text"
                                                    value={newTaskText}
                                                    onChange={(e) => setNewTaskText(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && addTask()}
                                                    placeholder="Добавить новую задачу для смены..."
                                                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-4 pr-10 py-2 focus:border-amber-500 focus:outline-none"
                                                />
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={handleFileSelect}
                                                    className="hidden"
                                                />
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                                    title="Прикрепить файл"
                                                >
                                                    <Paperclip className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <button onClick={addTask} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
                                                <Plus className="w-4 h-4" /> Добавить
                                            </button>
                                        </div>
                                        {pendingAttachment && (
                                            <div className="flex items-center gap-2 text-xs bg-gray-700/50 w-fit px-2 py-1 rounded text-gray-300">
                                                <FileText className="w-3 h-3" />
                                                <span className="truncate max-w-[200px]">{pendingAttachment.name}</span>
                                                <button onClick={() => { setPendingAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="hover:text-red-400 ml-1">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="space-y-3">
                                    {tasks.map(task => (
                                        <div key={task.id} className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border transition-all ${task.completed ? "bg-gray-900/50 border-gray-800 opacity-60" : "bg-gray-700/30 border-gray-600 hover:bg-gray-700/50"}`}>
                                            <div className="flex items-start md:items-center gap-4 flex-1 mb-2 md:mb-0">
                                                <button onClick={() => toggleTask(task.id)} className={`mt-0.5 md:mt-0 w-6 h-6 rounded border flex items-center justify-center transition-colors shrink-0 ${task.completed ? "bg-green-500 border-green-500 text-white" : "bg-transparent border-gray-500 hover:border-amber-500"}`}>{task.completed && <CheckCircle2 className="w-4 h-4" />}</button>
                                                <div className="flex flex-col gap-1 w-full">
                                                    <span className={`text-sm md:text-base ${task.completed ? "line-through text-gray-500" : "text-gray-200"}`}>{task.text}</span>
                                                    {task.attachments && task.attachments.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            {task.attachments.map(att => (
                                                                <a
                                                                    key={att.id}
                                                                    href={att.data}
                                                                    download={att.name}
                                                                    className="flex items-center gap-1 text-[10px] bg-gray-800 hover:bg-gray-600 border border-gray-700 px-2 py-1 rounded text-blue-300 hover:text-blue-200 transition-colors"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Paperclip className="w-3 h-3" />
                                                                    <span className="truncate max-w-[150px]">{att.name}</span>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {currentUser.role !== 'assistant' && currentUser.role !== 'tester' && <button onClick={() => deleteTask(task.id)} className="text-gray-500 hover:text-red-400 p-2 transition-colors self-end md:self-auto"><Trash2 className="w-4 h-4" /></button>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Activity Log - Blockchain */}
                            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                                <div className="p-4 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
                                    <h3 className="font-semibold text-white flex items-center gap-2"><Shield className="w-4 h-4 text-green-400" /> Блокчейн лог</h3>
                                    <span className="text-[10px] text-gray-500 uppercase tracking-widest">Verifiable Ledger</span>
                                </div>
                                <div className="p-4">
                                    <ul className="space-y-3 relative">
                                        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-700"></div>
                                        {logs.slice().reverse().slice(0, 5).map(block => (
                                            <li key={block.index} className="flex flex-col ml-6 text-sm pb-3 relative">
                                                <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-gray-600 border border-gray-900"></div>
                                                <div className="flex justify-between items-start">
                                                    <span className={`font-bold ${block.data.action === 'ПРИХОД' ? 'text-green-400' : block.data.action === 'РАСХОД' ? 'text-red-400' : 'text-purple-400'}`}>{block.data.action}</span>
                                                    <span className="text-gray-500 text-[10px] font-mono">{new Date(block.timestamp).toLocaleTimeString()}</span>
                                                </div>
                                                <p className="text-gray-300 text-xs mt-1">{block.data.details}</p>
                                                <div className="text-[10px] text-gray-600 font-mono mt-1 truncate">Hash: {block.hash}</div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            {/* Low Stock */}
                            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                                <div className="p-4 border-b border-gray-700 bg-gray-800/50"><h3 className="font-semibold text-white flex items-center gap-2"><Droplet className="w-4 h-4 text-amber-500" /> Требуется закупка</h3></div>
                                <div className="p-4">
                                    <ul className="space-y-3">
                                        {inventory.filter(i => (i.quantity - (reservedInventory[i.id] || 0)) <= i.minLevel).map(item => (
                                            <li key={item.id} className="flex items-center justify-between text-sm p-3 bg-red-900/10 border border-red-900/30 rounded-lg">
                                                <span className="text-gray-200 font-medium">{item.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-red-400 font-bold">{(item.quantity - (reservedInventory[item.id] || 0)).toFixed(1)} {item.unit}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'inventory' && renderInventory()}
                {activeTab === 'production' && (
                    <div>
                        <div className="flex bg-gray-800 p-1 rounded-lg w-full md:w-auto md:inline-flex mb-6 border border-gray-700">
                            <button onClick={() => setProductionView('recipes')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all ${productionView === 'recipes' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>Техкарты</button>
                            <button onClick={() => setProductionView('schedule')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all ${productionView === 'schedule' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>Календарь и График</button>
                        </div>
                        {productionView === 'recipes' ? (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex justify-end">{currentUser.role !== 'assistant' && currentUser.role !== 'tester' && (<button onClick={() => { setEditingRecipe({ name: "", ingredients: [], outputAmount: 0, outputItemId: "" }); setIsRecipeModalOpen(true); }} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"><Plus className="w-4 h-4" /> Создать карту</button>)}</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {recipes.map(recipe => (
                                        <div key={recipe.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg flex flex-col group">
                                            <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex justify-between items-center">
                                                <h3 className="font-bold text-lg text-white flex items-center gap-2"><Factory className="w-5 h-5 text-purple-500" />{recipe.name}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded">{recipe.outputAmount}л</span>
                                                    {currentUser.role !== 'assistant' && currentUser.role !== 'tester' && (<><button onClick={() => { setEditingRecipe(JSON.parse(JSON.stringify(recipe))); setIsRecipeModalOpen(true); }} className="p-1 text-gray-400 hover:text-white transition-colors"><Edit className="w-4 h-4" /></button><button onClick={() => handleDeleteRecipe(recipe.id)} className="p-1 text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button></>)}
                                                </div>
                                            </div>
                                            <div className="p-6 flex-1">
                                                <h4 className="text-gray-400 text-xs uppercase font-semibold mb-3">Состав:</h4>
                                                <ul className="space-y-2 mb-6">
                                                    {recipe.ingredients.map((ing, idx) => {
                                                        const item = inventory.find(i => i.id === ing.itemId);
                                                        // Check against total quantity for brew possibility
                                                        const hasEnough = item && item.quantity >= ing.amount;
                                                        return (
                                                            <li key={idx} className="flex justify-between items-center text-sm border-b border-gray-700 pb-2 last:border-0">
                                                                <span className="text-gray-300">{item?.name || "Неизвестно"}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-gray-400">{ing.amount} {item?.unit}</span>
                                                                    {!hasEnough && <AlertTriangle className="w-4 h-4 text-red-500" />}
                                                                </div>
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                                <button onClick={() => handleBrew(recipe)} disabled={currentUser.role === 'tester'} className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"><Beaker className="w-5 h-5" /> Произвести</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : renderSchedule()}
                    </div>
                )}
                {activeTab === 'ai' && (
                    <div className="flex flex-col h-[calc(100vh-240px)] md:h-[600px] bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
                        <div className="p-4 bg-gray-900 border-b border-gray-700 flex items-center justify-between"><h3 className="text-white font-semibold flex items-center gap-2"><MessageSquare className="w-5 h-5 text-purple-400" /> AI Ассистент</h3></div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                            {messages.map((msg, idx) => (<div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] md:max-w-[80%] p-3 rounded-lg text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none border border-gray-600'}`}>{msg.text}</div></div>))}
                            {isProcessing && <div className="bg-gray-700 text-gray-400 p-3 rounded-lg w-fit text-xs">Анализирую данные...</div>}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-4 bg-gray-900 border-t border-gray-700"><div className="flex items-center gap-2"><input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Напишите запрос..." className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500" disabled={isProcessing} /><button onClick={sendMessage} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg"><Send className="w-5 h-5" /></button></div></div>
                    </div>
                )}
                {activeTab === 'integrations' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col items-center text-center space-y-4">
                            <div className="bg-green-900/30 p-4 rounded-full"><FileSpreadsheet className="w-8 h-8 text-green-500" /></div>
                            <h3 className="text-lg font-bold text-white">Excel / CSV</h3>
                            <p className="text-gray-400 text-xs">Выгрузка остатков.</p>
                            <button className="mt-auto bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm w-full">Скачать .CSV</button>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col items-center text-center space-y-4 col-span-1 md:col-span-2">
                            <div className="bg-blue-900/30 p-4 rounded-full"><Server className="w-8 h-8 text-blue-500" /></div>
                            <h3 className="text-lg font-bold text-white">Облачная синхронизация</h3>
                            <p className="text-gray-400 text-xs">Данные автоматически синхронизируются с сервером. Ручной экспорт/импорт больше не требуется.</p>
                            <div className="mt-4 flex items-center gap-2 text-green-400 text-sm bg-green-900/20 px-4 py-2 rounded-full border border-green-900/50">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                Подключено к серверу
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'employees' && renderEmployees()}
            </main>
        </div>
    );
};

// --- Root Component (Handles Auth & Routing) ---

const Root = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authMode, setAuthMode] = useState<"login" | "register">("login");
    const [formData, setFormData] = useState({ brewery: "", user: "", password: "" });
    const [error, setError] = useState("");

    const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
    const [breweryData, setBreweryData] = useState<BreweryData | null>(null);
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

    // --- Initialization ---

    useEffect(() => {
        // Check for saved session
        const token = localStorage.getItem('brewmaster_session_token');
        if (token) {
            try {
                // Decode JWT to get breweryId (JWT format: header.payload.signature)
                const payload = JSON.parse(atob(token.split('.')[1]));
                const { username, breweryId } = payload;

                if (username && breweryId) {
                    // Try to restore session by fetching data
                    api.data.init(breweryId)
                        .then(initialData => {
                            const user = initialData.users.find((u: UserAccount) => u.username === username);
                            if (user) {
                                setCurrentUser(user);
                                setBreweryData(initialData);
                                setIsAuthenticated(true);
                                // Set formData for display purposes only
                                setFormData({ brewery: breweryId, user: username, password: "" });
                            } else {
                                // User might have been deleted
                                handleLogout();
                            }
                        })
                        .catch(err => {
                            console.error("Session restore failed", err);
                            // Force logout if token invalid
                            handleLogout();
                        });
                }
            } catch (e) {
                console.error("Session restore failed", e);
                handleLogout();
            }
        }
    }, []);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = () => {
        if (installPrompt) {
            installPrompt.prompt();
            installPrompt.userChoice.then((choiceResult) => {
                setInstallPrompt(null);
            });
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!formData.brewery || !formData.user || !formData.password) {
            setError("Заполните все поля");
            return;
        }

        try {
            let response;
            if (authMode === "register") {
                response = await api.auth.register(formData.user, formData.password, formData.brewery);
            } else {
                response = await api.auth.login(formData.user, formData.password);
            }

            const { user } = response;
            // Fetch initial data
            const initialData = await api.data.init(user.breweryId);

            setBreweryData(initialData);
            setCurrentUser(user);
            setIsAuthenticated(true);
            localStorage.setItem("brewmaster_session", JSON.stringify({ brewery: formData.brewery, username: formData.user }));
        } catch (err: any) {
            setError(err.message || "Ошибка авторизации");
        }
    };

    const handleUpdateData = async (newData: Partial<BreweryData>) => {
        if (!breweryData) return;

        // With API, we might rely on individual handlers to update server, 
        // but if we use this for state sync:
        const updatedData = { ...breweryData, ...newData };
        setBreweryData(updatedData);
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setFormData({ brewery: "", user: "", password: "" });
        localStorage.removeItem("brewmaster_session");
        setBreweryData(null);
    };

    if (isAuthenticated && currentUser && breweryData) {
        return (
            <BreweryApp
                breweryName={formData.brewery}
                currentUser={currentUser}
                data={breweryData}
                updateData={handleUpdateData}
                onLogout={handleLogout}
                installPrompt={installPrompt}
                handleInstallClick={handleInstallClick}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-8 relative">

                <div className="flex flex-col items-center mb-8">
                    <div className="bg-amber-500 p-3 rounded-xl mb-4">
                        <Beer className="w-8 h-8 text-gray-900" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">BrewMaster<span className="text-amber-500">AI</span></h1>
                    <p className="text-gray-400 text-sm mt-2">
                        {authMode === "login" ? "Вход в систему (Локально)" : "Регистрация пивоварни"}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Название пивоварни</label>
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
                        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Пароль</label>
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
                        {authMode === "login" ? "Войти" : "Создать"}
                    </button>
                </form>

                <div className="mt-6 flex flex-col gap-2 text-center">
                    {authMode !== 'login' ? (
                        <button
                            onClick={() => { setAuthMode('login'); setError(""); }}
                            className="text-sm text-gray-400 hover:text-white"
                        >
                            Вернуться ко входу
                        </button>
                    ) : (
                        <button
                            onClick={() => { setAuthMode('register'); setError(""); }}
                            className="text-sm text-amber-500 hover:text-amber-400"
                        >
                            Первый запуск? Создать базу
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const root = createRoot(document.getElementById("root")!);
root.render(<Root />);