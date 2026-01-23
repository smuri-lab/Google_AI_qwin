import React, { useState, useEffect } from 'react';
import type { TimeEntry, Customer, Activity, UserAccount, Employee, AbsenceRequest, Holiday, CompanySettings } from '../types';
import { Stopwatch } from './Stopwatch';
import { ManualEntryForm } from './ManualEntryForm';
import { Card } from './ui/Card';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { TimesheetExportModal } from './admin/TimesheetExportModal';
import { formatHoursAndMinutes, exportTimesheet } from './utils';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { Button } from './ui/Button';


interface DashboardProps {
  currentUser: Employee;
  addTimeEntry: (entry: Omit<TimeEntry, 'id' | 'employeeId'>) => void;
  timeEntries: TimeEntry[];
  customers: Customer[];
  activities: Activity[];
  userAccount: UserAccount;
  currentMonthWorkedHours: number;
  timeTrackingMethod: 'all' | 'manual';
  dashboardType: 'standard' | 'simplified';
  absenceRequests: AbsenceRequest[];
  holidays: Holiday[];
  selectedState: string;
  companySettings: CompanySettings;
  mockCurrentYear: number;
  // Stopwatch state and handlers
  isRunning: boolean;
  startTime: Date | null;
  stopTime: Date | null;
  elapsedTime: number;
  stopwatchCustomerId: string;
  stopwatchActivityId: string;
  stopwatchComment: string;
  isBreakModalOpen: boolean;
  setIsBreakModalOpen: (isOpen: boolean) => void;
  setIsRunning: (isRunning: boolean) => void;
  setStartTime: (date: Date | null) => void;
  setStopTime: (date: Date | null) => void;
  setElapsedTime: (time: number) => void;
  setStopwatchCustomerId: (id: string) => void;
  setStopwatchActivityId: (id: string) => void;
  setStopwatchComment: (comment: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = (props) => {
  const { 
    currentUser, addTimeEntry, timeEntries, customers, activities, userAccount, 
    currentMonthWorkedHours, timeTrackingMethod, dashboardType, absenceRequests, holidays, 
    selectedState, companySettings, mockCurrentYear,
    // Stopwatch props
    isRunning, startTime, stopTime, elapsedTime, stopwatchCustomerId, stopwatchActivityId,
    stopwatchComment, isBreakModalOpen, setIsBreakModalOpen, setIsRunning, setStartTime, setStopTime, setElapsedTime,
    setStopwatchCustomerId, setStopwatchActivityId, setStopwatchComment
  } = props;
  
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportModalClosing, setIsExportModalClosing] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isCarryoverInfoOpen, setIsCarryoverInfoOpen] = useState(false);
  const [isCarryoverClosing, setIsCarryoverClosing] = useState(false);
  
  const timeFormat = companySettings.employeeTimeFormat || 'hoursMinutes';

  useEffect(() => {
    if (showSuccessMessage) {
        const timer = setTimeout(() => {
            setShowSuccessMessage(false);
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  const handleExportModalClose = () => {
    setIsExportModalClosing(true);
    setTimeout(() => {
      setIsExportModalOpen(false);
      setIsExportModalClosing(false);
    }, 300);
  };
  
  const handleConfirmExport = (selectedEmployees: Employee[], year: number, selectedMonths: number[]) => {
      if (selectedEmployees.length === 0) return;
      const employee = selectedEmployees[0]; // In dashboard, it's always the current user

      selectedMonths.forEach(month => {
          exportTimesheet({
              employee, year, month,
              allTimeEntries: timeEntries,
              allAbsenceRequests: absenceRequests,
              customers, activities,
              selectedState,
              companySettings,
              holidays,
              timeFormat: companySettings.employeeTimeFormat,
          });
      });
      handleExportModalClose();
  };

  const handleCarryoverClose = () => {
    setIsCarryoverClosing(true);
    setTimeout(() => {
      setIsCarryoverInfoOpen(false);
      setIsCarryoverClosing(false); // Reset for next open
    }, 300);
  };

  const timeBalanceColor = userAccount.timeBalanceHours > 0
    ? 'text-green-600'
    : userAccount.timeBalanceHours < 0
      ? 'text-red-600'
      : 'text-blue-600';
  
  const formattedTimeBalance = formatHoursAndMinutes(userAccount.timeBalanceHours, timeFormat);
  const formattedWorkedHours = formatHoursAndMinutes(currentMonthWorkedHours, timeFormat);
  
  const carryoverDays = userAccount.vacationCarryover || 0;

  // Logic for carryover warning
  const MOCK_TODAY = new Date(mockCurrentYear, 1, 15); // Simulate being in February to show the warning
  const deadline = new Date(mockCurrentYear, 2, 31); // March 31st
  const showCarryoverWarning = (currentUser.showVacationWarning ?? true) && carryoverDays > 0 && MOCK_TODAY <= deadline;

  const statsCards = (
      <div className={`grid ${dashboardType === 'standard' ? 'grid-cols-3' : 'grid-cols-2'} gap-2 sm:gap-4`}>
        {dashboardType === 'standard' && (
          <Card className="text-center !p-2 sm:!p-4">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-500 truncate">Stundenkonto</h3>
            <p className={`text-lg sm:text-xl font-bold ${timeBalanceColor} whitespace-nowrap`}>{formattedTimeBalance}</p>
          </Card>
        )}
        <Card className="text-center !p-2 sm:!p-4">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-500 truncate">Ist-Stunden</h3>
            <p className="text-lg sm:text-xl font-bold text-gray-800 whitespace-nowrap">{formattedWorkedHours}</p>
        </Card>
        <Card className="text-center !p-2 sm:!p-4">
          <div className="flex items-center justify-center gap-1">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-500 truncate">Urlaub</h3>
            {showCarryoverWarning && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsCarryoverInfoOpen(true); }}
                className="focus:outline-none"
                aria-label="Resturlaub-Warnung anzeigen"
              >
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
              </button>
            )}
          </div>
          <p className="text-lg sm:text-xl font-bold text-green-600 whitespace-nowrap">{userAccount.vacationDaysLeft} Tage</p>
        </Card>
      </div>
  );

  const mainContent = (
      <Card>
        {timeTrackingMethod === 'manual' ? (
          <ManualEntryForm 
            addTimeEntry={addTimeEntry}
            timeEntries={timeEntries}
            customers={customers}
            activities={activities}
            onCancel={undefined}
            companySettings={companySettings}
            onSuccess={() => setShowSuccessMessage(true)}
            // FIX: Pass absenceRequests to check for conflicts when adding manual entries.
            absenceRequests={absenceRequests}
          />
        ) : (
          <Stopwatch 
            addTimeEntry={addTimeEntry}
            timeEntries={timeEntries}
            customers={customers}
            activities={activities}
            companySettings={companySettings}
            // FIX: Pass absenceRequests to prevent starting stopwatch on days with approved absences.
            absenceRequests={absenceRequests}
            // Pass down lifted state and handlers
            isRunning={isRunning}
            startTime={startTime}
            stopTime={stopTime}
            elapsedTime={elapsedTime}
            customerId={stopwatchCustomerId}
            activityId={stopwatchActivityId}
            comment={stopwatchComment}
            isBreakModalOpen={isBreakModalOpen}
            setIsBreakModalOpen={setIsBreakModalOpen}
            setIsRunning={setIsRunning}
            setStartTime={setStartTime}
            setStopTime={setStopTime}
            setElapsedTime={setElapsedTime}
            setCustomerId={setStopwatchCustomerId}
            setActivityId={setStopwatchActivityId}
            setComment={setStopwatchComment}
            onSuccess={() => setShowSuccessMessage(true)}
          />
        )}
      </Card>
  );

  return (
    <>
      {showSuccessMessage && (
          <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md sm:w-auto p-4 bg-green-100 text-green-800 rounded-lg flex items-center gap-3 shadow-lg z-50 animate-toast-in">
             <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0" />
             <div>
                <p className="font-semibold">Arbeitszeit gespeichert</p>
                <p className="text-sm">Der Eintrag wurde erfolgreich hinzugefügt.</p>
             </div>
          </div>
        )}
        
      {isCarryoverInfoOpen && (
        <div className={`fixed inset-0 bg-black flex items-center justify-center z-50 p-4 ${isCarryoverClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleCarryoverClose}>
          <Card className={`w-full max-w-sm ${isCarryoverClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center space-y-4">
              <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500" />
              <h2 className="text-xl font-bold">Resturlaub verfällt bald</h2>
              <p className="text-sm text-gray-600">
                Bitte beachten Sie: Ihr Resturlaub aus dem Vorjahr ({carryoverDays} {carryoverDays === 1 ? 'Tag' : 'Tage'}) muss bis zum 31. März {mockCurrentYear} genommen werden, da er sonst verfällt.
              </p>
              <Button onClick={handleCarryoverClose} className="w-full bg-blue-600 hover:bg-blue-700 mt-4">
                Verstanden
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="space-y-6 max-w-2xl mx-auto">
        {statsCards}
        
        {companySettings.employeeCanExport && (
          <Card onClick={() => setIsExportModalOpen(true)} className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-700">Meine Stundenzettel</h3>
                    <p className="text-xs sm:text-sm text-gray-500">Monatsübersicht als Excel-Datei herunterladen</p>
                </div>
                <DocumentArrowDownIcon className="h-6 w-6 text-blue-600" />
            </div>
          </Card>
        )}

        {mainContent}
      </div>
      
      {isExportModalOpen && (
        <TimesheetExportModal
          isOpen={isExportModalOpen}
          isClosing={isExportModalClosing}
          onClose={handleExportModalClose}
          onConfirm={handleConfirmExport}
          employees={[currentUser]} 
          fixedEmployee={currentUser} 
        />
      )}
    </>
  );
};