import React, { useState, useEffect } from 'react';
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
    const [animationKey, setAnimationKey] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false); // Reset closing animation state on open
            setAnimationKey(prev => prev + 1); // Force re-render for animation
        }
    }, [isOpen]);

    if (!isOpen) return null;
    
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    return (
        <div key={animationKey} className={`fixed inset-0 bg-black flex items-center justify-center z-30 p-4 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`}>
            <Card className={`w-full max-w-lg relative max-h-[90vh] flex flex-col ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={(e) => e.stopPropagation()}>
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
                    <XIcon className="h-6 w-6" />
                </button>
                <div className="flex-grow overflow-y-auto">
                    <ManualEntryForm
                        addTimeEntry={addTimeEntry}
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
        </div>
    );
};