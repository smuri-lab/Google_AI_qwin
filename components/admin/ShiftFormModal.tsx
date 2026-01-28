
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { Shift, Employee, Customer, Activity, CompanySettings } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { XIcon } from '../icons/XIcon';
import { SelectorButton } from '../ui/SelectorButton';
import { SelectionModal } from '../ui/SelectionModal';
import { TrashIcon } from '../icons/TrashIcon';
import { ConfirmModal } from '../ui/ConfirmModal';
import { DateSelectorButton } from '../ui/DateSelectorButton';
import { CalendarModal } from '../ui/CalendarModal';

interface ShiftFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shift: Omit<Shift, 'id'> | Shift) => void;
  onDelete: (id: string) => void;
  employees: Employee[];
  customers: Customer[];
  activities: Activity[];
  companySettings: CompanySettings;
  initialData: Partial<Shift> | null;
  defaultDate?: string;
  defaultEmployeeId?: number;
}

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export const ShiftFormModal: React.FC<ShiftFormModalProps> = ({ 
    isOpen, onClose, onSave, onDelete, employees, customers, activities, companySettings, initialData, defaultDate, defaultEmployeeId 
}) => {
  const [formData, setFormData] = useState<Partial<Shift>>({});
  const [date, setDate] = useState(defaultDate || new Date().toLocaleDateString('sv-SE'));
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  
  // Modal states
  const [isEmployeeSelectOpen, setIsEmployeeSelectOpen] = useState(false);
  const [isCustomerSelectOpen, setIsCustomerSelectOpen] = useState(false);
  const [isActivitySelectOpen, setIsActivitySelectOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const customerLabel = companySettings.customerLabel || 'Zeitkategorie 1';
  const activityLabel = companySettings.activityLabel || 'Zeitkategorie 2';

  useEffect(() => {
    if (isOpen) {
        setIsClosing(false);
        if (initialData) {
            setFormData(initialData);
            if (initialData.start) {
                const s = new Date(initialData.start);
                setDate(s.toLocaleDateString('sv-SE'));
                setStartTime(s.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
            } else if (defaultDate) {
                setDate(defaultDate);
            }
            
            if (initialData.end) {
                const e = new Date(initialData.end);
                setEndTime(e.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
            }
        } else {
            setFormData({
                employeeId: defaultEmployeeId
            });
            if (defaultDate) setDate(defaultDate);
        }
    }
  }, [isOpen, initialData, defaultDate, defaultEmployeeId]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleDateSelect = (selectedDate: Date) => {
      setDate(selectedDate.toLocaleDateString('sv-SE'));
      setIsCalendarOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!formData.employeeId && formData.employeeId !== 0) || !date || !startTime || !endTime) {
        alert('Bitte füllen Sie alle Pflichtfelder aus.');
        return;
    }

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);

    if (start >= end) {
        alert('Die Endzeit muss nach der Startzeit liegen.');
        return;
    }

    const shiftData = {
        ...formData,
        start: start.toISOString(),
        end: end.toISOString(),
        employeeId: formData.employeeId!,
        color: formData.color || '#3b82f6',
    };

    setIsClosing(true);
    setTimeout(() => {
        onSave(shiftData as Shift);
    }, 300);
  };

  const handleDelete = () => {
      setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
      if (initialData?.id) {
          setIsClosing(true);
          setTimeout(() => onDelete(initialData.id!), 300);
      }
  };

  const colors = [
      { hex: '#3b82f6', name: 'Blau' },
      { hex: '#10b981', name: 'Grün' },
      { hex: '#f59e0b', name: 'Orange' },
      { hex: '#ef4444', name: 'Rot' },
      { hex: '#8b5cf6', name: 'Lila' },
      { hex: '#6b7280', name: 'Grau' },
  ];

  if (!isOpen) return null;

  const employeeName = employees.find(e => e.id === formData.employeeId);
  const customerName = customers.find(c => c.id === formData.customerId)?.name || '';
  const activityName = activities.find(a => a.id === formData.activityId)?.name || '';

  return ReactDOM.createPortal(
    <>
        <div className={`fixed inset-0 bg-black flex items-center justify-center z-[200] p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`}>
            <Card className={`w-full max-w-md relative flex flex-col ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={e => e.stopPropagation()}>
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
                    <XIcon className="h-6 w-6" />
                </button>
                
                <h2 className="text-xl font-bold mb-4">{initialData?.id ? 'Schicht bearbeiten' : 'Neue Schicht planen'}</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <SelectorButton
                        label="Mitarbeiter"
                        value={employeeName ? `${employeeName.firstName} ${employeeName.lastName}` : ''}
                        placeholder="Mitarbeiter auswählen..."
                        onClick={() => setIsEmployeeSelectOpen(true)}
                    />
                    
                    <DateSelectorButton
                        label="Datum"
                        value={formatDate(date)}
                        placeholder="Datum auswählen..."
                        onClick={() => setIsCalendarOpen(true)}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Von" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                        <Input label="Bis" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                    </div>
                    
                    <SelectorButton
                        label={customerLabel}
                        value={customerName}
                        placeholder="Auswählen..."
                        onClick={() => setIsCustomerSelectOpen(true)}
                    />
                    
                    <SelectorButton
                        label={activityLabel}
                        value={activityName}
                        placeholder="Auswählen..."
                        onClick={() => setIsActivitySelectOpen(true)}
                    />
                    
                    <Input 
                        label="Notiz / Label (Optional)" 
                        placeholder="z.B. Frühschicht" 
                        value={formData.label || ''} 
                        onChange={e => setFormData(prev => ({...prev, label: e.target.value}))} 
                    />
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Farbe</label>
                        <div className="flex gap-2">
                            {colors.map(c => (
                                <button
                                    key={c.hex}
                                    type="button"
                                    onClick={() => setFormData(prev => ({...prev, color: c.hex}))}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === c.hex ? 'border-gray-600 scale-110' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: c.hex }}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t mt-4">
                        <div>
                            {initialData?.id && (
                                <Button type="button" onClick={handleDelete} className="bg-red-600 hover:bg-red-700 flex items-center gap-2">
                                    <TrashIcon className="h-5 w-5" />
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <Button type="button" onClick={handleClose} className="bg-gray-500 hover:bg-gray-600">Abbrechen</Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Speichern</Button>
                        </div>
                    </div>
                </form>
            </Card>
        </div>
        
        <SelectionModal
            isOpen={isEmployeeSelectOpen}
            onClose={() => setIsEmployeeSelectOpen(false)}
            onSelect={(item) => setFormData(prev => ({ ...prev, employeeId: Number(item.id) }))}
            items={employees.map(e => ({ id: String(e.id), name: `${e.firstName} ${e.lastName}` }))}
            title="Mitarbeiter auswählen"
            selectedValue={String(formData.employeeId || '')}
        />
        
        <SelectionModal
            isOpen={isCustomerSelectOpen}
            onClose={() => setIsCustomerSelectOpen(false)}
            onSelect={(item) => setFormData(prev => ({ ...prev, customerId: item.id }))}
            items={customers}
            title={`${customerLabel} auswählen`}
            selectedValue={formData.customerId || ''}
        />
        
        <SelectionModal
            isOpen={isActivitySelectOpen}
            onClose={() => setIsActivitySelectOpen(false)}
            onSelect={(item) => setFormData(prev => ({ ...prev, activityId: item.id }))}
            items={activities}
            title={`${activityLabel} auswählen`}
            selectedValue={formData.activityId || ''}
        />

        <CalendarModal
            isOpen={isCalendarOpen}
            onClose={() => setIsCalendarOpen(false)}
            onSelectDate={handleDateSelect}
            title="Datum auswählen"
            initialStartDate={date}
            selectionMode="single"
        />
        
        <ConfirmModal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleConfirmDelete}
            title="Schicht löschen"
            message="Möchten Sie diese Schicht wirklich entfernen?"
            confirmText="Löschen"
        />
    </>,
    document.body
  );
};
