import React, { useState, useEffect } from 'react';
import { PencilIcon } from '../icons/PencilIcon';
import { SunIcon } from '../icons/SunIcon';
import { XIcon } from '../icons/XIcon';

interface ActionSheetProps {
  onClose: () => void;
  onSelect: (action: 'manualTime' | 'absence') => void;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({ onClose, onSelect }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Opening animation - since ActionSheet is conditionally rendered by parent, this mounts freshly.
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };
  
  const handleSelect = (action: 'manualTime' | 'absence') => {
    setIsClosing(true);
    setTimeout(() => onSelect(action), 300);
  };

  return (
    <div className={`fixed inset-0 bg-black flex items-end justify-center z-40 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : (isVisible ? 'animate-modal-fade-in' : 'bg-transparent')}`} onClick={handleClose}>
      <div 
        className={`w-full max-w-md bg-white rounded-t-2xl shadow-lg p-4 ${isClosing ? 'animate-slide-down-sheet' : (isVisible ? 'animate-slide-up' : 'translate-y-full')}`}
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