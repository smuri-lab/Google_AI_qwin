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
  const isInitialRender = useRef(true);

  useEffect(() => {
    if (isOpen) {
      const [h, m] = (initialTime || '08:00').split(':');
      setSelectedHour(h);
      setSelectedMinute(m);
      isInitialRender.current = true;
    }
  }, [isOpen, initialTime]);
  
  useEffect(() => {
    if (isOpen) {
      const behavior = isInitialRender.current ? 'auto' : 'smooth';
      
      const timer = setTimeout(() => {
        const hourEl = hourListRef.current?.querySelector(`[data-hour="${selectedHour}"]`);
        hourEl?.scrollIntoView({ block: 'center', behavior });

        const minuteEl = minuteListRef.current?.querySelector(`[data-minute="${selectedMinute}"]`);
        minuteEl?.scrollIntoView({ block: 'center', behavior });
        
        if (isInitialRender.current) {
            isInitialRender.current = false;
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedHour, selectedMinute]);


  const minHour = minTime ? parseInt(minTime.split(':')[0], 10) : -1;
  const minMinute = minTime ? parseInt(minTime.split(':')[1], 10) : -1;

  if (!isOpen) return null;

  const handleConfirm = () => {
    onSelect(`${selectedHour}:${selectedMinute}`);
  };
  
  const TimeColumn: React.FC<{
    values: string[];
    selectedValue: string;
    onSelect: (value: string) => void;
    isDisabled: (value: string) => boolean;
    listRef: React.RefObject<HTMLDivElement>;
    type: 'hour' | 'minute';
  }> = ({ values, selectedValue, onSelect, isDisabled, listRef, type }) => (
    <div 
      ref={listRef} 
      className="h-64 w-1/2 overflow-y-scroll snap-y snap-mandatory bg-gray-50 rounded-lg py-24 px-2 space-y-1"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)'
      }}
    >
      {values.map(value => {
        const disabled = isDisabled(value);
        return (
          <button
            key={value}
            type="button"
            data-hour={type === 'hour' ? value : undefined}
            data-minute={type === 'minute' ? value : undefined}
            onClick={() => !disabled && onSelect(value)}
            disabled={disabled}
            className={`w-full text-center text-3xl font-semibold p-3 rounded-lg snap-center transition-colors
              ${selectedValue === value ? 'text-blue-600' : 'text-gray-700 hover:bg-gray-200/70'}
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
             <div className="absolute top-1/2 -translate-y-1/2 h-16 w-full bg-blue-100/50 border-y-2 border-blue-200 rounded-lg pointer-events-none z-10" />
             <TimeColumn 
                values={hours}
                selectedValue={selectedHour}
                onSelect={setSelectedHour}
                isDisabled={(h) => parseInt(h, 10) < minHour}
                listRef={hourListRef}
                type="hour"
             />
             <TimeColumn 
                values={minutes}
                selectedValue={selectedMinute}
                onSelect={setSelectedMinute}
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
    </div>
  );
};