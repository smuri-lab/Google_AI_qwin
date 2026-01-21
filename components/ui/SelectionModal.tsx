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
}

export const SelectionModal: React.FC<SelectionModalProps> = ({ isOpen, onClose, onSelect, items, title, selectedValue }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setSearchTerm('');
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

  return (
    <div className={`fixed inset-0 bg-black flex items-center justify-center z-40 p-4 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
      <Card className={`w-full max-w-lg relative max-h-[90vh] flex flex-col ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center pb-4 border-b">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="py-4">
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