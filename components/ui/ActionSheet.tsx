import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { PencilIcon } from '../icons/PencilIcon';
import { VacationSunIcon } from '../icons/VacationSunIcon';
import { XIcon } from '../icons/XIcon';

interface ActionSheetProps {
  onClose: () => void;
  onSelect: (action: 'manualTime' | 'absence') => void;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({ onClose, onSelect }) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };
  
  const handleSelect = (action: 'manualTime' | 'absence') => {
    setIsClosing(true);
    setTimeout(() => onSelect(action), 300);
  };

  return ReactDOM.createPortal(
    <div className={`fixed inset-0 bg-black flex items-end justify-center z-[150] ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
      <div 
        className={`w-full max-w-md bg-white rounded-t-2xl shadow-lg p-4 ${isClosing ? 'animate-slide-down-sheet' : 'animate-slide-up'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Aktion auswählen</h3>
            <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                <XIcon className="h-6 w-6" />
            </button>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => handleSelect('manualTime')}
            className="w-full flex items-center gap-4 p-4 rounded-lg text-left hover:bg-gray-100 transition-colors"
          >
            <PencilIcon className="h-6 w-6 text-blue-600" />
            <div>
              <p className="font-semibold text-gray-800">Manueller Zeiteintrag</p>
              <p className="text-sm text-gray-500">Arbeitszeit nachträglich erfassen.</p>
            </div>
          </button>
          <button
            onClick={() => handleSelect('absence')}
            className="w-full flex items-center gap-4 p-4 rounded-lg text-left hover:bg-gray-100 transition-colors"
          >
            <VacationSunIcon className="h-6 w-6" />
            <div>
              <p className="font-semibold text-gray-800">Abwesenheit beantragen</p>
              <p className="text-sm text-gray-500">Urlaub oder Krankheit einreichen.</p>
            </div>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};