import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { Employee } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { XIcon } from '../icons/XIcon';
import { SelectorButton } from '../ui/SelectorButton';
import { EmployeeMultiSelectModal } from './EmployeeMultiSelectModal';

interface TimesheetExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (employees: Employee[], year: number, months: number[], format: 'excel' | 'pdf') => void;
  employees: Employee[];
  fixedEmployee?: Employee; 
}

const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const monthItems = months.map((m, i) => ({ id: i, name: m }));

const getYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
        years.push(currentYear - i);
    }
    return years;
};

export const TimesheetExportModal: React.FC<TimesheetExportModalProps> = ({ isOpen, onClose, onConfirm, employees, fixedEmployee }) => {
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(fixedEmployee ? [String(fixedEmployee.id)] : []);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([lastMonth.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(lastMonth.getFullYear());
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [isClosing, setIsClosing] = useState(false);
  
  const [isEmployeeSelectOpen, setIsEmployeeSelectOpen] = useState(false);
  const [isMonthSelectOpen, setIsMonthSelectOpen] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      if (fixedEmployee) {
        setSelectedEmployeeIds([String(fixedEmployee.id)]);
      } else {
        setSelectedEmployeeIds([]);
      }
      setSelectedMonths([lastMonth.getMonth()]);
      setSelectedYear(lastMonth.getFullYear());
      setFormat('excel');
      setIsClosing(false);
    }
  }, [isOpen, fixedEmployee]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  if (!isOpen) return null;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const employeesToExport = employees.filter(e => selectedEmployeeIds.includes(String(e.id)));
    
    if (employeesToExport.length === 0) {
        alert("Bitte wählen Sie mindestens einen Mitarbeiter aus.");
        return;
    }
    if (selectedMonths.length === 0) {
        alert("Bitte wählen Sie mindestens einen Monat aus.");
        return;
    }
    
    setIsClosing(true);
    setTimeout(() => {
        onConfirm(employeesToExport, selectedYear, selectedMonths, format);
    }, 300);
  };

  const getEmployeeSelectorLabel = () => {
      if (selectedEmployeeIds.length === 0) return 'Keine Mitarbeiter ausgewählt';
      if (selectedEmployeeIds.length === employees.length) return 'Alle Mitarbeiter';
      if (selectedEmployeeIds.length === 1) {
          const emp = employees.find(e => String(e.id) === selectedEmployeeIds[0]);
          return emp ? `${emp.firstName} ${emp.lastName}` : '1 Mitarbeiter';
      }
      return `${selectedEmployeeIds.length} Mitarbeiter ausgewählt`;
  };

  const getMonthSelectorLabel = () => {
      if (selectedMonths.length === 0) return 'Keine Monate ausgewählt';
      if (selectedMonths.length === 12) return 'Ganzes Jahr (12 Monate)';
      if (selectedMonths.length === 1) return months[selectedMonths[0]];
      
      // Sort months to check for consecutive ranges could be added here, but count is sufficient
      return `${selectedMonths.length} Monate ausgewählt`;
  };

  return ReactDOM.createPortal(
    <div className={`fixed inset-0 bg-black flex items-center justify-center z-30 p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
      <Card className={`w-full max-w-lg relative ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={(e) => e.stopPropagation()}>
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
          <XIcon className="h-6 w-6" />
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-xl font-bold text-center">Stundenzettel exportieren</h2>
          
          <div className="space-y-4">
            {!fixedEmployee && (
              <div>
                <SelectorButton 
                    label="Mitarbeiter" 
                    value={getEmployeeSelectorLabel()} 
                    onClick={() => setIsEmployeeSelectOpen(true)} 
                    placeholder="Mitarbeiter auswählen..."
                />
              </div>
            )}

             <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Zeitraum</label>
              <div className="space-y-4">
                <div>
                    <Select label="Jahr" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                        {getYears().map(year => <option key={year} value={year}>{year}</option>)}
                    </Select>
                </div>
                <div>
                    <SelectorButton 
                        label="Monate" 
                        value={getMonthSelectorLabel()} 
                        onClick={() => setIsMonthSelectOpen(true)} 
                        placeholder="Monate auswählen..."
                    />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
              <div className="flex gap-4">
                <label className="flex flex-1 items-center p-3 border rounded-md has-[:checked]:bg-blue-50 has-[:checked]:border-blue-300 cursor-pointer transition-colors">
                    <input type="radio" name="exportFormat" value="excel" checked={format === 'excel'} onChange={() => setFormat('excel')} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                    <span className="ml-3 text-sm text-gray-700">Excel (.xlsx)</span>
                </label>
                <label className="flex flex-1 items-center p-3 border rounded-md has-[:checked]:bg-blue-50 has-[:checked]:border-blue-300 cursor-pointer transition-colors">
                    <input type="radio" name="exportFormat" value="pdf" checked={format === 'pdf'} onChange={() => setFormat('pdf')} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                    <span className="ml-3 text-sm text-gray-700">PDF (.pdf)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t mt-4">
            <Button type="button" onClick={handleClose} className="bg-gray-500 hover:bg-gray-600">Abbrechen</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Exportieren</Button>
          </div>
        </form>
      </Card>
      
      {!fixedEmployee && (
          <EmployeeMultiSelectModal
            isOpen={isEmployeeSelectOpen}
            onClose={() => setIsEmployeeSelectOpen(false)}
            onApply={(ids) => {
                setSelectedEmployeeIds(ids.map(String));
                setIsEmployeeSelectOpen(false);
            }}
            employees={employees}
            selectedEmployeeIds={selectedEmployeeIds.map(Number)}
          />
      )}

      <EmployeeMultiSelectModal
        isOpen={isMonthSelectOpen}
        onClose={() => setIsMonthSelectOpen(false)}
        onApply={(ids) => {
            setSelectedMonths(ids.map(id => Number(id)));
            setIsMonthSelectOpen(false);
        }}
        items={monthItems}
        selectedItemIds={selectedMonths}
        title="Monate auswählen"
      />
    </div>,
    document.body
  );
};