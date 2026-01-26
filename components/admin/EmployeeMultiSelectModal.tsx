import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import type { Employee } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { XIcon } from '../icons/XIcon';
import { Input } from '../ui/Input';

interface Item {
  id: string | number;
  name: string;
  isActive?: boolean;
}

interface MultiSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selectedIds: (string | number)[]) => void;
  employees?: Employee[];
  items?: Item[];
  selectedEmployeeIds?: number[];
  selectedItemIds?: (string | number)[];
  title?: string;
}

export const EmployeeMultiSelectModal: React.FC<MultiSelectModalProps> = ({ isOpen, onClose, onApply, employees, items, selectedEmployeeIds, selectedItemIds, title = "Mitarbeiter auswählen" }) => {
  const [currentSelectedIds, setCurrentSelectedIds] = useState(new Set<string|number>());
  const [searchTerm, setSearchTerm] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const dataItems = useMemo(() => {
    if (employees) return employees.filter(e => e.isActive).map(e => ({id: e.id, name: `${e.firstName} ${e.lastName}`}));
    if (items) return items;
    return [];
  }, [employees, items]);

  useEffect(() => {
    if (isOpen) {
      const idsToSet = selectedItemIds || selectedEmployeeIds || [];
      setCurrentSelectedIds(new Set(idsToSet));
      setSearchTerm('');
      setIsClosing(false);
    }
  }, [isOpen, selectedEmployeeIds, selectedItemIds]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return dataItems;
    return dataItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [dataItems, searchTerm]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  if (!isOpen) return null;

  const handleSelectionChange = (itemId: string | number) => {
    const newIds = new Set(currentSelectedIds);
    if (newIds.has(itemId)) newIds.delete(itemId); else newIds.add(itemId);
    setCurrentSelectedIds(newIds);
  };

  const handleSelectAll = () => setCurrentSelectedIds(new Set(dataItems.map(i => i.id)));
  const handleDeselectAll = () => setCurrentSelectedIds(new Set());

  const handleApply = () => {
    setIsClosing(true);
    setTimeout(() => {
        onApply(Array.from(currentSelectedIds));
    }, 300);
  };

  return ReactDOM.createPortal(
    <div className={`fixed inset-0 bg-black flex items-center justify-center z-40 p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
      <Card className={`w-full max-w-lg ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={handleClose} className="p-1 rounded-full hover:bg-gray-100"><XIcon className="h-6 w-6" /></button>
        </div>

        <div className="space-y-4">
          <Input label="Suchen" type="text" placeholder="Name eingeben..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />

          <fieldset>
            <div className="flex justify-between items-center mb-2">
                <legend className="text-base font-semibold text-gray-800">Elemente</legend>
                <div>
                    <button type="button" onClick={handleSelectAll} className="text-sm font-semibold text-blue-600 hover:underline mr-4">Alle auswählen</button>
                    <button type="button" onClick={handleDeselectAll} className="text-sm font-semibold text-blue-600 hover:underline">Alle abwählen</button>
                </div>
            </div>

            <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
              {filteredItems.length > 0 ? filteredItems.map((item) => (
                  <label key={item.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={currentSelectedIds.has(item.id)} onChange={() => handleSelectionChange(item.id)} />
                    <span>{item.name}</span>
                  </label>
              )) : <p className="text-center text-gray-500 py-4">Keine Elemente gefunden.</p>}
            </div>
          </fieldset>
        </div>

        <div className="flex justify-end gap-4 pt-6 mt-6 border-t">
          <Button onClick={handleClose} className="bg-gray-500 hover:bg-gray-600">Abbrechen</Button>
          <Button onClick={handleApply} className="bg-blue-600 hover:bg-blue-700">Anwenden</Button>
        </div>
      </Card>
    </div>,
    document.body
  );
};