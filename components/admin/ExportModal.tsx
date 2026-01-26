import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { Employee } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { XIcon } from '../icons/XIcon';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (employee: Employee, year: number, month: number) => void;
  employee: Employee;
}

const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const getYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
        years.push(currentYear - i);
    }
    return years;
};

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onConfirm, employee }) => {
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  
  const [selectedYear, setSelectedYear] = useState(lastMonth.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(lastMonth.getMonth());
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setIsClosing(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsClosing(true);
    setTimeout(() => {
        onConfirm(employee, selectedYear, selectedMonth);
    }, 300);
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className={`fixed inset-0 bg-black flex items-center justify-center z-30 p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
      <Card className={`w-full max-w-md relative ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={(e) => e.stopPropagation()}>
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
          <XIcon className="h-6 w-6" />
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-xl font-bold text-center">Stundenzettel exportieren</h2>
          <p className="text-center text-sm text-gray-600">
            Wählen Sie den Monat für den Export für <span className="font-semibold">{employee.firstName} {employee.lastName}</span>.
          </p>
          
          <div className="grid grid-cols-2 gap-4 pt-2">
            <Select label="Monat" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
              {months.map((month, index) => <option key={index} value={index}>{month}</option>)}
            </Select>
            <Select label="Jahr" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
              {getYears().map(year => <option key={year} value={year}>{year}</option>)}
            </Select>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t mt-4">
            <Button type="button" onClick={handleClose} className="bg-gray-500 hover:bg-gray-600">Abbrechen</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Exportieren</Button>
          </div>
        </form>
      </Card>
    </div>,
    document.body
  );
};