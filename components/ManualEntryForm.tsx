import React, { useState, useEffect } from 'react';
import type { TimeEntry, Customer, Activity, CompanySettings, AbsenceRequest } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { SelectionModal } from './ui/SelectionModal';
import { SelectorButton } from './ui/SelectorButton';
import { CalendarModal } from './ui/CalendarModal';
import { TimePickerModal } from './ui/TimePickerModal';
import { DateSelectorButton } from './ui/DateSelectorButton';
import { TimeSelectorButton } from './ui/TimeSelectorButton';
import { Textarea } from './ui/Textarea';
import { InfoModal } from './ui/InfoModal';

interface ManualEntryFormProps {
  addTimeEntry: (entry: Omit<TimeEntry, 'id' | 'employeeId'>) => void;
  timeEntries: TimeEntry[];
  customers: Customer[];
  activities: Activity[];
  absenceRequests: AbsenceRequest[];
  onCancel?: () => void;
  initialDate?: string | null;
  companySettings: CompanySettings;
  onSuccess?: () => void;
}

const isOverlapping = (newStart: Date, newEnd: Date, existingEntries: TimeEntry[]): boolean => {
  const newStartTime = newStart.getTime();
  const newEndTime = newEnd.getTime();

  for (const entry of existingEntries) {
    if (newStart.toDateString() !== new Date(entry.start).toDateString()) {
        continue; // Only check entries on the same day
    }
    const existingStartTime = new Date(entry.start).getTime();
    const existingEndTime = new Date(entry.end).getTime();
    if (newStartTime < existingEndTime && newEndTime > existingStartTime) {
      return true;
    }
  }
  return false;
};

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export const ManualEntryForm: React.FC<ManualEntryFormProps> = ({ addTimeEntry, timeEntries, customers, activities, absenceRequests, onCancel, initialDate, companySettings, onSuccess }) => {
  const [date, setDate] = useState(initialDate || new Date().toLocaleDateString('sv-SE'));
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakDurationMinutes, setBreakDurationMinutes] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [activityId, setActivityId] = useState('');
  const [comment, setComment] = useState('');
  
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isStartTimePickerOpen, setIsStartTimePickerOpen] = useState(false);
  const [isEndTimePickerOpen, setIsEndTimePickerOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '' });
  
  const customerLabel = companySettings.customerLabel || 'Zeitkategorie 1';
  const activityLabel = companySettings.activityLabel || 'Zeitkategorie 2';


  useEffect(() => {
    setDate(initialDate || new Date().toLocaleDateString('sv-SE'));
  }, [initialDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !activityId || !date || !startTime || !endTime) {
      setInfoModal({ isOpen: true, title: 'Unvollständige Eingabe', message: 'Bitte füllen Sie alle erforderlichen Felder aus.' });
      return;
    }

    const existingAbsence = absenceRequests.find(req => 
        req.status !== 'rejected' &&
        date >= req.startDate &&
        date <= req.endDate
    );

    if (existingAbsence) {
        setInfoModal({ isOpen: true, title: 'Konflikt bei Zeiterfassung', message: 'An diesem Tag liegt eine genehmigte oder beantragte Abwesenheit vor. Es kann keine Arbeitszeit erfasst werden.' });
        return;
    }

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    if (startDateTime >= endDateTime) {
        setInfoModal({ isOpen: true, title: 'Ungültige Zeit', message: 'Die Endzeit muss nach der Startzeit liegen.' });
        return;
    }
    
    if (isOverlapping(startDateTime, endDateTime, timeEntries)) {
        setInfoModal({ isOpen: true, title: 'Überlappender Eintrag', message: 'Dieser Zeiteintrag überschneidet sich mit einem bestehenden Eintrag. Bitte korrigieren Sie die Zeiten.' });
        return;
    }

    addTimeEntry({
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      customerId,
      activityId,
      breakDurationMinutes: Number(breakDurationMinutes) || 0,
      type: 'manual',
      comment: comment || undefined,
    });

    onSuccess?.();
    
    if (onCancel) {
      onCancel();
    } else {
      setDate(new Date().toLocaleDateString('sv-SE'));
      setStartTime('08:00');
      setEndTime('17:00');
      setBreakDurationMinutes('');
      setCustomerId('');
      setActivityId('');
      setComment('');
    }
  };
  
  const handleDateSelect = (selectedDate: Date) => {
    setDate(selectedDate.toLocaleDateString('sv-SE'));
    setIsDatePickerOpen(false);
  };

  const handleStartTimeSelect = (time: string) => {
    setStartTime(time);
    if (endTime && time >= endTime) {
      setEndTime('');
    }
    setIsStartTimePickerOpen(false);
    setTimeout(() => setIsEndTimePickerOpen(true), 100);
  };

  const handleEndTimeSelect = (time: string) => {
    setEndTime(time);
    setIsEndTimePickerOpen(false);
  };
  
  const handleBackToStartTime = () => {
      setIsEndTimePickerOpen(false);
      setTimeout(() => setIsStartTimePickerOpen(true), 100);
  };

  const selectedCustomerName = customers.find(c => c.id === customerId)?.name || '';
  const selectedActivityName = activities.find(a => a.id === activityId)?.name || '';

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-2 p-4">
        <h2 className="text-xl font-bold text-center mb-4">Zeit manuell eintragen</h2>
        
        <div className="min-h-[4.5rem]">
            <DateSelectorButton 
                label="Datum"
                value={formatDate(date)}
                onClick={() => setIsDatePickerOpen(true)}
                placeholder="Datum auswählen..."
            />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <div className="min-h-[4.5rem]">
                <TimeSelectorButton
                    label="Startzeit"
                    value={startTime}
                    onClick={() => setIsStartTimePickerOpen(true)}
                    placeholder="Start"
                />
            </div>
            <div className="min-h-[4.5rem]">
                <TimeSelectorButton
                    label="Endzeit"
                    value={endTime}
                    onClick={() => setIsEndTimePickerOpen(true)}
                    placeholder="Ende"
                    disabled={!startTime}
                />
            </div>
        </div>

        <div className="min-h-[4.5rem]">
          <Input label="Pause (Minuten)" type="number" value={breakDurationMinutes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBreakDurationMinutes(e.target.value)} min="0" placeholder="z.B. 30" />
        </div>
        
        <div className="min-h-[4.5rem]">
            <SelectorButton
                label={customerLabel}
                value={selectedCustomerName}
                placeholder={`${customerLabel} auswählen...`}
                onClick={() => setIsCustomerModalOpen(true)}
            />
        </div>
        <div className="min-h-[4.5rem]">
            <SelectorButton
                label={activityLabel}
                value={selectedActivityName}
                placeholder={`${activityLabel} auswählen...`}
                onClick={() => setIsActivityModalOpen(true)}
            />
        </div>
        <div className="min-h-[6.5rem]">
            <Textarea
                label="Kommentar (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
            />
        </div>
        <div className={`pt-4 ${onCancel ? 'grid grid-cols-2 gap-4' : 'flex'}`}>
          {onCancel && (
            <Button type="button" onClick={onCancel} className="w-full bg-gray-500 hover:bg-gray-600">
              Abbrechen
            </Button>
          )}
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
            Speichern
          </Button>
        </div>
      </form>
      
      <InfoModal
        isOpen={infoModal.isOpen}
        onClose={() => setInfoModal({ isOpen: false, title: '', message: '' })}
        title={infoModal.title}
        message={infoModal.message}
      />
      
      <CalendarModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onSelectDate={handleDateSelect}
        title="Datum auswählen"
        initialStartDate={date}
        selectionMode="single"
      />
      <TimePickerModal
        isOpen={isStartTimePickerOpen}
        onClose={() => setIsStartTimePickerOpen(false)}
        onSelect={handleStartTimeSelect}
        title="Startzeit auswählen"
        initialTime={startTime}
      />
       <TimePickerModal
        isOpen={isEndTimePickerOpen}
        onClose={() => setIsEndTimePickerOpen(false)}
        onSelect={handleEndTimeSelect}
        title="Endzeit auswählen"
        initialTime={endTime || startTime}
        minTime={startTime}
        showBackButton={true}
        onBack={handleBackToStartTime}
      />
      
      <SelectionModal
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          onSelect={(item) => setCustomerId(item.id)}
          items={customers}
          title={`${customerLabel} auswählen`}
          selectedValue={customerId}
      />
      <SelectionModal
          isOpen={isActivityModalOpen}
          onClose={() => setIsActivityModalOpen(false)}
          onSelect={(item) => setActivityId(item.id)}
          items={activities}
          title={`${activityLabel} auswählen`}
          selectedValue={activityId}
      />
    </>
  );
};
