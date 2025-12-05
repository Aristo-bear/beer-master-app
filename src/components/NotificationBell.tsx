import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
import { Notification } from '../types';

interface NotificationBellProps {
  notifications: Notification[];
  onClear: () => void;
}

export const NotificationBell = ({ notifications, onClear }: NotificationBellProps) => {
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
                <div
                  key={note.id}
                  className="p-3 border-b border-gray-700 last:border-0 hover:bg-gray-700/50 transition-colors"
                >
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
