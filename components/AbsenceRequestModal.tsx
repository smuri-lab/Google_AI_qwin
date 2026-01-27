import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { AbsenceRequest, Employee, TimeEntry, CompanySettings, HolidaysByYear, Holiday, WeeklySchedule } from '../types';
import { AbsenceType, TargetHoursModel } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { CalendarModal } from './ui/CalendarModal';
import { DateSelectorButton } from './ui/DateSelectorButton';
import { XIcon } from './icons/XIcon';
import { InfoModal } from './ui/InfoModal';
import { Select } from './ui/Select';
import { VacationSunIcon } from './icons/VacationSunIcon';
import { SickFaceIcon } from './icons/SickFaceIcon';
import { ClockIcon } from './icons/ClockIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { getContractDetailsForDate, formatHoursAndMinutes } from './utils';


interface AbsenceRequestModalProps {
  currentUser: Employee;
  onSubmit: (request: Omit<AbsenceRequest, 'id' | 'status'>) => void;
  isOpen: boolean;
  onClose: () => void;
  existingAbsences: AbsenceRequest[];
  timeEntries: TimeEntry[];
  companySettings: CompanySettings;
  holidaysByYear: HolidaysByYear;
  onEnsureHolidaysForYear: (year: number) => void;
  vacationDaysLeft: number;
  timeBalanceHours: number;
}

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export const AbsenceRequestModal: React.FC<AbsenceRequestModalProps> = ({ currentUser, onSubmit, isOpen, onClose, existingAbsences, timeEntries, companySettings, holidaysByYear, onEnsureHolidaysForYear, vacationDaysLeft, timeBalanceHours }) => {
  const [type, setType] = useState<AbsenceType>(AbsenceType.Vacation);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dayPortion, setDayPortion] = useState<'full' | 'am' | 'pm'>('full');
  const [photo, setPhoto] = useState<File | undefined>();
  const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);
  const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '' });
  const [isClosing, setIsClosing] = useState(false);
  const [timeOffHours, setTimeOffHours] = useState<number | null>(null);
  
  // Reset form on open
  useEffect(() => {
    if (isOpen) {
        setType(AbsenceType.Vacation);
        setStartDate('');
        setEndDate('');
        setDayPortion('full');
        setPhoto(undefined);
    }
  }, [isOpen]);

  useEffect(() => {
    if (dayPortion !== 'full' && startDate) {
      setEndDate(startDate);
    }
  }, [dayPortion, startDate]);

  useEffect(() => {
    if (type !== AbsenceType.TimeOff || !startDate || !endDate) {
        setTimeOffHours(null);
        return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    onEnsureHolidaysForYear(start.getFullYear());
    if (start.getFullYear() !== end.getFullYear()) {
        onEnsureHolidaysForYear(end.getFullYear());
    }

    const holidaysForStartYear = holidaysByYear[start.getFullYear()] || [];
    const holidaysForEndYear = holidaysByYear[end.getFullYear()] || [];
    const holidayDates = new Set([
        ...holidaysForStartYear.map(h => h.date),
        ...holidaysForEndYear.map(h => h.date)
    ]);
    
    let totalHours = 0;
    const loopDate = new Date(start);

    while(loopDate <= end) {
        const dateString = loopDate.toLocaleDateString('sv-SE');
        const dayOfWeek = loopDate.getDay();
        
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateString)) {
            const contract = getContractDetailsForDate(currentUser, loopDate);
            let dailyScheduledHours = 0;

            if (contract.targetHoursModel === TargetHoursModel.Weekly && contract.weeklySchedule) {
                const dayKeys: (keyof WeeklySchedule)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                dailyScheduledHours = contract.weeklySchedule[dayKeys[dayOfWeek]] || 0;
            } else {
                dailyScheduledHours = contract.dailyTargetHours;
            }
            totalHours += dailyScheduledHours;
        }
        loopDate.setDate(loopDate.getDate() + 1);
    }
    
    setTimeOffHours(totalHours);

  }, [type, startDate, endDate, currentUser, holidaysByYear, onEnsureHolidaysForYear]);
  
  if (!isOpen) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !startDate || !endDate) {
      setInfoModal({ isOpen: true, title: 'Unvollständige Eingabe', message: 'Bitte füllen Sie alle erforderlichen Felder aus.' });
      return;
    }
    const newStart = new Date(startDate);
    const newEnd = new Date(endDate);
    
    if (newStart > newEnd) {
        setInfoModal({ isOpen: true, title: 'Ungültiger Zeitraum', message: 'Das Startdatum muss vor oder am Enddatum liegen.' });
        return;
    }

    const overlap = existingAbsences.find(req => {
        const existingStart = new Date(req.startDate);
        const existingEnd = new Date(req.endDate);
        return newStart <= existingEnd && newEnd >= existingStart;
    });

    if (overlap) {
        setInfoModal({ isOpen: true, title: 'Überlappender Antrag', message: 'Der beantragte Zeitraum überschneidet sich mit einem bestehenden Antrag.' });
        return;
    }

    const timeEntryConflict = timeEntries.find(entry => {
        const entryDate = new Date(entry.start).toLocaleDateString('sv-SE');
        return entryDate >= startDate && entryDate <= endDate;
    });

    if (timeEntryConflict) {
        setInfoModal({ isOpen: true, title: 'Konflikt bei Abwesenheit', message: 'Für den beantragten Zeitraum existieren bereits Zeiteinträge. Bitte löschen Sie diese zuerst.' });
        return;
    }

    const requestData: Omit<AbsenceRequest, 'id' | 'status'> = { 
        employeeId: currentUser.id, 
        type, 
        startDate, 
        endDate, 
        photo,
        dayPortion: type === AbsenceType.Vacation ? dayPortion : 'full'
    };

    // Close logic
    setIsClosing(true);
    setTimeout(() => {
        onSubmit(requestData);
    }, 300);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPhoto(e.target.files[0]);
    }
  };
  
  const handleRangeSelect = (range: { start: string, end: string }) => {
    setStartDate(range.start);
    setEndDate(range.end);
    setIsRangePickerOpen(false);
  };
  
  const handleSingleDateSelect = (date: Date) => {
    const dateString = date.toLocaleDateString('sv-SE');
    setStartDate(dateString);
    setEndDate(dateString);
    setIsRangePickerOpen(false);
  };
  
  const submitButtonColors = {
    [AbsenceType.Vacation]: 'bg-yellow-500 hover:bg-yellow-600',
    [AbsenceType.SickLeave]: 'bg-orange-500 hover:bg-orange-600',
    [AbsenceType.TimeOff]: 'bg-green-600 hover:bg-green-700',
  };
  const submitButtonClass = submitButtonColors[type] || 'bg-blue-600 hover:bg-blue-700';

  return ReactDOM.createPortal(
    <>
      <div className={`fixed inset-0 bg-black flex items-center justify-center z-[100] p-4 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
        <Card className={`w-full max-w-lg relative ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={(e) => e.stopPropagation()}>
           <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
             <XIcon className="h-6 w-6" />
           </button>
          <h2 className="text-xl font-bold text-center mb-4">Neuer Antrag</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <button
                    type="button"
                    onClick={() => setType(AbsenceType.Vacation)}
                    className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all duration-200 ${
                        type === AbsenceType.Vacation
                        ? 'bg-yellow-50 border-yellow-500 ring-1 ring-yellow-500 shadow-sm'
                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                >
                    <VacationSunIcon className="h-6 w-6 mb-2" />
                    <span className={`text-xs font-semibold ${type === AbsenceType.Vacation ? 'text-yellow-700' : 'text-gray-700'}`}>Urlaub</span>
                </button>

                <button
                    type="button"
                    onClick={() => setType(AbsenceType.SickLeave)}
                    className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all duration-200 ${
                        type === AbsenceType.SickLeave
                        ? 'bg-orange-50 border-orange-500 ring-1 ring-orange-500 shadow-sm'
                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                >
                    <SickFaceIcon className={`h-6 w-6 mb-2 ${type === AbsenceType.SickLeave ? 'text-orange-600' : 'text-orange-500'}`} />
                    <span className={`text-xs font-semibold ${type === AbsenceType.SickLeave ? 'text-orange-700' : 'text-gray-700'}`}>Krankheit</span>
                </button>

                <button
                    type="button"
                    onClick={() => setType(AbsenceType.TimeOff)}
                    className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all duration-200 ${
                        type === AbsenceType.TimeOff
                        ? 'bg-green-50 border-green-500 ring-1 ring-green-500 shadow-sm'
                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                >
                    <ClockIcon className={`h-6 w-6 mb-2 ${type === AbsenceType.TimeOff ? 'text-green-600' : 'text-green-500'}`} />
                    <span className={`text-xs font-semibold text-center leading-tight ${type === AbsenceType.TimeOff ? 'text-green-700' : 'text-gray-700'}`}>Freizeit- ausgleich</span>
                </button>
            </div>
            
            {type === AbsenceType.Vacation && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 text-center">
                    Verfügbarer Urlaub: <span className="font-bold text-green-600">{vacationDaysLeft.toLocaleString('de-DE')} Tage</span>
                </div>
            )}

            {type === AbsenceType.TimeOff && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 text-center">
                    Aktuelles Stundenkonto: <span className={`font-bold ${timeBalanceHours >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatHoursAndMinutes(timeBalanceHours, 'hoursMinutes')}</span>
                </div>
            )}
            
            {type === AbsenceType.Vacation && companySettings.allowHalfDayVacations && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dauer</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'full', label: 'Ganzer Tag' },
                    { value: 'am', label: 'Vormittag' },
                    { value: 'pm', label: 'Nachmittag' },
                  ].map(option => (
                    <label key={option.value} className={`flex items-center justify-center p-3 border rounded-md cursor-pointer transition-colors text-center text-sm ${
                      dayPortion === option.value
                        ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400 font-semibold'
                        : 'hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="dayPortion"
                        value={option.value}
                        checked={dayPortion === option.value}
                        onChange={(e) => setDayPortion(e.target.value as 'full' | 'am' | 'pm')}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <DateSelectorButton
                label="Zeitraum"
                value={startDate && endDate ? `${formatDate(startDate)} - ${formatDate(endDate)}` : ''}
                onClick={() => setIsRangePickerOpen(true)}
                placeholder="Auswählen..."
            />
            
            {type === AbsenceType.TimeOff && timeOffHours !== null && timeOffHours > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-3 text-sm text-blue-800">
                    <InformationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <p>
                        Basierend auf Ihrer Soll-Arbeitszeit entspricht dieser Zeitraum <span className="font-bold">{timeOffHours.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Stunden</span> Freizeitausgleich.
                    </p>
                </div>
            )}

            {type === AbsenceType.SickLeave && (
              <Input id="photo-upload" label="Foto hochladen (z.B. Krankenschein)" type="file" onChange={handleFileChange} />
            )}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" onClick={handleClose} className="bg-gray-500 hover:bg-gray-600">Abbrechen</Button>
              <Button type="submit" className={`w-full ${submitButtonClass}`}>Antrag einreichen</Button>
            </div>
          </form>
        </Card>
      </div>
      
      <InfoModal
        isOpen={infoModal.isOpen}
        onClose={() => setInfoModal({ isOpen: false, title: '', message: '' })}
        title={infoModal.title}
        message={infoModal.message}
      />

      <CalendarModal
        isOpen={isRangePickerOpen}
        onClose={() => setIsRangePickerOpen(false)}
        onSelectRange={handleRangeSelect}
        onSelectDate={handleSingleDateSelect}
        title="Zeitraum auswählen"
        selectionMode={type === AbsenceType.Vacation && dayPortion !== 'full' ? 'single' : 'range'}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />
    </>,
    document.body
  );
};