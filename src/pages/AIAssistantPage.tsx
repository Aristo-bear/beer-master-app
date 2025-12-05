import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { Message, InventoryItem } from '../types';
import { updateInventoryTool, getInventoryTool, AI_SYSTEM_INSTRUCTION } from '../config/aiTools';

interface AIAssistantPageProps {
  inventory: InventoryItem[];
  onUpdateInventory: (itemName: string, change: number, reason: string) => string;
}

export const AIAssistantPage = ({ inventory, onUpdateInventory }: AIAssistantPageProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: "Здравствуйте! Я AI-помощник пивовара. Я помогу управлять запасами. Вы можете написать мне, например: 'Привезли 50 кг солода' или 'Разлили 500 кг стаута'.",
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMsg = inputMessage;
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsProcessing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          ...messages.slice(-6).map(m => ({ role: m.role, parts: [{ text: m.text }] })),
          { role: 'user', parts: [{ text: userMsg }] },
        ],
        config: {
          tools: [{ functionDeclarations: [updateInventoryTool, getInventoryTool] }],
          systemInstruction: AI_SYSTEM_INSTRUCTION,
        },
      });

      const functionCalls = response.candidates?.[0]?.content?.parts?.[0]?.functionCall
        ? [response.candidates[0].content.parts[0].functionCall]
        : response.functionCalls;

      let finalResponseText = response.text || '';

      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          let resultString = '';
          if (call.name === 'updateInventory') {
            const { itemName, quantityChange, reason } = call.args as {
              itemName: string;
              quantityChange: number;
              reason: string;
            };
            resultString = onUpdateInventory(itemName, quantityChange, reason);
          } else if (call.name === 'getInventory') {
            resultString = JSON.stringify(inventory.map(i => `${i.name}: ${i.quantity} ${i.unit}`));
          }

          const toolResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
              { role: 'user', parts: [{ text: userMsg }] },
              { role: 'model', parts: [{ functionCall: call }] },
              {
                role: 'function',
                parts: [
                  { functionResponse: { name: call.name, response: { result: resultString } } },
                ],
              },
            ],
          });

          finalResponseText = toolResponse.text || 'Склад обновлен.';
        }
      }

      setMessages(prev => [...prev, { role: 'model', text: finalResponseText }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        { role: 'model', text: 'Извините, произошла ошибка при обработке запроса.' },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-240px)] md:h-[600px] bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
      <div className="p-4 bg-gray-900 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-400" /> AI Ассистент
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] md:max-w-[80%] p-3 rounded-lg text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none border border-gray-600'}`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="bg-gray-700 text-gray-400 p-3 rounded-lg w-fit text-xs">
            Анализирую данные...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-gray-900 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Напишите запрос..."
            className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            disabled={isProcessing}
          />
          <button
            onClick={sendMessage}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
