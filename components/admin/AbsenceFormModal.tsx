import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import type { Employee, AbsenceRequest, TimeEntry, CompanySettings } from '../../types';
import { AbsenceType } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { XIcon } from '../icons/XIcon';
import { ConfirmModal } from '../ui/ConfirmModal';
import { TrashIcon } from '../icons/TrashIcon';
import { DateSelectorButton } from '../ui/DateSelectorButton';
import { CalendarModal } from '../ui/CalendarModal';
import { InfoModal } from '../ui/InfoModal';
import { SelectorButton } from '../ui/SelectorButton';
import { SelectionModal } from '../ui/SelectionModal';

export type AbsenceFormData = Partial<AbsenceRequest>;

interface AbsenceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<AbsenceRequest>) => void;
  onDelete?: (id: number) => void;
  employees: Employee[];
  initialData: Partial<AbsenceRequest> | null;
  allAbsenceRequests: AbsenceRequest[];
  allTimeEntries: TimeEntry[];
  companySettings: CompanySettings;
  isRotated?: boolean;
}

const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const absenceTypeOptions = [
    { id: AbsenceType.Vacation, name: 'Urlaub' },
    { id: AbsenceType.SickLeave, name: 'Krankmeldung' },
    { id: AbsenceType.TimeOff, name: 'Freizeitausgleich' },
];

export const AbsenceFormModal: React.FC<AbsenceFormModalProps> = ({ isOpen, onClose, onSave, onDelete, employees, initialData, allAbsenceRequests, allTimeEntries, companySettings, isRotated = false }) => {
  const [formData, setFormData] = useState<Partial<AbsenceRequest>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);
  const [isEmployeeSelectOpen, setIsEmployeeSelectOpen] = useState(false);
  const [isTypeSelectOpen, setIsTypeSelectOpen] = useState(false);
  const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '' });
  const [isClosing, setIsClosing] = useState(false);
  
  const isEditing = !!(initialData && initialData.id);

  useEffect(() => {
    if (isOpen) {
      setFormData({ type: AbsenceType.Vacation, dayPortion: 'full', ...initialData });
    } else {
      // Reset closing state when modal is hidden/closed
      setIsClosing(false);
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (formData.dayPortion && formData.dayPortion !== 'full' && formData.startDate) {
      setFormData(prev => ({ ...prev, endDate: prev.startDate }));
    }
  }, [formData.dayPortion, formData.startDate]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleRangeSelect = (range: { start: string, end: string }) => {
    setFormData(prev => ({ ...prev, startDate: range.start, endDate: range.end }));
    setIsRangePickerOpen(false);
  };

  const handleSingleDateSelect = (date: Date) => {
    const dateString = date.toLocaleDateString('sv-SE');
    setFormData(prev => ({ ...prev, startDate: dateString, endDate: dateString }));
    setIsRangePickerOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId && formData.employeeId !== 0 || !formData.type || !formData.startDate || !formData.endDate) {
      setInfoModal({ isOpen: true, title: 'Unvollständige Eingabe', message: 'Bitte füllen Sie alle Felder aus.' });
      return;
    }

    const newStart = new Date(formData.startDate);
    const newEnd = new Date(formData.endDate);

    if (newStart > newEnd) {
        setInfoModal({ isOpen: true, title: 'Ungültiger Zeitraum', message: 'Das Startdatum muss vor oder am Enddatum liegen.' });
        return;
    }

    const existingAbsencesForEmployee = allAbsenceRequests.filter(req => 
        req.employeeId === formData.employeeId && 
        req.id !== formData.id 
    );

    const overlap = existingAbsencesForEmployee.find(req => {
        const existingStart = new Date(req.startDate);
        const existingEnd = new Date(req.endDate);
        return newStart <= existingEnd && newEnd >= existingStart;
    });

    if (overlap) {
        setInfoModal({ isOpen: true, title: 'Überlappender Antrag', message: 'Der ausgewählte Zeitraum überschneidet sich mit einer bestehenden Abwesenheit für diesen Mitarbeiter.' });
        return;
    }
    
    const timeEntryConflict = allTimeEntries.find(entry => {
        if (entry.employeeId !== formData.employeeId) return false;
        const entryDate = new Date(entry.start).toLocaleDateString('sv-SE');
        return entryDate >= formData.startDate! && entryDate <= formData.endDate!;
    });

    if (timeEntryConflict) {
        setInfoModal({ isOpen: true, title: 'Konflikt bei Abwesenheit', message: 'Für den ausgewählten Zeitraum existieren bereits Zeiteinträge. Bitte löschen Sie diese zuerst.' });
        return;
    }
    
    setIsClosing(true);
    setTimeout(() => {
        onSave(formData);
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

  const getEmployeeName = (id: number) => {
      const emp = employees.find(e => e.id === id);
      return emp ? `${emp.firstName} ${emp.lastName}` : '';
  };

  if (!isOpen) return null;

  const containerClass = isRotated
    ? `fixed top-0 left-0 w-[100vh] h-[100vw] origin-top-left rotate-90 translate-x-[100vw] flex items-center justify-center z-[250] p-1 sm:p-4 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`
    : `fixed inset-0 bg-black flex items-center justify-center z-[250] p-4 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`;

  // More compact card in rotated mode
  const cardClasses = `w-full max-w-lg relative flex flex-col ${isRotated ? 'max-h-[98vh] !p-3' : 'max-h-[90vh]'} ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`;

  return ReactDOM.createPortal(
    <>
      <div className={containerClass} onClick={handleClose}>
        <Card className={cardClasses} onClick={(e) => e.stopPropagation()}>
          <button onClick={handleClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 z-10">
            <XIcon className="h-6 w-6" />
          </button>

          <form onSubmit={handleSubmit} className="flex flex-col flex-grow min-h-0">
            <h2 className={`text-xl font-bold ${isRotated ? 'mb-2' : 'mb-4'} flex-shrink-0`}>
                {isEditing ? 'Abwesenheit bearbeiten' : 'Abwesenheit eintragen'}
            </h2>
            
            <div className={`space-y-4 ${isRotated ? 'pt-2' : 'pt-4'} border-t flex-grow overflow-y-auto px-1`}>
              <SelectorButton
                label="Mitarbeiter"
                value={formData.employeeId !== undefined ? getEmployeeName(formData.employeeId) : ''}
                placeholder="Auswählen..."
                onClick={() => setIsEmployeeSelectOpen(true)}
                disabled={isEditing}
              />

              <SelectorButton
                label="Abwesenheitstyp"
                value={absenceTypeOptions.find(o => o.id === formData.type)?.name || ''}
                placeholder="Auswählen..."
                onClick={() => setIsTypeSelectOpen(true)}
              />

              {formData.type === AbsenceType.Vacation && companySettings.allowHalfDayVacations && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dauer</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'full', label: 'Ganzer Tag' },
                      { value: 'am', label: 'Vormittag' },
                      { value: 'pm', label: 'Nachmittag' },
                    ].map(option => (
                      <label key={option.value} className={`flex items-center justify-center p-3 border rounded-md cursor-pointer transition-colors text-center text-sm ${
                        (formData.dayPortion || 'full') === option.value
                          ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400 font-semibold'
                          : 'hover:bg-gray-50'
                      }`}>
                        <input
                          type="radio"
                          name="dayPortion"
                          value={option.value}
                          checked={(formData.dayPortion || 'full') === option.value}
                          onChange={(e) => setFormData(prev => ({...prev, dayPortion: e.target.value as 'full' | 'am' | 'pm'}))}
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
                value={formData.startDate && formData.endDate ? `${formatDate(formData.startDate)} - ${formatDate(formData.endDate)}` : ''}
                onClick={() => setIsRangePickerOpen(true)}
                placeholder="Auswählen..."
              />
            </div>

            <div className={`flex justify-between items-center ${isRotated ? 'pt-3 mt-2' : 'pt-6 mt-4'} border-t flex-shrink-0`}>
                <div>
                    {isEditing && onDelete && (
                        <Button type="button" onClick={handleDelete} className="bg-red-600 hover:bg-red-700 flex items-center gap-2" title="Löschen">
                            <TrashIcon className="h-5 w-5" /> <span className="hidden sm:inline">Löschen</span>
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
      <InfoModal
        isOpen={infoModal.isOpen}
        onClose={() => setInfoModal({ isOpen: false, title: '', message: '' })}
        title={infoModal.title}
        message={infoModal.message}
        isRotated={isRotated}
      />
      <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleConfirmDelete}
          title="Abwesenheit löschen"
          message="Möchten Sie diesen Abwesenheitseintrag wirklich endgültig löschen?"
          confirmText="Ja, löschen"
          isRotated={isRotated}
      />
      <CalendarModal
        isOpen={isRangePickerOpen}
        onClose={() => setIsRangePickerOpen(false)}
        onSelectRange={handleRangeSelect}
        onSelectDate={handleSingleDateSelect}
        title="Zeitraum auswählen"
        selectionMode={formData.type === AbsenceType.Vacation && formData.dayPortion !== 'full' ? 'single' : 'range'}
        initialStartDate={formData.startDate}
        initialEndDate={formData.endDate}
        isRotated={isRotated}
      />
      <SelectionModal
        isOpen={isEmployeeSelectOpen}
        onClose={() => setIsEmployeeSelectOpen(false)}
        onSelect={(item) => setFormData(prev => ({ ...prev, employeeId: Number(item.id) }))}
        items={employees.map(e => ({ id: String(e.id), name: `${e.firstName} ${e.lastName}` }))}
        title="Mitarbeiter auswählen"
        selectedValue={String(formData.employeeId || '')}
        isRotated={isRotated}
      />
      <SelectionModal
        isOpen={isTypeSelectOpen}
        onClose={() => setIsTypeSelectOpen(false)}
        onSelect={(item) => setFormData(prev => ({ ...prev, type: item.id as AbsenceType }))}
        items={absenceTypeOptions}
        title="Abwesenheitstyp auswählen"
        selectedValue={formData.type || ''}
        isRotated={isRotated}
      />
    </>,
    document.body
  );
};