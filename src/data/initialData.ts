import { InventoryItem, Recipe, Task } from '../types';

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'rm-1',
    name: 'Солод Pilsner',
    category: 'Сырье',
    quantity: 1250,
    unit: 'кг',
    minLevel: 500,
  },
  { id: 'rm-2', name: 'Хмель Citra', category: 'Сырье', quantity: 45, unit: 'кг', minLevel: 10 },
  { id: 'rm-3', name: 'Хмель Mosaic', category: 'Сырье', quantity: 12, unit: 'кг', minLevel: 10 },
  { id: 'rm-4', name: 'Дрожжи US-05', category: 'Сырье', quantity: 5, unit: 'кг', minLevel: 1 },
  { id: 'rm-5', name: 'Солод Munich', category: 'Сырье', quantity: 300, unit: 'кг', minLevel: 100 },
  {
    id: 'fg-1',
    name: 'Hazy IPA',
    category: 'Готовая продукция',
    quantity: 1200,
    unit: 'кг',
    minLevel: 200,
  },
  {
    id: 'fg-2',
    name: 'Stout',
    category: 'Готовая продукция',
    quantity: 450,
    unit: 'кг',
    minLevel: 100,
  },
];

export const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'rec-1',
    name: 'Варка Hazy IPA (500л)',
    outputItemId: 'fg-1',
    outputAmount: 500,
    ingredients: [
      { itemId: 'rm-1', amount: 100 },
      { itemId: 'rm-2', amount: 5 },
      { itemId: 'rm-3', amount: 2 },
      { itemId: 'rm-4', amount: 0.5 },
    ],
  },
  {
    id: 'rec-2',
    name: 'Варка Stout (500л)',
    outputItemId: 'fg-2',
    outputAmount: 500,
    ingredients: [
      { itemId: 'rm-1', amount: 80 },
      { itemId: 'rm-5', amount: 20 },
      { itemId: 'rm-2', amount: 2 },
      { itemId: 'rm-4', amount: 0.5 },
    ],
  },
];

export const INITIAL_TASKS: Task[] = [
  { id: 't-1', text: 'Проверить температуру в ЦКТ №4', completed: false, priority: 'high' },
  { id: 't-2', text: 'Принять поставку солода от поставщика', completed: true, priority: 'normal' },
  { id: 't-3', text: 'Взять пробы сусла на плотность', completed: false, priority: 'normal' },
  { id: 't-4', text: 'Санитарная обработка линии розлива', completed: false, priority: 'high' },
];
