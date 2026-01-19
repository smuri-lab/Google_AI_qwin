import React from 'react';
import { PencilIcon } from '../icons/PencilIcon';
import { SunIcon } from '../icons/SunIcon';
import { XIcon } from '../icons/XIcon';

interface ActionSheetProps {
  onClose: () => void;
  onSelect: (action: 'manualTime' | 'absence') => void;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({ onClose, onSelect }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-40" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-white rounded-t-2xl shadow-lg p-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Aktion auswählen</h3>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                <XIcon className="h-6 w-6" />
            </button>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => onSelect('manualTime')}
            className="w-full flex items-center gap-4 p-4 rounded-lg text-left hover:bg-gray-100 transition-colors"
          >
            <PencilIcon className="h-6 w-6 text-blue-600" />
            <div>
              <p className="font-semibold text-gray-800">Manueller Zeiteintrag</p>
              <p className="text-sm text-gray-500">Arbeitszeit nachträglich erfassen.</p>
            </div>
          </button>
          <button
            onClick={() => onSelect('absence')}
            className="w-full flex items-center gap-4 p-4 rounded-lg text-left hover:bg-gray-100 transition-colors"
          >
            <SunIcon className="h-6 w-6 text-orange-500" />
            <div>
              <p className="font-semibold text-gray-800">Abwesenheit beantragen</p>
              <p className="text-sm text-gray-500">Urlaub oder Krankheit einreichen.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};