import React, { useState, useEffect } from 'react';
import type { AbsenceRequest, Employee, TimeEntry, CompanySettings } from '../types';
import { AbsenceType } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Card } from './ui/Card';
import { CalendarModal } from './ui/CalendarModal';
import { DateSelectorButton } from './ui/DateSelectorButton';
import { XIcon } from './icons/XIcon';
import { InfoModal } from './ui/InfoModal';
import { RadioGroup } from './ui/RadioGroup';

interface AbsenceRequestModalProps {
  currentUser: Employee;
  onSubmit: (request: Omit<AbsenceRequest, 'id' | 'status'>) => void;
  isOpen: boolean;
  onClose: () => void;
  existingAbsences: AbsenceRequest[];
  timeEntries: TimeEntry[];
  companySettings: CompanySettings;
}

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export const AbsenceRequestModal: React.FC<AbsenceRequestModalProps> = ({ currentUser, onSubmit, isOpen, onClose, existingAbsences, timeEntries, companySettings }) => {
  const [type, setType] = useState<AbsenceType>(AbsenceType.Vacation);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dayPortion, setDayPortion] = useState<'full' | 'am' | 'pm'>('full');
  const [photo, setPhoto] = useState<File | undefined>();
  const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);
  const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '' });

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

  if (!isOpen) return null;

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

    onSubmit(requestData);
    onClose();
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

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-30 p-4" onClick={onClose}>
        <Card className="w-full max-w-lg relative" onClick={(e) => e.stopPropagation()}>
           <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
             <XIcon className="h-6 w-6" />
           </button>
          <h2 className="text-xl font-bold text-center mb-4">Neuer Antrag</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select label="Antragstyp" value={type} onChange={(e) => setType(e.target.value as AbsenceType)}>
              <option value={AbsenceType.Vacation}>Urlaub</option>
              <option value={AbsenceType.SickLeave}>Krankmeldung</option>
              <option value={AbsenceType.TimeOff}>Freizeitausgleich</option>
            </Select>
            
            {type === AbsenceType.Vacation && companySettings.allowHalfDayVacations && (
              <RadioGroup
                name="dayPortion"
                label="Dauer"
                options={[
                    { value: 'full', label: 'Ganzer Tag' },
                    { value: 'am', label: 'Vormittags (halber Tag)' },
                    { value: 'pm', label: 'Nachmittags (halber Tag)' },
                ]}
                selectedValue={dayPortion}
                onChange={(value) => setDayPortion(value as 'full' | 'am' | 'pm')}
              />
            )}

            <DateSelectorButton
                label="Zeitraum"
                value={startDate && endDate ? `${formatDate(startDate)} - ${formatDate(endDate)}` : ''}
                onClick={() => setIsRangePickerOpen(true)}
                placeholder="Zeitraum auswählen..."
            />

            {type === AbsenceType.SickLeave && (
              <Input id="photo-upload" label="Foto hochladen (z.B. Krankenschein)" type="file" onChange={handleFileChange} />
            )}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600">Abbrechen</Button>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Antrag einreichen</Button>
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
    </>
  );
};
