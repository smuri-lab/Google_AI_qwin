import React, { useState, useMemo, useEffect } from 'react';
import { Card } from './Card';
import { Input } from './Input';
import { XIcon } from '../icons/XIcon';
import { CheckIcon } from '../icons/CheckIcon';

interface SelectableItem {
  id: string;
  name: string;
}

interface SelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: SelectableItem) => void;
  items: SelectableItem[];
  title: string;
  selectedValue: string;
  isRotated?: boolean;
}

export const SelectionModal: React.FC<SelectionModalProps> = ({ isOpen, onClose, onSelect, items, title, selectedValue, isRotated = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      // Opening animation
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      // Reset state immediately when closed
      setIsVisible(false);
      setIsClosing(false);
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    return items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleSelect = (item: SelectableItem) => {
    onSelect(item);
    handleClose();
  };

  const containerClass = isRotated
    ? `fixed top-0 left-0 w-[100vh] h-[100vw] origin-top-left rotate-90 translate-x-[100vw] flex items-center justify-center z-[260] p-1 sm:p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : (isVisible ? 'animate-modal-fade-in' : 'bg-transparent')}`
    : `fixed inset-0 bg-black flex items-center justify-center z-[260] p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : (isVisible ? 'animate-modal-fade-in' : 'bg-transparent')}`;

  const cardClasses = `w-full max-w-lg relative flex flex-col ${isRotated ? 'max-h-[98vh] !p-3' : 'max-h-[90vh]'} ${isClosing ? 'animate-modal-slide-down' : (isVisible ? 'animate-modal-slide-up' : 'opacity-0 translate-y-4')}`;

  return (
    <div className={containerClass} onClick={handleClose}>
      <Card className={cardClasses} onClick={(e) => e.stopPropagation()}>
        <div className={`flex justify-between items-center ${isRotated ? 'pb-2' : 'pb-4'} border-b`}>
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <div className={isRotated ? 'py-2' : 'py-4'}>
          <Input
            label=""
            type="text"
            placeholder="Suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex-grow overflow-y-auto space-y-2 pr-2">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className={`w-full text-left p-3 rounded-lg transition-colors flex justify-between items-center ${
                  selectedValue === item.id
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'hover:bg-gray-100'
                }`}
              >
                <span>{item.name}</span>
                {selectedValue === item.id && <CheckIcon className="h-5 w-5 text-blue-700" />}
              </button>
            ))
          ) : (
            <p className="text-center text-gray-500 py-8">Keine Ergebnisse gefunden.</p>
          )}
        </div>
      </Card>
    </div>
  );
};