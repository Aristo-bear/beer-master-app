import { Type, FunctionDeclaration } from '@google/genai';

export const updateInventoryTool: FunctionDeclaration = {
  name: 'updateInventory',
  description:
    'Обновляет количество товара на складе. Используйте положительные числа для поступления, отрицательные для расхода.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemName: {
        type: Type.STRING,
        description: "Название товара (например, 'Солод Pilsner', 'Hazy IPA').",
      },
      quantityChange: {
        type: Type.NUMBER,
        description: 'Количество для добавления или вычитания.',
      },
      reason: {
        type: Type.STRING,
        description:
          "Причина обновления (например, 'Пришла поставка', 'Варка №44', 'Продажа дистрибьютору').",
      },
    },
    required: ['itemName', 'quantityChange', 'reason'],
  },
};

export const getInventoryTool: FunctionDeclaration = {
  name: 'getInventory',
  description: 'Возвращает текущий список товаров на складе.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const AI_SYSTEM_INSTRUCTION =
  'Вы — менеджер склада пивоварни. Общайтесь только на русском языке. Будьте кратким и профессиональным. Все веса измеряются в кг. При обновлении запасов подтверждайте новый остаток.';
