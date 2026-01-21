import React, { useState, useEffect } from 'react';
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
const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

export const TimePickerModal: React.FC<TimePickerModalProps> = ({ isOpen, onClose, onSelect, title, initialTime, minTime, showBackButton, onBack }) => {
  const [view, setView] = useState<'hours' | 'minutes'>('hours');
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('00');

  useEffect(() => {
    if (isOpen) {
      const [h, m] = (initialTime || '08:00').split(':');
      setHour(h);
      setMinute(m);
      setView('hours');
    }
  }, [isOpen, initialTime]);

  const minHour = minTime ? parseInt(minTime.split(':')[0], 10) : -1;
  const minMinute = minTime ? parseInt(minTime.split(':')[1], 10) : -1;

  if (!isOpen) return null;

  const handleHourSelect = (h: string) => {
    setHour(h);
    setView('minutes');
  };

  const handleMinuteSelect = (m: string) => {
    setMinute(m);
  };
  
  const handleConfirm = () => {
    onSelect(`${hour}:${minute}`);
  };
  
  const TimeGrid: React.FC<{
    values: string[];
    onSelect: (value: string) => void;
    isDisabled: (value: string) => boolean;
    selectedValue: string;
    cols?: number;
  }> = ({ values, onSelect, isDisabled, selectedValue, cols = 6 }) => (
    <div className={`grid grid-cols-${cols} gap-2`}>
        {values.map(value => {
            const disabled = isDisabled(value);
            const isSelected = selectedValue === value;
            return (
                <button
                    key={value}
                    type="button"
                    onClick={() => !disabled && onSelect(value)}
                    disabled={disabled}
                    className={`flex items-center justify-center h-12 w-12 rounded-full transition-all duration-200 text-lg font-semibold
                        ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}
                        ${disabled ? 'bg-gray-100 text-gray-300 cursor-not-allowed hover:bg-gray-100' : ''}
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

        <div className="flex justify-center items-center gap-2 my-6 font-mono">
            <button
                type="button"
                onClick={() => setView('hours')}
                className={`p-2 rounded-lg transition-colors ${view === 'hours' ? 'text-blue-600 font-bold text-5xl' : 'text-gray-400 text-5xl hover:bg-gray-100'}`}
            >
                {hour}
            </button>
            <span className="text-gray-400 text-5xl">:</span>
            <button
                type="button"
                onClick={() => setView('minutes')}
                className={`p-2 rounded-lg transition-colors ${view === 'minutes' ? 'text-blue-600 font-bold text-5xl' : 'text-gray-400 text-5xl hover:bg-gray-100'}`}
            >
                {minute}
            </button>
        </div>

        <div className="flex justify-center items-center h-64">
            {view === 'hours' ? (
                 <TimeGrid
                    values={hours}
                    onSelect={handleHourSelect}
                    isDisabled={(h) => parseInt(h, 10) < minHour}
                    selectedValue={hour}
                    cols={4}
                 />
            ) : (
                <TimeGrid
                    values={minutes}
                    onSelect={handleMinuteSelect}
                    isDisabled={(m) => parseInt(hour, 10) === minHour && parseInt(m, 10) < minMinute}
                    selectedValue={minute}
                    cols={4}
                />
            )}
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