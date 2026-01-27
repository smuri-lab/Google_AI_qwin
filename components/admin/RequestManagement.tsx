import React, { useState, useMemo, useEffect } from 'react';
import type { AbsenceRequest, Employee } from '../../types';
import { AbsenceType } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import { TrashIcon } from '../icons/TrashIcon';
import { SelectorButton } from '../ui/SelectorButton';
import { SelectionModal } from '../ui/SelectionModal';
import { XIcon } from '../icons/XIcon';

interface RequestManagementProps {
  absenceRequests: AbsenceRequest[];
  employees: Employee[];
  onUpdateRequestStatus: (id: number, status: 'approved' | 'rejected', comment?: string) => void;
  onDeleteAbsenceRequest: (id: number) => void;
}

const ActionConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (comment: string) => void;
    status: 'approved' | 'rejected';
}> = ({ isOpen, onClose, onConfirm, status }) => {
    const [comment, setComment] = useState('');
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setComment('');
            setIsClosing(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    const handleConfirm = () => {
        setIsClosing(true);
        setTimeout(() => {
            onConfirm(comment);
        }, 300);
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 bg-black flex items-center justify-center z-40 p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
            <Card className={`w-full max-w-md ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">
                        Antrag {status === 'approved' ? 'genehmigen' : 'ablehnen'}
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="space-y-4">
                    <label htmlFor="adminComment" className="block text-sm font-medium text-gray-700">
                        Kommentar hinzufügen (optional)
                    </label>
                    <textarea
                        id="adminComment"
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Grund für die Entscheidung mitteilen..."
                        autoFocus
                    />
                    <div className="flex gap-4 pt-2 justify-end">
                        <Button type="button" onClick={handleClose} className="bg-gray-500 hover:bg-gray-600">
                            Abbrechen
                        </Button>
                        <Button type="button" onClick={handleConfirm} className={` ${status === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                            {status === 'approved' ? 'Genehmigen & Senden' : 'Ablehnen & Senden'}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export const RequestManagement: React.FC<RequestManagementProps> = ({ absenceRequests, employees, onUpdateRequestStatus, onDeleteAbsenceRequest }) => {
  const [requestToDelete, setRequestToDelete] = useState<AbsenceRequest | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<{ id: number; status: 'approved' | 'rejected' } | null>(null);
  
  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unbekannt';
  };
  
  const getAbsenceLabel = (type: AbsenceType) => {
    switch (type) {
      case AbsenceType.Vacation: return 'Urlaubsantrag';
      case AbsenceType.SickLeave: return 'Krankmeldung';
      case AbsenceType.TimeOff: return 'Freizeitausgleich';
    }
  };

  const getStatusChip = (status: AbsenceRequest['status']) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-200 rounded-full">Ausstehend</span>;
      case 'approved': return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">Genehmigt</span>;
      case 'rejected': return <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 rounded-full">Abgelehnt</span>;
    }
  };

  const handleConfirmDelete = () => {
    if (requestToDelete) {
      onDeleteAbsenceRequest(requestToDelete.id);
      setRequestToDelete(null);
    }
  };
  
  const handleActionClick = (id: number, status: 'approved' | 'rejected') => {
    setActionTarget({ id, status });
  };

  const handleConfirmAction = (comment: string) => {
    if (actionTarget) {
      onUpdateRequestStatus(actionTarget.id, actionTarget.status, comment.trim() || undefined);
      setActionTarget(null);
    }
  };

  const filteredRequests = useMemo(() => {
    if (selectedEmployeeId === 'all') {
      return absenceRequests;
    }
    return absenceRequests.filter(req => req.employeeId === Number(selectedEmployeeId));
  }, [absenceRequests, selectedEmployeeId]);


  const pendingRequests = filteredRequests.filter(r => r.status === 'pending');
  const processedRequests = filteredRequests.filter(r => r.status !== 'pending');

  const vacationRequests = processedRequests.filter(r => r.type === AbsenceType.Vacation).slice().reverse();
  const sickLeaveRequests = processedRequests.filter(r => r.type === AbsenceType.SickLeave).slice().reverse();
  const timeOffRequests = processedRequests.filter(r => r.type === AbsenceType.TimeOff).slice().reverse();
  
  const employeeOptions = useMemo(() => [
    { id: 'all', name: 'Alle Mitarbeiter anzeigen' },
    ...employees.map(emp => ({ id: String(emp.id), name: `${emp.firstName} ${emp.lastName}` }))
  ], [employees]);

  const selectedEmployeeName = employeeOptions.find(opt => opt.id === selectedEmployeeId)?.name || 'Alle Mitarbeiter anzeigen';


  const renderRequestList = (requests: AbsenceRequest[]) => (
    <div className="space-y-3">
        {requests.map(req => (
          <div key={req.id} className="p-3 bg-gray-50 rounded-lg border">
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="font-semibold">{getAbsenceLabel(req.type)}</p>
                  {selectedEmployeeId === 'all' && <p className="text-sm text-gray-600">Mitarbeiter: {getEmployeeName(req.employeeId)}</p>}
                <p className="text-sm text-gray-600">
                  {new Date(req.startDate).toLocaleDateString('de-DE')} - {new Date(req.endDate).toLocaleDateString('de-DE')}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {getStatusChip(req.status)}
                <button 
                  onClick={() => setRequestToDelete(req)} 
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  aria-label="Antrag löschen"
                >
                  <TrashIcon className="h-5 w-5"/>
                </button>
              </div>
            </div>
            {req.adminComment && (
              <p className="mt-2 pt-2 border-t border-gray-200 text-sm text-gray-600 italic">
                  <span className="font-medium not-italic text-gray-700">Kommentar:</span> "{req.adminComment}"
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
          <div className="w-full sm:w-1/2 lg:w-1/3 mb-4">
             <SelectorButton
                label="Mitarbeiter filtern"
                value={selectedEmployeeName}
                placeholder="Auswählen..."
                onClick={() => setIsEmployeeModalOpen(true)}
            />
          </div>
        </Card>
        
        <Card>
          <h2 className="text-xl font-bold text-center mb-4">Offene Anträge</h2>
          <div className="space-y-4">
            {pendingRequests.length > 0 ? (
              pendingRequests.map(req => (
                <div key={req.id} className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">{getAbsenceLabel(req.type)}</p>
                      {selectedEmployeeId === 'all' && <p className="text-sm text-gray-600">Mitarbeiter: {getEmployeeName(req.employeeId)}</p>}
                      <p className="text-sm text-gray-600">
                        Zeitraum: {new Date(req.startDate).toLocaleDateString('de-DE')} - {new Date(req.endDate).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    {getStatusChip(req.status)}
                  </div>
                  <div className="flex gap-4 mt-4 pt-4 border-t">
                    <Button onClick={() => handleActionClick(req.id, 'rejected')} className="w-full bg-red-600 hover:bg-red-700">Ablehnen</Button>
                    <Button onClick={() => handleActionClick(req.id, 'approved')} className="w-full bg-green-600 hover:bg-green-700">Genehmigen</Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500">Keine offenen Anträge.</p>
            )}
          </div>
        </Card>
        
        <Card>
          <h2 className="text-xl font-bold text-center mb-4">Bearbeitete Anträge</h2>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Urlaub</h3>
            {vacationRequests.length > 0 ? renderRequestList(vacationRequests) : <p className="text-center text-gray-500 text-sm py-2">Keine Urlaubsanträge.</p>}
          </div>
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Krankmeldungen</h3>
            {sickLeaveRequests.length > 0 ? renderRequestList(sickLeaveRequests) : <p className="text-center text-gray-500 text-sm py-2">Keine Krankmeldungen.</p>}
          </div>
           <div className="mt-6 pt-6 border-t">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Freizeitausgleich</h3>
            {timeOffRequests.length > 0 ? renderRequestList(timeOffRequests) : <p className="text-center text-gray-500 text-sm py-2">Kein Freizeitausgleich.</p>}
          </div>
        </Card>
      </div>

      <ActionConfirmationModal 
        isOpen={!!actionTarget} 
        onClose={() => setActionTarget(null)} 
        onConfirm={handleConfirmAction} 
        status={actionTarget?.status || 'approved'} 
      />

      <ConfirmModal
        isOpen={!!requestToDelete}
        onClose={() => setRequestToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Antrag löschen"
        message={`Möchten Sie den Antrag von ${getEmployeeName(requestToDelete?.employeeId || 0)} wirklich endgültig löschen?`}
        confirmText="Ja, löschen"
      />
      <SelectionModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSelect={(item) => setSelectedEmployeeId(item.id)}
        items={employeeOptions}
        title="Mitarbeiter auswählen"
        selectedValue={selectedEmployeeId}
      />
    </>
  );
};