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
  const hourScrollTimeout = useRef<number | null>(null);
  const minuteScrollTimeout = useRef<number | null>(null);
  const scrollInitiator = useRef<'initial' | 'click' | 'scroll'>('initial');

  useEffect(() => {
    if (isOpen) {
      const [h, m] = (initialTime || '08:00').split(':');
      setSelectedHour(h);
      setSelectedMinute(m);
      scrollInitiator.current = 'initial';
    }
  }, [isOpen, initialTime]);
  
  useEffect(() => {
    if (isOpen) {
      if (scrollInitiator.current === 'scroll') {
        scrollInitiator.current = 'click'; 
        return; 
      }
      
      const behavior = scrollInitiator.current === 'initial' ? 'auto' : 'smooth';
      
      const timer = setTimeout(() => {
        const hourEl = hourListRef.current?.querySelector(`[data-hour="${selectedHour}"]`);
        hourEl?.scrollIntoView({ block: 'center', behavior });

        const minuteEl = minuteListRef.current?.querySelector(`[data-minute="${selectedMinute}"]`);
        minuteEl?.scrollIntoView({ block: 'center', behavior });
      }, 50);

      scrollInitiator.current = 'click';

      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedHour, selectedMinute]);


  const minHour = minTime ? parseInt(minTime.split(':')[0], 10) : -1;
  const minMinute = minTime ? parseInt(minTime.split(':')[1], 10) : -1;

  if (!isOpen) return null;

  const handleConfirm = () => {
    onSelect(`${selectedHour}:${selectedMinute}`);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: 'hour' | 'minute') => {
    const container = e.currentTarget;
    const timeoutRef = type === 'hour' ? hourScrollTimeout : minuteScrollTimeout;
    const setter = type === 'hour' ? setSelectedHour : setSelectedMinute;
    const selectedValue = type === 'hour' ? selectedHour : selectedMinute;
    
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 2;

        let closestElement: HTMLElement | null = null;
        let minDistance = Infinity;

        Array.from(container.children).forEach(child => {
            const childEl = child as HTMLElement;
            const childRect = childEl.getBoundingClientRect();
            const childCenter = childRect.top + childRect.height / 2;
            const distance = Math.abs(containerCenter - childCenter);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestElement = childEl;
            }
        });

        if (closestElement) {
            const value = closestElement.dataset[type];
            if (value && !closestElement.hasAttribute('disabled')) {
                if (value !== selectedValue) {
                    scrollInitiator.current = 'scroll';
                    setter(value);
                }
            }
        }
    }, 150);
  };
  
  const TimeColumn: React.FC<{
    values: string[];
    selectedValue: string;
    onSelect: (value: string) => void;
    isDisabled: (value: string) => boolean;
    listRef: React.RefObject<HTMLDivElement>;
    type: 'hour' | 'minute';
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  }> = ({ values, selectedValue, onSelect, isDisabled, listRef, type, onScroll }) => (
    <div 
      ref={listRef} 
      onScroll={onScroll}
      className="h-56 w-1/2 overflow-y-scroll snap-y snap-mandatory bg-gray-50 rounded-lg py-20 px-2 space-y-1"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)'
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
            onClick={() => {
                if (!disabled) {
                    scrollInitiator.current = 'click';
                    onSelect(value);
                }
            }}
            disabled={disabled}
            className={`w-full text-center p-1 rounded-lg snap-center transition-all duration-200
              ${isSelected ? 'text-blue-600 text-3xl font-bold' : 'text-gray-400 text-2xl font-semibold hover:text-gray-700 hover:bg-gray-200/70'}
              ${disabled ? 'text-gray-300 cursor-not-allowed hover:bg-transparent' : ''}
            `}
          >
            {value}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40 p-4" onClick={onClose}>
      <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center pb-4 border-b">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XIcon className="h-6 w-6" /></button>
        </div>

        <div className="flex justify-center gap-2 my-6 relative">
             <div className="absolute top-1/2 -translate-y-1/2 h-12 w-full border-y border-gray-200 pointer-events-none z-10" />
             <TimeColumn 
                values={hours}
                selectedValue={selectedHour}
                onSelect={setSelectedHour}
                isDisabled={(h) => parseInt(h, 10) < minHour}
                listRef={hourListRef}
                type="hour"
                onScroll={(e) => handleScroll(e, 'hour')}
             />
             <TimeColumn 
                values={minutes}
                selectedValue={selectedMinute}
                onSelect={setSelectedMinute}
                isDisabled={(m) => parseInt(selectedHour, 10) === minHour && parseInt(m, 10) < minMinute}
                listRef={minuteListRef}
                type="minute"
                onScroll={(e) => handleScroll(e, 'minute')}
             />
        </div>

        <div className="flex justify-end gap-2 pt-6 border-t">
          <Button onClick={onClose} className="bg-gray-200 text-gray-800 hover:bg-gray-300">Abbrechen</Button>
          {showBackButton && <Button onClick={onBack} className="bg-gray-500 hover:bg-gray-600">Zurück</Button>}
          <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700">OK</Button>
        </div>
      </Card>
    </div>
  );
};