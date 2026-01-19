
import React, { useState, useMemo } from 'react';
import type { AbsenceRequest, Employee } from '../types';
import { AbsenceType } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Card } from './ui/Card';
import { ConfirmModal } from './ui/ConfirmModal';
import { CalendarModal } from './ui/CalendarModal';
import { DateSelectorButton } from './ui/DateSelectorButton';

interface RequestViewProps {
  currentUser: Employee;
  addAbsenceRequest: (request: Omit<AbsenceRequest, 'id' | 'status'>) => void;
  absenceRequests: AbsenceRequest[];
  onRetractAbsenceRequest: (id: number) => void;
}

const getStatusChip = (status: AbsenceRequest['status']) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-200 rounded-full">Ausstehend</span>;
      case 'approved': return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">Genehmigt</span>;
      case 'rejected': return <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 rounded-full">Abgelehnt</span>;
    }
};

const getAbsenceLabel = (type: AbsenceType) => {
      switch (type) {
          case AbsenceType.Vacation: return 'Urlaub';
          case AbsenceType.SickLeave: return 'Krankmeldung';
          case AbsenceType.TimeOff: return 'Freizeitausgleich';
      }
}

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export const RequestView: React.FC<RequestViewProps> = ({ currentUser, addAbsenceRequest, absenceRequests, onRetractAbsenceRequest }) => {
  const [type, setType] = useState<AbsenceType>(AbsenceType.Vacation);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [photo, setPhoto] = useState<File | undefined>();
  const [requestToRetract, setRequestToRetract] = useState<AbsenceRequest | null>(null);
  const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);

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

  const handleRangeSelect = (range: { start: string, end: string }) => {
    setStartDate(range.start);
    setEndDate(range.end);
    setIsRangePickerOpen(false);
  };


  const groupedRequests = useMemo(() => {
    const groups: { [year: string]: { [type in AbsenceType]?: AbsenceRequest[] } } = {};
    
    const sortedRequests = [...absenceRequests].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    for (const req of sortedRequests) {
        const year = new Date(req.startDate).getFullYear().toString();
        if (!groups[year]) {
            groups[year] = {};
        }
        if (!groups[year][req.type]) {
            groups[year][req.type] = [];
        }
        groups[year][req.type]!.push(req);
    }
    return groups;
  }, [absenceRequests]);

  const sortedYears = Object.keys(groupedRequests).sort((a, b) => Number(b) - Number(a));

  const RequestList: React.FC<{requests: AbsenceRequest[]}> = ({ requests }) => (
    <div className="space-y-3">
        {requests.map(req => (
            <div key={req.id} className="p-3 bg-gray-50 rounded-lg border">
                <div className="flex justify-between items-start gap-2">
                    <div className="flex-grow">
                        <p className="font-semibold">{getAbsenceLabel(req.type)}</p>
                        <p className="text-sm text-gray-600">
                        {new Date(req.startDate).toLocaleDateString('de-DE')} - {new Date(req.endDate).toLocaleDateString('de-DE')}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
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
                {req.adminComment && req.status !== 'pending' && (
                  <p className="mt-2 pt-2 border-t border-gray-200 text-sm text-gray-600 italic">
                    <span className="font-medium not-italic text-gray-700">Kommentar vom Admin:</span> "{req.adminComment}"
                  </p>
                )}
            </div>
        ))}
    </div>
  );

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
            
            <DateSelectorButton
                label="Zeitraum"
                value={startDate && endDate ? `${formatDate(startDate)} - ${formatDate(endDate)}` : ''}
                onClick={() => setIsRangePickerOpen(true)}
                placeholder="Zeitraum auswählen..."
            />

            {type === AbsenceType.SickLeave && (
              <Input id="photo-upload" label="Foto hochladen (z.B. Krankenschein)" type="file" onChange={handleFileChange} />
            )}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Antrag einreichen</Button>
          </form>
        </Card>
        
        <Card>
          <h2 className="text-xl font-bold text-center mb-4">Meine Anträge</h2>
          <div className="space-y-6">
            {sortedYears.length > 0 ? (
                sortedYears.map(year => (
                    <div key={year} className="space-y-4 pt-4 border-t first:border-t-0 first:pt-0">
                        <h3 className="text-lg font-bold text-gray-800">{year}</h3>
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">{getAbsenceLabel(AbsenceType.Vacation)}</h4>
                            {groupedRequests[year][AbsenceType.Vacation] ? (
                                <RequestList requests={groupedRequests[year][AbsenceType.Vacation]!} />
                            ) : <p className="text-sm text-gray-500 pl-2">Keine Anträge.</p>}
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">{getAbsenceLabel(AbsenceType.SickLeave)}</h4>
                             {groupedRequests[year][AbsenceType.SickLeave] ? (
                                <RequestList requests={groupedRequests[year][AbsenceType.SickLeave]!} />
                            ) : <p className="text-sm text-gray-500 pl-2">Keine Anträge.</p>}
                        </div>
                         <div>
                            <h4 className="font-semibold text-gray-700 mb-2">{getAbsenceLabel(AbsenceType.TimeOff)}</h4>
                             {groupedRequests[year][AbsenceType.TimeOff] ? (
                                <RequestList requests={groupedRequests[year][AbsenceType.TimeOff]!} />
                            ) : <p className="text-sm text-gray-500 pl-2">Keine Anträge.</p>}
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
      <CalendarModal
        isOpen={isRangePickerOpen}
        onClose={() => setIsRangePickerOpen(false)}
        onSelectRange={handleRangeSelect}
        title="Zeitraum auswählen"
        selectionMode="range"
        initialStartDate={startDate}
        initialEndDate={endDate}
      />
    </>
  );
};
