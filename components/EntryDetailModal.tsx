import React, { useState, useEffect, useMemo } from 'react';
import type { TimeEntry, Customer, Activity, CompanySettings } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { XIcon } from './icons/XIcon';
import { ConfirmModal } from './ui/ConfirmModal';
import { Textarea } from './ui/Textarea';

interface EntryDetailModalProps {
  entry: TimeEntry;
  customers: Customer[];
  activities: Activity[];
  timeEntries: TimeEntry[];
  onClose: () => void;
  onUpdate: (entry: TimeEntry) => void;
  onDelete: (id: number) => void;
  companySettings?: CompanySettings;
  isAdminView?: boolean;
}

const isOverlapping = (newStart: Date, newEnd: Date, existingEntries: TimeEntry[], entryIdToIgnore: number): boolean => {
  const newStartTime = newStart.getTime();
  const newEndTime = newEnd.getTime();

  for (const existingEntry of existingEntries) {
    if (existingEntry.id === entryIdToIgnore) continue;

    if (newStart.toDateString() !== new Date(existingEntry.start).toDateString()) {
        continue;
    }
    const existingStartTime = new Date(existingEntry.start).getTime();
    const existingEndTime = new Date(existingEntry.end).getTime();
    if (newStartTime < existingEndTime && newEndTime > existingStartTime) {
      return true;
    }
  }
  return false;
};

const getLocalTimeString = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export const EntryDetailModal: React.FC<EntryDetailModalProps> = ({ entry, customers, activities, timeEntries, onClose, onUpdate, onDelete, companySettings, isAdminView }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [formData, setFormData] = useState(() => {
    const entryStartDate = new Date(entry.start);
    const entryEndDate = new Date(entry.end);
    return {
        date: entryStartDate.toLocaleDateString('sv-SE'),
        startTime: getLocalTimeString(entryStartDate),
        endTime: getLocalTimeString(entryEndDate),
        breakDurationMinutes: entry.breakDurationMinutes,
        customerId: entry.customerId,
        activityId: entry.activityId,
        comment: entry.comment || '',
    };
  });

  const isEntryLocked = useMemo(() => {
    if (isAdminView) {
        return false;
    }
    // Employee view locking logic
    if (!companySettings) {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const entryDate = new Date(entry.start);
    entryDate.setHours(0, 0, 0, 0);

    switch (companySettings.editLockRule) {
        case 'unlimited':
            return false;
            
        case 'sameDay':
            return entryDate.getTime() !== today.getTime();
        
        case 'previousWeek':
            const getStartOfWeek = (date: Date): Date => {
                const d = new Date(date);
                d.setHours(0, 0, 0, 0);
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
                return new Date(d.setDate(diff));
            };
            const startOfThisWeek = getStartOfWeek(today);
            const startOfLastWeek = new Date(startOfThisWeek);
            startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
            return entryDate.getTime() < startOfLastWeek.getTime();

        case 'currentMonth':
        default:
            return entryDate.getFullYear() !== today.getFullYear() || entryDate.getMonth() !== today.getMonth();
    }
  }, [entry, companySettings, isAdminView]);

  useEffect(() => {
    if (entry) {
        setIsClosing(false);
        const entryStartDate = new Date(entry.start);
        const entryEndDate = new Date(entry.end);
        setFormData({
            date: entryStartDate.toLocaleDateString('sv-SE'),
            startTime: getLocalTimeString(entryStartDate),
            endTime: getLocalTimeString(entryEndDate),
            breakDurationMinutes: entry.breakDurationMinutes,
            customerId: entry.customerId,
            activityId: entry.activityId,
            comment: entry.comment || '',
        });
        setIsEditing(false);
    }
  }, [entry]);
  
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);
    
    if (startDateTime >= endDateTime) {
      alert('Die Endzeit muss nach der Startzeit liegen.');
      return;
    }

    if (isOverlapping(startDateTime, endDateTime, timeEntries, entry.id)) {
      alert('Dieser Zeiteintrag überschneidet sich mit einem bestehenden Eintrag. Bitte korrigieren Sie die Zeiten.');
      return;
    }

    onUpdate({
      ...entry,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      breakDurationMinutes: Number(formData.breakDurationMinutes),
      customerId: formData.customerId,
      activityId: formData.activityId,
      comment: formData.comment || undefined,
    });
    handleClose();
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete(entry.id);
    setShowDeleteConfirm(false);
    handleClose();
  };

  const customerLabel = companySettings?.customerLabel || 'Kunde';
  const activityLabel = companySettings?.activityLabel || 'Tätigkeit';

  const customerName = customers.find(c => c.id === entry.customerId)?.name || `(${customerLabel} nicht gefunden)`;
  const activityName = activities.find(a => a.id === entry.activityId)?.name || `(${activityLabel} nicht gefunden)`;
  
  return (
    <>
      <div className={`fixed inset-0 bg-black flex items-center justify-center z-30 p-4 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
        <Card className={`w-full max-w-lg relative max-h-[90vh] flex flex-col ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={(e) => e.stopPropagation()}>
          <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
            <XIcon className="h-6 w-6" />
          </button>

          {!isEditing ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold pr-8">Eintragsdetails</h2>
              {isEntryLocked && (
                <div className="p-3 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg text-sm">
                    Dieser Eintrag ist gesperrt und kann nicht mehr geändert oder gelöscht werden.
                </div>
              )}
              <div className="space-y-2 text-sm border-t pt-4">
                  <p><strong>Datum:</strong> {new Date(entry.start).toLocaleDateString('de-DE')}</p>
                  <p><strong>Zeit:</strong> {new Date(entry.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} - {new Date(entry.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
                   <p><strong>Pause:</strong> {entry.breakDurationMinutes} m</p>
                  <p><strong>{customerLabel}:</strong> {customerName}</p>
                  <p><strong>{activityLabel}:</strong> {activityName}</p>
                  {entry.comment && (
                     <p><strong>Kommentar:</strong> {entry.comment}</p>
                  )}
              </div>
              <div className="pt-4 border-t flex gap-4">
                  <Button onClick={handleDelete} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed" disabled={isEntryLocked}>Löschen</Button>
                  <Button onClick={() => setIsEditing(true)} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed" disabled={isEntryLocked}>Bearbeiten</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="flex flex-col flex-grow min-h-0">
              <h2 className="text-xl font-bold pr-8 my-4">Eintrag bearbeiten</h2>
              <div className="space-y-4 flex-grow overflow-y-auto pr-2 pb-4 border-t pt-4">
                  <Input name="date" label="Datum" type="date" value={formData.date} onChange={handleInputChange} required />
                  <div className="grid grid-cols-2 gap-4">
                      <Input name="startTime" label="Startzeit" type="time" value={formData.startTime} onChange={handleInputChange} required />
                      <Input name="endTime" label="Endzeit" type="time" value={formData.endTime} onChange={handleInputChange} required />
                  </div>
                  <Input name="breakDurationMinutes" label="Pause (m)" type="number" value={String(formData.breakDurationMinutes)} onChange={handleInputChange} min="0" />
                  <Select name="customerId" label={customerLabel} value={formData.customerId} onChange={handleInputChange} required>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                  <Select name="activityId" label={activityLabel} value={formData.activityId} onChange={handleInputChange} required>
                      {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </Select>
                   <Textarea
                        name="comment"
                        label="Kommentar (optional)"
                        value={formData.comment}
                        onChange={handleInputChange}
                        rows={3}
                    />
              </div>
              <div className="flex justify-end items-center pt-4 border-t">
                  <div className="flex gap-4">
                      <Button type="button" onClick={() => setIsEditing(false)} className="bg-gray-500 hover:bg-gray-600">Abbrechen</Button>
                      <Button type="submit" className="bg-green-600 hover:bg-green-700">Speichern</Button>
                  </div>
              </div>
            </form>
          )}
        </Card>
      </div>
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Eintrag löschen"
        message="Sind Sie sicher, dass Sie diesen Eintrag löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmText="Ja, löschen"
        cancelText="Abbrechen"
      />
    </>
  );
};