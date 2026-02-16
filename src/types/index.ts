export type Category = 'Сырье' | 'Готовая продукция';
export type UserRole = 'admin' | 'brewer' | 'assistant' | 'tester';

export interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  quantity: number;
  unit: string;
  minLevel: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export interface Ingredient {
  itemId: string;
  amount: number;
}

export interface Recipe {
  id: string;
  name: string;
  outputItemId: string;
  outputAmount: number;
  ingredients: Ingredient[];
}

export interface ScheduledBrew {
  id: string;
  date: string;
  recipeId: string;
  status: 'planned' | 'completed';
}

export interface WorkShift {
  id: string;
  date: string;
  username: string;
  type: 'day' | 'night';
}

export interface Notification {
  id: string;
  message: string;
  type: 'warning' | 'info' | 'success';
  read: boolean;
  timestamp: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  data: string; // Base64
  size: number;
}

export interface Block {
  index: number;
  timestamp: string;
  data: {
    action: string;
    details: string;
    user: string;
  };
  previousHash: string;
  hash: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'high' | 'normal';
  attachments?: Attachment[];
}

export interface UserAccount {
  username: string;
  password: string;
  role: UserRole;
  breweryId?: string;
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface ManualInputModalState {
  isOpen: boolean;
  itemId: string | null;
  type: 'add' | 'subtract' | 'set';
  itemName: string;
  currentValue?: number;
}
