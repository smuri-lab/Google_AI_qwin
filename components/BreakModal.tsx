
import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { XIcon } from './icons/XIcon';

interface BreakModalProps {
  onClose: () => void;
  onSave: (breakMinutes: number) => void;
}

export const BreakModal: React.FC<BreakModalProps> = ({ onClose, onSave }) => {
  const [breakMinutes, setBreakMinutes] = useState('');

  const handleSaveClick = () => {
    onSave(Number(breakMinutes) || 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30 p-4" onClick={onClose}>
      <Card className="w-full max-w-sm relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
          <XIcon className="h-6 w-6" />
        </button>
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-center">Pause eintragen</h2>
          <Input 
            label="Pause (m)" 
            type="number" 
            value={breakMinutes} 
            onChange={(e) => setBreakMinutes(e.target.value)} 
            min="0"
            placeholder="0"
            autoFocus 
          />
          <div className="flex gap-4 pt-2">
            <Button type="button" onClick={onClose} className="w-full bg-gray-500 hover:bg-gray-600">
              Abbrechen
            </Button>
            <Button type="button" onClick={handleSaveClick} className="w-full bg-blue-600 hover:bg-blue-700">
              Speichern
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};