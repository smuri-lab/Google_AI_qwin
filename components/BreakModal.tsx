import React, { useState, useEffect } from 'react';
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
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // This effect is only to handle the initial mount state,
    // which is now implicitly handled by useState.
    // If we re-open, the component re-mounts and isClosing is false again.
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };
  
  const handleSaveClick = () => {
    setIsClosing(true);
    setTimeout(() => onSave(Number(breakMinutes) || 0), 300);
  };

  return (
    <div className={`fixed inset-0 bg-black flex items-center justify-center z-30 p-4 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
      <Card className={`w-full max-w-sm relative ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={(e) => e.stopPropagation()}>
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
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
            <Button type="button" onClick={handleClose} className="w-full bg-gray-500 hover:bg-gray-600">
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