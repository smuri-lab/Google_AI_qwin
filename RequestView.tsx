
import React, { useState } from 'react';
// FIX: Import Employee type to use for props
import type { AbsenceRequest, Employee } from '../types';
import { AbsenceType } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Card } from './ui/Card';
import { ConfirmModal } from './ui/ConfirmModal';

interface RequestViewProps {
  // FIX: Add currentUser prop to get employeeId from. Also correct addAbsenceRequest type.
  currentUser: Employee;
  addAbsenceRequest: (request: Omit<AbsenceRequest, 'id' | 'status'>) => void;
  absenceRequests: AbsenceRequest[];
  onRetractAbsenceRequest: (id: number) => void;
}

export const RequestView: React.FC<RequestViewProps> = ({ currentUser, addAbsenceRequest, absenceRequests, onRetractAbsenceRequest }) => {
  const [type, setType] = useState<AbsenceType>(AbsenceType.Vacation);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [photo, setPhoto] = useState<File | undefined>();
  const [requestToRetract, setRequestToRetract] = useState<AbsenceRequest | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !startDate || !endDate) {
      alert('Bitte füllen Sie alle erforderlichen Felder aus.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
        alert('Das Startdatum muss vor oder am Enddatum liegen.');
        return;
    }
    // FIX: Provide the required employeeId from the currentUser prop.
    addAbsenceRequest({ employeeId: currentUser.id, type, startDate, endDate, photo });
    // Reset form
    setType(AbsenceType.Vacation);
    setStartDate('');
    setEndDate('');
    setPhoto(undefined);
    const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPhoto(e.target.files[0]);
    }
  };

  const handleConfirmRetract = () => {
    if (requestToRetract) {
      onRetractAbsenceRequest(requestToRetract.id);
      setRequestToRetract(null);
    }
  };

  const getStatusChip = (status: AbsenceRequest['status']) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-200 rounded-full">Ausstehend</span>;
      case 'approved': return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">Genehmigt</span>;
      case 'rejected': return <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 rounded-full">Abgelehnt</span>;
    }
  };
  
  const getAbsenceLabel = (type: AbsenceType) => {
      switch (type) {
          case AbsenceType.Vacation: return 'Urlaubsantrag';
          case AbsenceType.SickLeave: return 'Krankmeldung';
          case AbsenceType.TimeOff: return 'Freizeitausgleich';
      }
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <h2 className="text-xl font-bold text-center mb-4">Neuer Antrag</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select label="Antragstyp" value={type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setType(e.target.value as AbsenceType)}>
              <option value={AbsenceType.Vacation}>Urlaub</option>
              <option value={AbsenceType.SickLeave}>Krankmeldung</option>
              <option value={AbsenceType.TimeOff}>Freizeitausgleich</option>
            </Select>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <Input label="Startdatum" type="date" value={startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)} required />
               <Input label="Enddatum" type="date" value={endDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)} required />
            </div>
            {type === AbsenceType.SickLeave && (
              <Input id="photo-upload" label="Foto hochladen (z.B. Krankenschein)" type="file" onChange={handleFileChange} />
            )}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Antrag einreichen</Button>
          </form>
        </Card>
        
        <Card>
          <h2 className="text-xl font-bold text-center mb-4">Meine Anträge</h2>
          <div className="space-y-3">
            {absenceRequests.length > 0 ? (
              absenceRequests.slice().reverse().map(req => (
                <div key={req.id} className="p-3 bg-gray-50 rounded-lg border flex justify-between items-center gap-2">
                  <div className="flex-grow">
                    <p className="font-semibold">{getAbsenceLabel(req.type)}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(req.startDate).toLocaleDateString('de-DE')} - {new Date(req.endDate).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusChip(req.status)}
                    {req.status === 'pending' && (
                        <Button
                            onClick={() => setRequestToRetract(req)}
                            className="text-xs bg-gray-500 hover:bg-gray-600 px-2 py-1"
                        >
                            Zurückziehen
                        </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500">Keine Anträge vorhanden.</p>
            )}
          </div>
        </Card>
      </div>
      <ConfirmModal
        isOpen={!!requestToRetract}
        onClose={() => setRequestToRetract(null)}
        onConfirm={handleConfirmRetract}
        title="Antrag zurückziehen"
        message="Möchten Sie diesen Antrag wirklich zurückziehen? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmText="Ja, zurückziehen"
        cancelText="Abbrechen"
      />
    </>
  );
};
