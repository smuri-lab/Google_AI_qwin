import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Card } from '../ui/Card';
import { XIcon } from '../icons/XIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { VacationSunIcon } from '../icons/VacationSunIcon';
import { CurrencyEuroIcon } from '../icons/CurrencyEuroIcon';
import { CalculatorIcon } from '../icons/CalculatorIcon';

type Choice = 'time' | 'absence' | 'payout' | 'correction';

interface AddEntryChoiceModalProps {
  onClose: () => void;
  onSelect: (choice: Choice) => void;
}

export const AddEntryChoiceModal: React.FC<AddEntryChoiceModalProps> = ({ onClose, onSelect }) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };
  
  const handleSelect = (choice: Choice) => {
    // Trigger closing animation first
    setIsClosing(true);
    // Wait for animation to finish before switching modal state in parent
    setTimeout(() => {
        onSelect(choice);
    }, 300);
  };

  return ReactDOM.createPortal(
    <div className={`fixed inset-0 bg-black flex items-center justify-center z-[100] p-4 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
      <Card className={`w-full max-w-lg relative ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={(e) => e.stopPropagation()}>
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
          <XIcon className="h-6 w-6" />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold mb-6">Was möchten Sie eintragen?</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSelect('time')}
              className="p-6 border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all duration-200 flex flex-col items-center justify-center space-y-2"
            >
              <ClockIcon className="h-10 w-10 text-blue-600" />
              <span className="font-semibold text-gray-700">Zeiteintrag</span>
            </button>
            <button
              onClick={() => handleSelect('absence')}
              className="p-6 border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all duration-200 flex flex-col items-center justify-center space-y-2"
            >
              <VacationSunIcon className="h-10 w-10" />
              <span className="font-semibold text-gray-700">Abwesenheit</span>
            </button>
            <button
              onClick={() => handleSelect('payout')}
              className="p-6 border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all duration-200 flex flex-col items-center justify-center space-y-2"
            >
              <CurrencyEuroIcon className="h-10 w-10 text-green-600" />
              <span className="font-semibold text-gray-700">Auszahlung</span>
            </button>
            <button
              onClick={() => handleSelect('correction')}
              className="p-6 border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all duration-200 flex flex-col items-center justify-center space-y-2"
            >
              <CalculatorIcon className="h-10 w-10 text-purple-600" />
              <span className="font-semibold text-gray-700">Korrektur</span>
            </button>
          </div>
        </div>
      </Card>
    </div>,
    document.body
  );
};