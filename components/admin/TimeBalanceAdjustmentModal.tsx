import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { TimeBalanceAdjustment, TimeBalanceAdjustmentType, type CompanySettings } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { XIcon } from '../icons/XIcon';
import { ConfirmModal } from '../ui/ConfirmModal';
import { TrashIcon } from '../icons/TrashIcon';
import { FlexibleTimeInput } from '../ui/FlexibleTimeInput';

export interface TimeBalanceAdjustmentFormData {
  date: string;
  type: TimeBalanceAdjustmentType;
  hours: number;
  note: string;
}

interface TimeBalanceAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TimeBalanceAdjustmentFormData | TimeBalanceAdjustment) => void;
  onDelete?: (id: number) => void;
  type: 'payout' | 'correction';
  initialData?: Partial<TimeBalanceAdjustment> | null;
  companySettings: CompanySettings;
}

export const TimeBalanceAdjustmentModal: React.FC<TimeBalanceAdjustmentModalProps> = ({ isOpen, onClose, onSave, onDelete, type, initialData, companySettings }) => {
  const [date, setDate] = useState('');
  const [hours, setHours] = useState<number | undefined>(undefined);
  const [note, setNote] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  const isEditing = !!initialData?.id;
  const timeFormat = companySettings.adminTimeFormat || 'hoursMinutes';

  useEffect(() => {
    if (isOpen) {
        setDate(initialData?.date || new Date().toLocaleDateString('sv-SE'));
        
        let initialHoursValue: number | undefined = initialData?.hours;
        if (initialData?.type === 'payout' && typeof initialHoursValue === 'number') {
            initialHoursValue = Math.abs(initialHoursValue);
        }
        setHours(initialHoursValue);

        setNote(initialData?.note || '');
    } else {
        setIsClosing(false);
    }
  }, [initialData, isOpen, type]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedHours = hours;
    if (typeof parsedHours !== 'number' || isNaN(parsedHours) || !date) {
        alert('Bitte geben Sie ein gültiges Datum und eine Stundenzahl an.');
        return;
    }
    
    const hoursToSave = type === 'payout' ? -Math.abs(parsedHours) : parsedHours;
    
    const dataToSave: TimeBalanceAdjustmentFormData = {
        date,
        type: type === 'payout' ? TimeBalanceAdjustmentType.Payout : TimeBalanceAdjustmentType.Correction,
        hours: hoursToSave,
        note
    };

    setIsClosing(true);
    setTimeout(() => {
        if (isEditing) {
            onSave({ ...(initialData as TimeBalanceAdjustment), ...dataToSave });
        } else {
            onSave(dataToSave);
        }
    }, 300);
  };

  const handleDelete = () => {
    if (isEditing && onDelete) {
        setShowDeleteConfirm(true);
    }
  };

  const handleConfirmDelete = () => {
      if (isEditing && onDelete) {
          setIsClosing(true);
          setTimeout(() => {
              onDelete(initialData!.id!);
          }, 300);
          setShowDeleteConfirm(false);
      }
  };

  if (!isOpen) return null;

  const title = isEditing 
    ? (type === 'payout' ? 'Auszahlung bearbeiten' : 'Korrektur bearbeiten')
    : (type === 'payout' ? 'Auszahlung eintragen' : 'Korrektur buchen');
    
  const hoursLabel = type === 'payout' ? 'Auszuzahlende Stunden' : 'Stundenkorrektur (+/-)';

  return ReactDOM.createPortal(
    <>
      <div className={`fixed inset-0 bg-black flex items-center justify-center z-[100] p-4 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
        <Card className={`w-full max-w-lg relative ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={(e) => e.stopPropagation()}>
          <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
            <XIcon className="h-6 w-6" />
          </button>

          <form onSubmit={handleSubmit}>
            <h2 className="text-xl font-bold mb-4">{title}</h2>
            
            <div className="space-y-4 pt-4 border-t">
              <Input 
                  name="date" 
                  label="Datum der Buchung" 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  required 
              />
               <FlexibleTimeInput
                  label={hoursLabel}
                  value={hours}
                  onChange={setHours}
                  format={timeFormat}
               />
               <Input 
                  name="note" 
                  label="Notiz / Grund (optional)" 
                  type="text" 
                  value={note} 
                  onChange={(e) => setNote(e.target.value)} 
              />
            </div>

            <div className="flex justify-between items-center pt-6 border-t mt-6">
                <div>
                    {isEditing && onDelete && (
                        <Button type="button" onClick={handleDelete} className="bg-red-600 hover:bg-red-700 flex items-center gap-2">
                             <TrashIcon className="h-5 w-5" /> Löschen
                        </Button>
                    )}
                </div>
                <div className="flex gap-4">
                    <Button type="button" onClick={handleClose} className="bg-gray-500 hover:bg-gray-600">Abbrechen</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Speichern</Button>
                </div>
            </div>
          </form>
        </Card>
      </div>
      <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleConfirmDelete}
          title="Eintrag löschen"
          message="Möchten Sie diesen Eintrag wirklich endgültig löschen?"
          confirmText="Ja, löschen"
      />
    </>,
    document.body
  );
};