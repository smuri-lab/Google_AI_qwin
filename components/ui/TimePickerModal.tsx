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

export const TimePickerModal: React.FC<TimePickerModalProps> = ({ isOpen, onClose, onSelect, title, initialTime, minTime, showBackButton, onBack }) => {
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');
  
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);

  // Effect for setting initial time and position when the modal opens
  useEffect(() => {
    if (isOpen) {
      const [h, m] = (initialTime || '08:00').split(':');
      setSelectedHour(h);
      setSelectedMinute(m);

      setTimeout(() => {
        const hourEl = hourListRef.current?.querySelector(`[data-hour="${h}"]`);
        hourEl?.scrollIntoView({ behavior: 'auto', block: 'center' });

        const minuteEl = minuteListRef.current?.querySelector(`[data-minute="${m}"]`);
        minuteEl?.scrollIntoView({ behavior: 'auto', block: 'center' });
      }, 50);
    }
  }, [isOpen, initialTime]);
  
  // Effect to attach reliable 'scrollend' listeners
  useEffect(() => {
    if (!isOpen) return;

    const hourEl = hourListRef.current;
    const minuteEl = minuteListRef.current;

    const handleScrollEnd = (
      container: HTMLDivElement,
      setter: React.Dispatch<React.SetStateAction<string>>,
      type: 'hour' | 'minute'
    ) => {
      const { scrollTop, clientHeight } = container;
      const scrollCenter = scrollTop + clientHeight / 2;

      let closestElement: HTMLElement | null = null;
      let minDistance = Infinity;

      Array.from(container.children).forEach(child => {
        const childEl = child as HTMLElement;
        const childCenter = childEl.offsetTop + childEl.offsetHeight / 2;
        const distance = Math.abs(scrollCenter - childCenter);

        if (distance < minDistance) {
          minDistance = distance;
          closestElement = childEl;
        }
      });
      
      if (closestElement) {
        const value = closestElement.dataset[type];
        if (value && !closestElement.hasAttribute('disabled')) {
          setter(value);
        }
      }
    };
    
    const hourScrollHandler = () => handleScrollEnd(hourEl!, setSelectedHour, 'hour');
    const minuteScrollHandler = () => handleScrollEnd(minuteEl!, setSelectedMinute, 'minute');
    
    const eventName = 'scrollend' in window ? 'scrollend' : 'scroll';

    if (hourEl) hourEl.addEventListener(eventName, hourScrollHandler);
    if (minuteEl) minuteEl.addEventListener(eventName, minuteScrollHandler);

    return () => {
      if (hourEl) hourEl.removeEventListener(eventName, hourScrollHandler);
      if (minuteEl) minuteEl.removeEventListener(eventName, minuteScrollHandler);
    };

  }, [isOpen]);


  const minHour = minTime ? parseInt(minTime.split(':')[0], 10) : -1;
  const minMinute = minTime ? parseInt(minTime.split(':')[1], 10) : -1;

  if (!isOpen) return null;

  const handleConfirm = () => {
    onSelect(`${selectedHour}:${selectedMinute}`);
  };

  const TimeColumn: React.FC<{
    values: string[];
    selectedValue: string;
    isDisabled: (value: string) => boolean;
    listRef: React.RefObject<HTMLDivElement>;
    type: 'hour' | 'minute';
  }> = ({ values, selectedValue, isDisabled, listRef, type }) => {
    
    const handleItemClick = (value: string, disabled: boolean) => {
        if (disabled) return;
        const itemEl = listRef.current?.querySelector(`[data-${type}="${value}"]`);
        itemEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div 
            ref={listRef} 
            className="h-64 w-1/2 overflow-y-scroll snap-y snap-mandatory bg-gray-50 rounded-lg no-scrollbar"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)',
              padding: 'calc(50% - 24px) 0',
            }}
          >
            {values.map(value => {
              const disabled = isDisabled(value);
              const isSelected = selectedValue === value;
              return (
                <button
                  key={value}
                  type="button"
                  data-hour={type === 'hour' ? value : undefined}
                  data-minute={type === 'minute' ? value : undefined}
                  onClick={() => handleItemClick(value, disabled)}
                  disabled={disabled}
                  aria-current={isSelected ? 'true' : 'false'}
                  className={`flex-shrink-0 h-12 w-full flex items-center justify-center snap-center transition-all duration-200
                    ${isSelected ? 'text-blue-600 text-4xl font-bold' : 'text-gray-400 text-2xl font-semibold hover:text-gray-700'}
                    ${disabled ? 'text-gray-300 cursor-not-allowed hover:text-gray-300' : ''}
                  `}
                >
                  {value}
                </button>
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

        <div className="flex justify-center gap-2 my-6 relative">
             <div className="absolute top-1/2 -translate-y-1/2 h-14 w-full border-y border-gray-200 pointer-events-none z-10" aria-hidden="true" />
             <TimeColumn 
                values={hours}
                selectedValue={selectedHour}
                isDisabled={(h) => parseInt(h, 10) < minHour}
                listRef={hourListRef}
                type="hour"
             />
             <TimeColumn 
                values={minutes}
                selectedValue={selectedMinute}
                isDisabled={(m) => parseInt(selectedHour, 10) === minHour && parseInt(m, 10) < minMinute}
                listRef={minuteListRef}
                type="minute"
             />
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