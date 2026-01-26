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
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Opening animation
            const timer = setTimeout(() => setIsVisible(true), 10);
            return () => clearTimeout(timer);
        } else {
            // Reset state immediately when closed
            setIsVisible(false);
            setIsClosing(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;
    
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    return ReactDOM.createPortal(
        <div className={`fixed inset-0 flex items-center justify-center z-[9999] p-4 pb-20 md:pb-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : (isVisible ? 'animate-modal-fade-in' : 'bg-transparent')}`}>
            <Card className={`w-full max-w-lg mx-auto relative max-h-[90vh] flex flex-col shadow-2xl ${isClosing ? 'animate-modal-slide-down' : (isVisible ? 'animate-modal-slide-up' : 'opacity-0 translate-y-4')}`} onClick={(e) => e.stopPropagation()}>
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
                    <XIcon className="h-6 w-6" />
                </button>
                <div className="flex-grow min-h-0 flex flex-col">
                    <ManualEntryForm
                        isModal={true}
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
        </div>,
        document.body
    );
};