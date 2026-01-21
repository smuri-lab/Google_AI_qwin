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

const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

// Konstanten für die Dimensionen (in Pixeln für exakte Berechnungen)
const ITEM_HEIGHT = 48; // Höhe eines einzelnen Elements
const VISIBLE_ITEMS = 5; // Anzahl der sichtbaren Elemente
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 240px
const PADDING_Y = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2; // (240 - 48) / 2 = 96px

export const TimePickerModal: React.FC<TimePickerModalProps> = ({ isOpen, onClose, onSelect, title, initialTime, minTime, showBackButton, onBack }) => {
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');
  
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);

  // Initialisierung beim Öffnen
  useEffect(() => {
    if (isOpen) {
      const [h, m] = (initialTime || '08:00').split(':');
      setSelectedHour(h);
      setSelectedMinute(m);

      // Kurze Verzögerung, damit das Modal gerendert ist, bevor gescrollt wird
      setTimeout(() => {
        scrollToValue(hourListRef.current, parseInt(h, 10));
        scrollToValue(minuteListRef.current, parseInt(m, 10));
      }, 0);
    }
  }, [isOpen, initialTime]);

  const scrollToValue = (container: HTMLDivElement | null, valueIndex: number) => {
    if (container) {
      container.scrollTop = valueIndex * ITEM_HEIGHT;
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: 'hour' | 'minute') => {
    const scrollTop = e.currentTarget.scrollTop;
    // Berechne den Index basierend auf der Scrollposition
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    
    if (type === 'hour') {
      const val = hours[index];
      if (val) setSelectedHour(val);
    } else {
      const val = minutes[index];
      if (val) setSelectedMinute(val);
    }
  };

  const minHour = minTime ? parseInt(minTime.split(':')[0], 10) : -1;
  const minMinute = minTime ? parseInt(minTime.split(':')[1], 10) : -1;

  if (!isOpen) return null;

  const handleConfirm = () => {
    onSelect(`${selectedHour}:${selectedMinute}`);
  };

  const TimeColumn: React.FC<{
    values: string[];
    selectedValue: string;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    listRef: React.RefObject<HTMLDivElement>;
    isDisabled: (value: string) => boolean;
  }> = ({ values, selectedValue, onScroll, listRef, isDisabled }) => {
    
    const handleClick = (index: number) => {
        if (listRef.current) {
            listRef.current.scrollTo({
                top: index * ITEM_HEIGHT,
                behavior: 'smooth'
            });
        }
    };

    return (
      <div 
        ref={listRef}
        onScroll={onScroll}
        className="w-1/2 overflow-y-scroll snap-y snap-mandatory no-scrollbar relative z-10"
        style={{ 
            height: `${CONTAINER_HEIGHT}px`,
            paddingTop: `${PADDING_Y}px`,
            paddingBottom: `${PADDING_Y}px`
        }}
      >
        {values.map((value, index) => {
          const isSelected = selectedValue === value;
          const disabled = isDisabled(value);
          
          return (
            <div
              key={value}
              className="snap-center flex items-center justify-center cursor-pointer transition-all duration-150"
              style={{ height: `${ITEM_HEIGHT}px` }}
              onClick={() => !disabled && handleClick(index)}
            >
              <span className={`
                ${isSelected 
                    ? 'text-blue-600 text-4xl font-bold scale-110' 
                    : 'text-gray-400 text-xl font-medium scale-100'}
                ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:text-gray-600'}
                transition-all duration-200 block
              `}>
                {value}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40 p-4" onClick={onClose}>
      <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center pb-4 border-b">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XIcon className="h-6 w-6" /></button>
        </div>

        <div className="relative my-6 bg-gray-50 rounded-lg overflow-hidden">
             {/* Mittlere Linien für visuelle Orientierung */}
             <div className="absolute top-1/2 left-0 right-0 h-[48px] -translate-y-1/2 border-y border-blue-200 bg-blue-50/50 pointer-events-none z-0" />
             
             {/* Gradient Maske für 3D Effekt */}
             <div className="absolute inset-0 pointer-events-none z-20 bg-gradient-to-b from-white via-transparent to-white opacity-80" style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 40%, transparent 60%, black 100%)' }}></div>

             <div className="flex justify-center relative z-10">
                <TimeColumn 
                    values={hours}
                    selectedValue={selectedHour}
                    onScroll={(e) => handleScroll(e, 'hour')}
                    listRef={hourListRef}
                    isDisabled={(h) => parseInt(h, 10) < minHour}
                />
                <TimeColumn 
                    values={minutes}
                    selectedValue={selectedMinute}
                    onScroll={(e) => handleScroll(e, 'minute')}
                    listRef={minuteListRef}
                    isDisabled={(m) => parseInt(selectedHour, 10) === minHour && parseInt(m, 10) < minMinute}
                />
             </div>
        </div>

        <div className="flex justify-end gap-2 pt-6 border-t">
          <Button onClick={onClose} className="bg-gray-200 text-gray-800 hover:bg-gray-300">Abbrechen</Button>
          {showBackButton && <Button onClick={onBack} className="bg-gray-500 hover:bg-gray-600">Zurück</Button>}
          <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700">OK</Button>
        </div>
      </Card>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};