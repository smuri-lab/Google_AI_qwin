
import React from 'react';
import { Card } from '../ui/Card';
import { XIcon } from '../icons/XIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { SunIcon } from '../icons/SunIcon';
import { CurrencyEuroIcon } from '../icons/CurrencyEuroIcon';
import { CalculatorIcon } from '../icons/CalculatorIcon';

type Choice = 'time' | 'absence' | 'payout' | 'correction';

interface AddEntryChoiceModalProps {
  onClose: () => void;
  onSelect: (choice: Choice) => void;
}

export const AddEntryChoiceModal: React.FC<AddEntryChoiceModalProps> = ({ onClose, onSelect }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-30 p-4" onClick={onClose}>
      <Card className="w-full max-w-lg relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
          <XIcon className="h-6 w-6" />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold mb-6">Was möchten Sie eintragen?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => onSelect('time')}
              className="p-6 border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all duration-200 flex flex-col items-center justify-center space-y-2"
            >
              <ClockIcon className="h-10 w-10 text-blue-600" />
              <span className="font-semibold text-gray-700">Zeiteintrag</span>
            </button>
            <button
              onClick={() => onSelect('absence')}
              className="p-6 border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all duration-200 flex flex-col items-center justify-center space-y-2"
            >
              <SunIcon className="h-10 w-10 text-orange-500" />
              <span className="font-semibold text-gray-700">Abwesenheit</span>
            </button>
            <button
              onClick={() => onSelect('payout')}
              className="p-6 border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all duration-200 flex flex-col items-center justify-center space-y-2"
            >
              <CurrencyEuroIcon className="h-10 w-10 text-green-600" />
              <span className="font-semibold text-gray-700">Auszahlung</span>
            </button>
            <button
              onClick={() => onSelect('correction')}
              className="p-6 border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all duration-200 flex flex-col items-center justify-center space-y-2"
            >
              <CalculatorIcon className="h-10 w-10 text-purple-600" />
              <span className="font-semibold text-gray-700">Korrektur</span>
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
