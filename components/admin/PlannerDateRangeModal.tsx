import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { XIcon } from '../icons/XIcon';

export type Preset = '2w' | '3w' | '4w' | 'month';

interface PlannerDateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (startDate: Date, endDate: Date, preset: Preset | null) => void;
  currentStartDate: Date;
  currentEndDate: Date;
}

const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
};

const checkDatesForPreset = (start: Date, end: Date): Preset | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startStr = start.toLocaleDateString('sv-SE');
    const endStr = end.toLocaleDateString('sv-SE');

    // Check weekly presets
    const startOfWeek = getStartOfWeek(today);
    const testEnd2w = new Date(startOfWeek); testEnd2w.setDate(startOfWeek.getDate() + 13);
    const testEnd3w = new Date(startOfWeek); testEnd3w.setDate(startOfWeek.getDate() + 20);
    const testEnd4w = new Date(startOfWeek); testEnd4w.setDate(startOfWeek.getDate() + 27);

    const startOfWeekStr = startOfWeek.toLocaleDateString('sv-SE');
    if (startStr === startOfWeekStr) {
        if (endStr === testEnd2w.toLocaleDateString('sv-SE')) return '2w';
        if (endStr === testEnd3w.toLocaleDateString('sv-SE')) return '3w';
        if (endStr === testEnd4w.toLocaleDateString('sv-SE')) return '4w';
    }

    // Check monthly preset
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    if (startStr === startOfMonth.toLocaleDateString('sv-SE') && endStr === endOfMonth.toLocaleDateString('sv-SE')) {
        return 'month';
    }

    return null;
};

export const PlannerDateRangeModal: React.FC<PlannerDateRangeModalProps> = ({
  isOpen,
  onClose,
  onApply,
  currentStartDate,
  currentEndDate,
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activePreset, setActivePreset] = useState<Preset | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const startStr = currentStartDate.toLocaleDateString('sv-SE');
      const endStr = currentEndDate.toLocaleDateString('sv-SE');
      setStartDate(startStr);
      setEndDate(endStr);
      setActivePreset(checkDatesForPreset(currentStartDate, currentEndDate));
      setIsClosing(false);
    }
  }, [isOpen, currentStartDate, currentEndDate]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  if (!isOpen) return null;

  const handleApply = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      alert('Das Startdatum darf nicht nach dem Enddatum liegen.');
      return;
    }
    setIsClosing(true);
    setTimeout(() => {
        onApply(start, end, activePreset);
    }, 300);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDateStr = e.target.value;
    setStartDate(newStartDateStr);
    setActivePreset(checkDatesForPreset(new Date(newStartDateStr), new Date(endDate)));
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDateStr = e.target.value;
    setEndDate(newEndDateStr);
    setActivePreset(checkDatesForPreset(new Date(startDate), new Date(newEndDateStr)));
  };

  const handleSetPreset = (preset: Preset) => {
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (preset) {
        case '2w':
            start = getStartOfWeek(today);
            end = new Date(start);
            end.setDate(start.getDate() + 13);
            break;
        case '3w':
            start = getStartOfWeek(today);
            end = new Date(start);
            end.setDate(start.getDate() + 20);
            break;
        case '4w':
            start = getStartOfWeek(today);
            end = new Date(start);
            end.setDate(start.getDate() + 27);
            break;
        case 'month':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
    }
    setStartDate(start.toLocaleDateString('sv-SE'));
    setEndDate(end.toLocaleDateString('sv-SE'));
    setActivePreset(preset);
  };

  const getButtonClass = (preset: Preset) => {
    const baseClass = "px-3 py-2 text-sm font-semibold rounded-md transition-colors";
    if (activePreset === preset) {
        return `${baseClass} bg-blue-600 text-white hover:bg-blue-700`;
    }
    return `${baseClass} bg-gray-100 text-gray-800 hover:bg-gray-200`;
  };

  return (
    <div className={`fixed inset-0 bg-black flex items-center justify-center z-40 p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
      <Card className={`w-full max-w-md ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Zeitraum anpassen</h2>
          <button onClick={handleClose} className="p-1 rounded-full hover:bg-gray-100"><XIcon className="h-6 w-6" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Startdatum"
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
            />
            <Input
              label="Enddatum"
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Schnellauswahl</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button onClick={() => handleSetPreset('2w')} className={getButtonClass('2w')}>2 Wochen</button>
                <button onClick={() => handleSetPreset('3w')} className={getButtonClass('3w')}>3 Wochen</button>
                <button onClick={() => handleSetPreset('4w')} className={getButtonClass('4w')}>4 Wochen</button>
                <button onClick={() => handleSetPreset('month')} className={getButtonClass('month')}>Akt. Monat</button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 mt-6 border-t">
          <Button onClick={handleClose} className="bg-gray-500 hover:bg-gray-600">Abbrechen</Button>
          <Button onClick={handleApply} className="bg-blue-600 hover:bg-blue-700">Anwenden</Button>
        </div>
      </Card>
    </div>
  );
};