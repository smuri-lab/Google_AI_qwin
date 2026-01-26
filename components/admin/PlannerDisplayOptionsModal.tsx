import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import type { Employee } from '../../types';
import { EmploymentType } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { XIcon } from '../icons/XIcon';
import { Input } from '../ui/Input';
import { getContractDetailsForDate } from '../utils';

interface PlannerDisplayOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (options: { visibleEmployeeIds: number[] }) => void;
  employees: Employee[];
  currentOptions: { visibleEmployeeIds: number[] };
  isRotated?: boolean;
}

export const PlannerDisplayOptionsModal: React.FC<PlannerDisplayOptionsModalProps> = ({ isOpen, onClose, onApply, employees, currentOptions, isRotated = false }) => {
  const [selectedIds, setSelectedIds] = useState(new Set<number>());
  const [searchTerm, setSearchTerm] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(currentOptions.visibleEmployeeIds));
      setSearchTerm('');
      setIsClosing(false);
    }
  }, [isOpen, currentOptions.visibleEmployeeIds]);

  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return employees;
    return employees.filter(emp => `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [employees, searchTerm]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  if (!isOpen) return null;

  const handleSelectionChange = (employeeId: number) => {
    const newIds = new Set(selectedIds);
    if (newIds.has(employeeId)) newIds.delete(employeeId); else newIds.add(employeeId);
    setSelectedIds(newIds);
  };

  const handleSelectAll = () => setSelectedIds(new Set(employees.map(e => e.id)));
  const handleDeselectAll = () => setSelectedIds(new Set());
  
  const handleSelectByEmploymentType = (type: EmploymentType) => {
    const today = new Date();
    const newIds = employees.filter(emp => getContractDetailsForDate(emp, today).employmentType === type).map(emp => emp.id);
    setSelectedIds(new Set(newIds));
  };

  const handleApply = () => {
    setIsClosing(true);
    setTimeout(() => {
        onApply({ visibleEmployeeIds: Array.from(selectedIds) });
    }, 300);
  };

  const containerClass = isRotated
    ? `fixed top-0 left-0 w-[100vh] h-[100vw] origin-top-left rotate-90 translate-x-[100vw] flex items-center justify-center z-[250] p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`
    : `fixed inset-0 bg-black flex items-center justify-center z-[250] p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`;

  return ReactDOM.createPortal(
    <div className={containerClass} onClick={handleClose}>
      <Card className={`w-full max-w-lg ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Anzeigeoptionen für Planer</h2>
          <button onClick={handleClose} className="p-1 rounded-full hover:bg-gray-100"><XIcon className="h-6 w-6" /></button>
        </div>

        <div className="space-y-4">
          <Input label="Mitarbeiter suchen" type="text" placeholder="Name eingeben..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Schnellauswahl nach Anstellung</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button type="button" onClick={handleSelectAll} className="px-3 py-2 text-sm font-semibold text-gray-800 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">Alle</button>
              <button type="button" onClick={() => handleSelectByEmploymentType(EmploymentType.FullTime)} className="px-3 py-2 text-sm font-semibold text-gray-800 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">Vollzeit</button>
              <button type="button" onClick={() => handleSelectByEmploymentType(EmploymentType.PartTime)} className="px-3 py-2 text-sm font-semibold text-gray-800 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">Teilzeit</button>
              <button type="button" onClick={() => handleSelectByEmploymentType(EmploymentType.MiniJob)} className="px-3 py-2 text-sm font-semibold text-gray-800 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">Minijob</button>
            </div>
          </div>

          <fieldset>
            <div className="flex justify-between items-center mb-2">
                <legend className="text-base font-semibold text-gray-800">Mitarbeiter anzeigen</legend>
                <button type="button" onClick={handleDeselectAll} className="text-sm font-semibold text-blue-600 hover:underline">Alle abwählen</button>
            </div>
            <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
              {filteredEmployees.length > 0 ? filteredEmployees.map((emp) => (
                  <label key={emp.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={selectedIds.has(emp.id)} onChange={() => handleSelectionChange(emp.id)} />
                    <span>{emp.firstName} {emp.lastName}</span>
                  </label>
              )) : <p className="text-center text-gray-500 py-4">Keine Mitarbeiter gefunden.</p>}
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