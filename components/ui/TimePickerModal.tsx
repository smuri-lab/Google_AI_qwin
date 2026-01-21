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

// Feste Höhe für exakte Berechnungen
const ITEM_HEIGHT = 48; 
const VISIBLE_COUNT = 5; 
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT; // 240px

export const TimePickerModal: React.FC<TimePickerModalProps> = ({ isOpen, onClose, onSelect, title, initialTime, minTime, showBackButton, onBack }) => {
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');
  
  // Refs für die Scroll-Container
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // Initialisierung: Setze Scroll-Position beim Öffnen
  useEffect(() => {
    if (isOpen) {
      const [h, m] = (initialTime || '08:00').split(':');
      // Setze State sofort
      setSelectedHour(h);
      setSelectedMinute(m);
      isInitialMount.current = true;

      // Warte kurz, bis das Modal gerendert ist, dann scrolle zur Position
      setTimeout(() => {
        if (hourRef.current) {
            const hIndex = parseInt(h, 10);
            hourRef.current.scrollTop = hIndex * ITEM_HEIGHT;
        }
        if (minuteRef.current) {
            const mIndex = parseInt(m, 10);
            minuteRef.current.scrollTop = mIndex * ITEM_HEIGHT;
        }
        isInitialMount.current = false;
      }, 50); // Kleiner Timeout für Mobile Rendering
    }
  }, [isOpen, initialTime]);

  const minHour = minTime ? parseInt(minTime.split(':')[0], 10) : -1;
  const minMinute = minTime ? parseInt(minTime.split(':')[1], 10) : -1;

  if (!isOpen) return null;

  const handleConfirm = () => {
    onSelect(`${selectedHour}:${selectedMinute}`);
  };

  // Allgemeine Scroll-Funktion
  const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: 'hour' | 'minute', values: string[]) => {
    // Wenn wir initial scrollen, ignorieren wir Events, um Flackern zu vermeiden
    if (isInitialMount.current) return;

    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    
    // Berechne den Index basierend auf der Scroll-Position
    // Math.round sorgt dafür, dass wir das Item nehmen, das am nächsten zur Mitte ist
    let index = Math.round(scrollTop / ITEM_HEIGHT);
    
    // Begrenzung sicherstellen
    if (index < 0) index = 0;
    if (index >= values.length) index = values.length - 1;

    const newValue = values[index];

    if (type === 'hour') {
      if (newValue !== selectedHour) setSelectedHour(newValue);
    } else {
      if (newValue !== selectedMinute) setSelectedMinute(newValue);
    }
  };

  const TimeColumn = ({ 
    values, 
    value, 
    type, 
    containerRef, 
    isDisabled 
  }: { 
    values: string[], 
    value: string, 
    type: 'hour' | 'minute', 
    containerRef: React.RefObject<HTMLDivElement>,
    isDisabled: (val: string) => boolean
  }) => {
    return (
      <div className="relative w-1/2 h-full">
        <div 
            ref={containerRef}
            onScroll={(e) => handleScroll(e, type, values)}
            className="h-full overflow-y-auto snap-y snap-mandatory no-scrollbar"
            style={{ 
                height: `${CONTAINER_HEIGHT}px`,
                scrollBehavior: 'smooth' // Weiches Scrollen bei Klick
            }}
        >
            {/* Padding oben, damit das erste Element in die Mitte rutschen kann */}
            <div style={{ height: `${(CONTAINER_HEIGHT - ITEM_HEIGHT) / 2}px` }} />
            
            {values.map((item) => {
                const disabled = isDisabled(item);
                const isSelected = item === value;
                return (
                    <div 
                        key={item} 
                        className={`h-[48px] flex items-center justify-center snap-center transition-all duration-200 cursor-pointer select-none`}
                        onClick={() => {
                            if (!disabled && containerRef.current) {
                                const idx = values.indexOf(item);
                                containerRef.current.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
                            }
                        }}
                    >
                        <span className={`
                            ${isSelected ? 'text-3xl font-bold text-blue-600 scale-110' : 'text-xl text-gray-400'}
                            ${disabled ? 'opacity-30' : ''}
                            transition-transform
                        `}>
                            {item}
                        </span>
                    </div>
                );
            })}

            {/* Padding unten, damit das letzte Element in die Mitte rutschen kann */}
            <div style={{ height: `${(CONTAINER_HEIGHT - ITEM_HEIGHT) / 2}px` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center pb-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2"><XIcon className="h-6 w-6" /></button>
        </div>

        <div className="relative my-6 select-none">
             {/* Blaue Auswahl-Balken in der Mitte (Hintergrund) */}
             <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[48px] bg-blue-50 border-y border-blue-200 pointer-events-none z-0" />
             
             {/* Gradient Maske für 3D Effekt (Optional, sieht aber gut aus) */}
             <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-b from-white via-transparent to-white opacity-80" />

             <div className="flex justify-center relative z-20 h-[240px]">
                <TimeColumn 
                    values={hours}
                    value={selectedHour}
                    type="hour"
                    containerRef={hourRef}
                    isDisabled={(h) => parseInt(h, 10) < minHour}
                />
                <TimeColumn 
                    values={minutes}
                    value={selectedMinute}
                    type="minute"
                    containerRef={minuteRef}
                    isDisabled={(m) => parseInt(selectedHour, 10) === minHour && parseInt(m, 10) < minMinute}
                />
             </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button onClick={onClose} className="bg-gray-200 text-gray-800 hover:bg-gray-300">Abbrechen</Button>
          {showBackButton && <Button onClick={onBack} className="bg-gray-500 hover:bg-gray-600 text-white">Zurück</Button>}
          <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700 text-white">OK</Button>
        </div>
      </Card>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};