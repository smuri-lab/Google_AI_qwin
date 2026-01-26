import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { TimeEntry, Customer, Activity, CompanySettings, AbsenceRequest } from '../../types';
import { Card } from '../ui/Card';
import { XIcon } from '../icons/XIcon';
import { ManualEntryForm } from '../ManualEntryForm';

interface ManualEntryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  addTimeEntry: (entry: Omit<TimeEntry, 'id' | 'employeeId'>) => void;
  timeEntries: TimeEntry[];
  customers: Customer[];
  activities: Activity[];
  companySettings: CompanySettings;
  absenceRequests: AbsenceRequest[];
  onSuccess: () => void;
  initialDate?: string | null;
}

export const ManualEntryFormModal: React.FC<ManualEntryFormModalProps> = ({
    isOpen,
    onClose,
    addTimeEntry,
    timeEntries,
    customers,
    activities,
    companySettings,
    absenceRequests,
    onSuccess,
    initialDate,
}) => {
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setIsClosing(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;
    
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    const handleAddTimeEntry = (entry: Omit<TimeEntry, 'id' | 'employeeId'>) => {
        setIsClosing(true);
        setTimeout(() => {
            addTimeEntry(entry);
        }, 300);
    };

    return ReactDOM.createPortal(
        <div className={`fixed inset-0 bg-black flex items-center justify-center z-[100] p-4 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
            <Card className={`w-full max-w-lg relative max-h-[90vh] flex flex-col shadow-2xl ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={(e) => e.stopPropagation()}>
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
                    <XIcon className="h-6 w-6" />
                </button>
                <div className="flex-grow min-h-0 flex flex-col">
                    <ManualEntryForm
                        isModal={true}
                        addTimeEntry={handleAddTimeEntry}
                        timeEntries={timeEntries}
                        customers={customers}
                        activities={activities}
                        onCancel={handleClose}
                        companySettings={companySettings}
                        onSuccess={onSuccess}
                        absenceRequests={absenceRequests}
                        initialDate={initialDate}
                    />
                </div>
            </Card>
        </div>,
        document.body
    );
};