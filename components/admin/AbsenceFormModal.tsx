import React, { useState, useEffect } from 'react';
import type { Employee, AbsenceRequest, TimeEntry, CompanySettings } from '../../types';
import { AbsenceType } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { XIcon } from '../icons/XIcon';
import { ConfirmModal } from '../ui/ConfirmModal';
import { TrashIcon } from '../icons/TrashIcon';
import { DateSelectorButton } from '../ui/DateSelectorButton';
import { CalendarModal } from '../ui/CalendarModal';
import { InfoModal } from '../ui/InfoModal';
import { RadioGroup } from '../ui/RadioGroup';

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
}

const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export const AbsenceFormModal: React.FC<AbsenceFormModalProps> = ({ isOpen, onClose, onSave, onDelete, employees, initialData, allAbsenceRequests, allTimeEntries, companySettings }) => {
  const [formData, setFormData] = useState<Partial<AbsenceRequest>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);
  const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '' });
  
  const isEditing = !!(initialData && initialData.id);

  useEffect(() => {
    if (isOpen) {
      setFormData({ type: AbsenceType.Vacation, dayPortion: 'full', ...initialData });
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (formData.dayPortion && formData.dayPortion !== 'full' && formData.startDate) {
      setFormData(prev => ({ ...prev, endDate: prev.startDate }));
    }
  }, [formData.dayPortion, formData.startDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumeric = ['employeeId'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumeric ? Number(value) : value }));
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
        req.id !== formData.id // Exclude the current request if editing
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
    
    onSave(formData);
  };
  
  const handleDelete = () => {
      if (isEditing && onDelete) {
          setShowDeleteConfirm(true);
      }
  };

  const handleConfirmDelete = () => {
      if (isEditing && onDelete) {
          onDelete(initialData!.id!);
          setShowDeleteConfirm(false);
      }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-30 p-4">
        <Card className="w-full max-w-lg relative" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
            <XIcon className="h-6 w-6" />
          </button>

          <form onSubmit={handleSubmit}>
            <h2 className="text-xl font-bold mb-4">{isEditing ? 'Abwesenheit bearbeiten' : 'Abwesenheit eintragen'}</h2>
            
            <div className="space-y-4 pt-4 border-t">
              <Select
                name="employeeId"
                label="Mitarbeiter"
                value={formData.employeeId ?? ''}
                onChange={handleChange}
                required
                disabled={isEditing}
              >
                <option value="" disabled>Mitarbeiter auswählen...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </Select>

              <Select
                name="type"
                label="Abwesenheitstyp"
                value={formData.type || AbsenceType.Vacation}
                onChange={handleChange}
                required
              >
                <option value={AbsenceType.Vacation}>Urlaub</option>
                <option value={AbsenceType.SickLeave}>Krankmeldung</option>
                <option value={AbsenceType.TimeOff}>Freizeitausgleich</option>
              </Select>

              {formData.type === AbsenceType.Vacation && companySettings.allowHalfDayVacations && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dauer</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                placeholder="Zeitraum auswählen..."
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
                    <Button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600">Abbrechen</Button>
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
      />
      <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleConfirmDelete}
          title="Abwesenheit löschen"
          message="Möchten Sie diesen Abwesenheitseintrag wirklich endgültig löschen?"
          confirmText="Ja, löschen"
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
      />
    </>
  );
};