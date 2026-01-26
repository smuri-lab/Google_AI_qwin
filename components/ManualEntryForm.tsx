import React, { useState, useEffect } from 'react';
import type { TimeEntry, Customer, Activity, CompanySettings, AbsenceRequest } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { SelectionModal } from './ui/SelectionModal';
import { SelectorButton } from './ui/SelectorButton';
import { CalendarModal } from './ui/CalendarModal';
import { DateSelectorButton } from './ui/DateSelectorButton';
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
  isModal?: boolean;
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

export const ManualEntryForm: React.FC<ManualEntryFormProps> = ({ addTimeEntry, timeEntries, customers, activities, absenceRequests, onCancel, initialDate, companySettings, onSuccess, isModal = false }) => {
  const [date, setDate] = useState(initialDate || new Date().toLocaleDateString('sv-SE'));
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakDurationMinutes, setBreakDurationMinutes] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [activityId, setActivityId] = useState('');
  const [comment, setComment] = useState('');
  
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '' });
  
  const customerLabel = companySettings.customerLabel || 'Zeitkategorie 1';
  const activityLabel = companySettings.activityLabel || 'Zeitkategorie 2';


  useEffect(() => {
    setDate(initialDate || new Date().toLocaleDateString('sv-SE'));
  }, [initialDate]);

  // Logic to set Start Time based on previous entries
  useEffect(() => {
    const entriesForDate = timeEntries.filter(entry => 
        new Date(entry.start).toLocaleDateString('sv-SE') === date
    );

    if (entriesForDate.length > 0) {
        // Find the latest end time
        const sorted = [...entriesForDate].sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime());
        const lastEntry = sorted[0];
        const lastEnd = new Date(lastEntry.end);
        
        const hours = String(lastEnd.getHours()).padStart(2, '0');
        const minutes = String(lastEnd.getMinutes()).padStart(2, '0');
        const newStartTime = `${hours}:${minutes}`;
        
        setStartTime(newStartTime);

        // Adjust End Time if it is now before or equal to Start Time
        const [endH, endM] = endTime.split(':').map(Number);
        const [startH, startM] = newStartTime.split(':').map(Number);
        
        if (!isNaN(endH) && !isNaN(startH)) {
            const endVal = endH * 60 + endM;
            const startVal = startH * 60 + startM;
            
            if (endVal <= startVal) {
                // Default to +1 hour if overlap, capped at 23:59
                let newEndH = startH + 1;
                let newEndM = startM;
                if (newEndH > 23) { newEndH = 23; newEndM = 59; }
                setEndTime(`${String(newEndH).padStart(2, '0')}:${String(newEndM).padStart(2, '0')}`);
            }
        }
    } else {
        // Default for new day
        setStartTime('08:00');
        setEndTime('17:00');
    }
  }, [date, timeEntries]);

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
      // Keep the same date but reset times logic will trigger via useEffect when timeEntries updates
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

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setStartTime(newTime);
    if (endTime && newTime >= endTime) {
      setEndTime('');
    }
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndTime(e.target.value);
  };
  
  const selectedCustomerName = customers.find(c => c.id === customerId)?.name || '';
  const selectedActivityName = activities.find(a => a.id === activityId)?.name || '';

  const formContent = (
    <>
      <h2 className="text-xl font-bold text-center mb-4">Zeit manuell eintragen</h2>
      
      <DateSelectorButton 
          label="Datum"
          value={formatDate(date)}
          onClick={() => setIsDatePickerOpen(true)}
          placeholder="Datum auswählen..."
      />
      
      <div className="grid grid-cols-2 gap-4">
          <Input 
              label="Startzeit" 
              type="time" 
              value={startTime} 
              onChange={handleStartTimeChange} 
              required 
          />
          <Input 
              label="Endzeit" 
              type="time" 
              value={endTime} 
              onChange={handleEndTimeChange} 
              required 
              disabled={!startTime}
          />
      </div>

      <Input label="Pause (m)" type="number" value={breakDurationMinutes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBreakDurationMinutes(e.target.value)} min="0" placeholder="z.B. 30" />
      
      <SelectorButton
          label={customerLabel}
          value={selectedCustomerName}
          placeholder={`${customerLabel} auswählen...`}
          onClick={() => setIsCustomerModalOpen(true)}
      />
      <SelectorButton
          label={activityLabel}
          value={selectedActivityName}
          placeholder={`${activityLabel} auswählen...`}
          onClick={() => setIsActivityModalOpen(true)}
      />
      <Textarea
          label="Kommentar (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
      />
    </>
  );

  const formButtons = (
    <>
      {onCancel && (
        <Button type="button" onClick={onCancel} className="w-full bg-gray-500 hover:bg-gray-600 text-white">
          Abbrechen
        </Button>
      )}
      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
        Speichern
      </Button>
    </>
  );

  const modals = (
    <>
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

  if (isModal) {
    return (
        <>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="flex-grow min-h-0 overflow-y-auto p-4 space-y-4">
                    {formContent}
                </div>
                <div className={`flex-shrink-0 border-t p-4 ${onCancel ? 'grid grid-cols-2 gap-4' : 'flex'}`}>
                    {formButtons}
                </div>
            </form>
            {modals}
        </>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        {formContent}
        <div className={`pt-4 ${onCancel ? 'grid grid-cols-2 gap-4' : 'flex'}`}>
          {formButtons}
        </div>
      </form>
      {modals}
    </>
  );
};