import React, { useState, useEffect, useRef } from 'react';
import type { TimeEntry, Customer, Activity, CompanySettings, AbsenceRequest } from '../types';
import { Button } from './ui/Button';
import { BreakModal } from './BreakModal';
import { SelectionModal } from './ui/SelectionModal';
import { SelectorButton } from './ui/SelectorButton';
import { PlayIcon } from './icons/PlayIcon';
import { StopIcon } from './icons/StopIcon';
import { Textarea } from './ui/Textarea';
import { InfoModal } from './ui/InfoModal';

interface StopwatchProps {
  addTimeEntry: (entry: Omit<TimeEntry, 'id' | 'employeeId'>) => void;
  timeEntries: TimeEntry[];
  customers: Customer[];
  activities: Activity[];
  companySettings: CompanySettings;
  absenceRequests: AbsenceRequest[];
  // Lifted state and handlers
  isRunning: boolean;
  startTime: Date | null;
  stopTime: Date | null;
  elapsedTime: number;
  customerId: string;
  activityId: string;
  comment: string;
  isBreakModalOpen: boolean;
  setIsBreakModalOpen: (isOpen: boolean) => void;
  setIsRunning: (isRunning: boolean) => void;
  setStartTime: (date: Date | null) => void;
  setStopTime: (date: Date | null) => void;
  setElapsedTime: (time: number) => void;
  setCustomerId: (id: string) => void;
  setActivityId: (id: string) => void;
  setComment: (comment: string) => void;
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

export const Stopwatch: React.FC<StopwatchProps> = ({ 
  addTimeEntry, timeEntries, customers, activities, companySettings, absenceRequests,
  isRunning, startTime, stopTime, elapsedTime, customerId, activityId, comment,
  isBreakModalOpen, setIsBreakModalOpen, setIsRunning, setStartTime, setStopTime, setElapsedTime,
  setCustomerId, setActivityId, setComment, onSuccess
}) => {
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '' });

  const customerLabel = companySettings.customerLabel || 'Zeitkategorie 1';
  const activityLabel = companySettings.activityLabel || 'Zeitkategorie 2';
  
  const handleCloseModal = () => {
      setIsBreakModalOpen(false);
  };

  const handleSaveEntry = (breakDurationMinutes: number) => {
    if (!startTime || !stopTime) return;

    const entryStartTime = startTime;
    const endTime = stopTime;
    
    if (isOverlapping(entryStartTime, endTime, timeEntries)) {
      setInfoModal({ isOpen: true, title: 'Überlappender Eintrag', message: 'Dieser Zeiteintrag überschneidet sich mit einem bestehenden Eintrag. Bitte korrigieren Sie die Zeiten.' });
      handleCloseModal();
      return;
    }

    addTimeEntry({
      start: entryStartTime.toISOString(),
      end: endTime.toISOString(),
      customerId,
      activityId,
      breakDurationMinutes,
      type: 'stopwatch',
      comment: comment || undefined
    });
    
    onSuccess?.();
    
    setElapsedTime(0);
    setStartTime(null);
    setStopTime(null);
    setCustomerId('');
    setActivityId('');
    setComment('');
    setIsBreakModalOpen(false);
  };

  const handleToggle = () => {
    if (isRunning) {
      setStopTime(new Date());
      setIsRunning(false);
      setIsBreakModalOpen(true);
    } else {
      const todayStr = new Date().toLocaleDateString('sv-SE');
      const todaysAbsence = absenceRequests.find(req => 
          req.status !== 'rejected' &&
          todayStr >= req.startDate &&
          todayStr <= req.endDate
      );

      if (todaysAbsence) {
          setInfoModal({ isOpen: true, title: 'Start nicht möglich', message: 'Sie haben für heute eine genehmigte oder beantragte Abwesenheit und können die Stempeluhr nicht starten.' });
          return;
      }

      if (!customerId || !activityId) {
        setInfoModal({ isOpen: true, title: 'Auswahl erforderlich', message: `Bitte wählen Sie zuerst ${customerLabel} und ${activityLabel} aus.` });
        return;
      }
      setElapsedTime(0);
      setStartTime(new Date());
      setStopTime(null);
      setIsRunning(true);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const selectedCustomerName = customers.find(c => c.id === customerId)?.name || '';
  const selectedActivityName = activities.find(a => a.id === activityId)?.name || '';

  return (
    <>
      <div className="flex flex-col items-center space-y-4 p-4">
        <div className="text-4xl sm:text-6xl font-mono font-bold tracking-wider text-gray-800 bg-gray-100 rounded-lg p-4 w-full text-center">
          {formatTime(elapsedTime)}
        </div>

        <div className="w-full space-y-4">
           <SelectorButton
              label={customerLabel}
              value={selectedCustomerName}
              placeholder="Auswählen..."
              onClick={() => setIsCustomerModalOpen(true)}
              disabled={isRunning}
            />
          <SelectorButton
              label={activityLabel}
              value={selectedActivityName}
              placeholder="Auswählen..."
              onClick={() => setIsActivityModalOpen(true)}
              disabled={isRunning}
            />
          <Textarea
              label="Kommentar (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isRunning}
              rows={2}
          />
        </div>

        <Button
          onClick={handleToggle}
          className={`h-16 w-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
            isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
          }`}
          aria-label={isRunning ? 'Zeiterfassung stoppen' : 'Zeiterfassung starten'}
        >
          {isRunning ? <StopIcon className="h-7 w-7 text-white" /> : <PlayIcon className="h-7 w-7 text-white ml-0.5" />}
        </Button>
      </div>

      {isBreakModalOpen && (
        <BreakModal 
          onClose={handleCloseModal}
          onSave={handleSaveEntry}
        />
      )}
      
      <InfoModal
        isOpen={infoModal.isOpen}
        onClose={() => setInfoModal({ isOpen: false, title: '', message: '' })}
        title={infoModal.title}
        message={infoModal.message}
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