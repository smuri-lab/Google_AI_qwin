import React, { useState, useEffect } from 'react';
import type { Employee } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { XIcon } from '../icons/XIcon';
import { RadioGroup } from '../ui/RadioGroup';

interface TimesheetExportModalProps {
  isOpen: boolean;
  isClosing?: boolean;
  onClose: () => void;
  onConfirm: (employees: Employee[], year: number, months: number[], format: 'excel' | 'pdf') => void;
  employees: Employee[];
  fixedEmployee?: Employee; 
}

const months = [
  "Januar", "Februar", "März", "April", "Mai", "Juni", 
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

const getYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
        years.push(currentYear - i);
    }
    return years;
};

export const TimesheetExportModal: React.FC<TimesheetExportModalProps> = ({ isOpen, isClosing, onClose, onConfirm, employees, fixedEmployee }) => {
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(fixedEmployee ? [String(fixedEmployee.id)] : []);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([lastMonth.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(lastMonth.getFullYear());
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  
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
    }
  }, [isOpen, fixedEmployee]);

  if (!isOpen) return null;
  
  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleMonthToggle = (monthIndex: number) => {
    setSelectedMonths(prev =>
      prev.includes(monthIndex)
        ? prev.filter(m => m !== monthIndex)
        : [...prev, monthIndex]
    );
  };

  const handleSelectAllEmployees = (select: boolean) => {
      if (select) {
          setSelectedEmployeeIds(employees.map(e => String(e.id)));
      } else {
          setSelectedEmployeeIds([]);
      }
  };

  const handleSelectAllMonths = (select: boolean) => {
      if (select) {
          setSelectedMonths(months.map((_, i) => i));
      } else {
          setSelectedMonths([]);
      }
  };

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
    
    onConfirm(employeesToExport, selectedYear, selectedMonths, format);
    // onClose is now called by the parent component's onConfirm handler
  };

  return (
    <div className={`fixed inset-0 bg-black flex items-center justify-center z-30 p-4 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={onClose}>
      <Card className={`w-full max-w-lg relative ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
          <XIcon className="h-6 w-6" />
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-xl font-bold text-center">Stundenzettel exportieren</h2>
          
          <div className="space-y-4">
            {!fixedEmployee && (
              <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Mitarbeiter</label>
                    <button type="button" onClick={() => handleSelectAllEmployees(selectedEmployeeIds.length !== employees.length)} className="text-xs font-semibold text-blue-600 hover:underline">
                        {selectedEmployeeIds.length !== employees.length ? 'Alle auswählen' : 'Alle abwählen'}
                    </button>
                </div>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                    {employees.map(emp => (
                        <label key={emp.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={selectedEmployeeIds.includes(String(emp.id))}
                                onChange={() => handleEmployeeToggle(String(emp.id))}
                            />
                            <span>{emp.firstName} {emp.lastName}</span>
                        </label>
                    ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Zeitraum</label>
              <div className="space-y-4">
                <div>
                    <Select
                        label="Jahr"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                    >
                        {getYears().map(year => (
                        <option key={year} value={year}>{year}</option>
                        ))}
                    </Select>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">Monate</label>
                       <button type="button" onClick={() => handleSelectAllMonths(selectedMonths.length !== 12)} className="text-xs font-semibold text-blue-600 hover:underline">
                        {selectedMonths.length !== 12 ? 'Alle auswählen' : 'Alle abwählen'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border rounded-md p-2">
                    {months.map((month, index) => (
                      <label key={index} className="flex items-center space-x-2 text-sm p-1 rounded hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedMonths.includes(index)}
                          onChange={() => handleMonthToggle(index)}
                        />
                        <span>{month}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
              <div className="flex gap-4">
                <label className="flex flex-1 items-center p-3 border rounded-md has-[:checked]:bg-blue-50 has-[:checked]:border-blue-300 cursor-pointer transition-colors">
                    <input
                        type="radio"
                        name="exportFormat"
                        value="excel"
                        checked={format === 'excel'}
                        onChange={() => setFormat('excel')}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">Excel (.xlsx)</span>
                </label>
                <label className="flex flex-1 items-center p-3 border rounded-md has-[:checked]:bg-blue-50 has-[:checked]:border-blue-300 cursor-pointer transition-colors">
                    <input
                        type="radio"
                        name="exportFormat"
                        value="pdf"
                        checked={format === 'pdf'}
                        onChange={() => setFormat('pdf')}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">PDF (.pdf)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t mt-4">
            <Button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600">
              Abbrechen
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Exportieren
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
