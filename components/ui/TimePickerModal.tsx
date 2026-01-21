import React, { useState, useEffect, useRef } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { XIcon } from '../icons/XIcon';

interface TimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (time: string) => void;
  title: string;
  initialTime?: string;
  minTime?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

// Feste Konstanten für die Berechnung - NICHT ÄNDERN
const ITEM_HEIGHT = 48; // Höhe einer Zeile in Pixeln
const VISIBLE_ITEMS = 5; // Sichtbare Zeilen
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 240px

export const TimePickerModal: React.FC<TimePickerModalProps> = ({ 
  isOpen, onClose, onSelect, title, initialTime, minTime, showBackButton, onBack 
}) => {
  // State für die aktuell ausgewählten Werte
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');
  
  const hourListRef = useRef<HTMLUListElement>(null);
  const minuteListRef = useRef<HTMLUListElement>(null);
  
  // Timeout Refs verhindern Memory Leaks
  const initTimeoutRef = useRef<number | null>(null);

  // Initialisierung: Setze Scroll-Position beim Öffnen
  useEffect(() => {
    if (isOpen) {
      const [h, m] = (initialTime || '08:00').split(':');
      setSelectedHour(h);
      setSelectedMinute(m);

      // Kurze Verzögerung, damit das DOM bereit ist
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
      
      initTimeoutRef.current = window.setTimeout(() => {
        if (hourListRef.current) {
            hourListRef.current.scrollTop = parseInt(h, 10) * ITEM_HEIGHT;
        }
        if (minuteListRef.current) {
            minuteListRef.current.scrollTop = parseInt(m, 10) * ITEM_HEIGHT;
        }
      }, 100);
    }
    
    return () => {
        if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
    };
  }, [isOpen, initialTime]);

  const minHour = minTime ? parseInt(minTime.split(':')[0], 10) : -1;
  const minMinute = minTime ? parseInt(minTime.split(':')[1], 10) : -1;

  if (!isOpen) return null;

  const handleConfirm = () => {
    onSelect(`${selectedHour}:${selectedMinute}`);
  };

  /**
   * Kern-Logik: Berechnet den Index basierend auf der Scroll-Position.
   * Da ITEM_HEIGHT fix ist, ist die Mathe simple Division.
   */
  const handleScroll = (e: React.UIEvent<HTMLUListElement>, type: 'hour' | 'minute', items: string[]) => {
    const scrollTop = e.currentTarget.scrollTop;
    
    // Einfache Rundung um das nächste Item zu finden
    let index = Math.round(scrollTop / ITEM_HEIGHT);
    
    // Sicherstellen, dass der Index im Array-Bereich liegt
    if (index < 0) index = 0;
    if (index >= items.length) index = items.length - 1;

    const value = items[index];

    if (type === 'hour') {
      setSelectedHour(value);
    } else {
      setSelectedMinute(value);
    }
  };

  const PickerColumn = ({ 
    items, 
    value, 
    type, 
    listRef,
    isDisabled
  }: { 
    items: string[], 
    value: string, 
    type: 'hour' | 'minute', 
    listRef: React.RefObject<HTMLUListElement>,
    isDisabled: (val: string) => boolean
  }) => {
    return (
      <div className="flex-1 relative h-full group">
        <ul
          ref={listRef}
          onScroll={(e) => handleScroll(e, type, items)}
          className="h-full overflow-y-auto snap-y snap-mandatory no-scrollbar py-[96px]" // 96px = 2 * ITEM_HEIGHT padding
          style={{ height: `${CONTAINER_HEIGHT}px` }}
        >
          {items.map((item) => {
            const disabled = isDisabled(item);
            const isSelected = item === value;
            return (
              <li
                key={item}
                className={`
                  h-[48px] flex items-center justify-center snap-center 
                  transition-all duration-200 select-none
                  ${isSelected ? 'text-gray-900 font-bold text-2xl' : 'text-gray-400 text-lg'}
                  ${disabled ? 'opacity-30' : ''}
                `}
              >
                {item}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-xs bg-white rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Picker Area */}
        <div className="relative h-[240px] w-full bg-white">
          
          {/* Highlight Bar (Fest in der Mitte) */}
          <div className="absolute top-[96px] left-0 right-0 h-[48px] bg-blue-50 border-y border-blue-200 pointer-events-none z-0" />
          
          {/* Columns */}
          <div className="flex h-full relative z-10">
            <PickerColumn 
                items={HOURS} 
                value={selectedHour} 
                type="hour" 
                listRef={hourListRef}
                isDisabled={(h) => parseInt(h, 10) < minHour}
            />
            <div className="flex items-center justify-center text-2xl font-bold text-gray-400 pb-2 z-10">:</div>
            <PickerColumn 
                items={MINUTES} 
                value={selectedMinute} 
                type="minute" 
                listRef={minuteListRef}
                isDisabled={(m) => parseInt(selectedHour, 10) === minHour && parseInt(m, 10) < minMinute}
            />
          </div>

          {/* Gradients für "Endlos"-Effekt */}
          <div className="absolute top-0 left-0 right-0 h-[80px] bg-gradient-to-b from-white to-transparent pointer-events-none z-20" />
          <div className="absolute bottom-0 left-0 right-0 h-[80px] bg-gradient-to-t from-white to-transparent pointer-events-none z-20" />
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-100 bg-gray-50">
          <Button onClick={onClose} className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-2">Abbrechen</Button>
          {showBackButton && (
             <Button onClick={onBack} className="flex-1 bg-gray-500 text-white hover:bg-gray-600 py-2">Zurück</Button>
          )}
          <Button onClick={handleConfirm} className="flex-1 bg-blue-600 text-white hover:bg-blue-700 py-2 font-semibold shadow-sm">OK</Button>
        </div>
      </Card>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};