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
  elapsedTime: number;
  stopwatchCustomerId: string;
  stopwatchActivityId: string;
  stopwatchComment: string;
  isBreakModalOpen: boolean;
  setIsBreakModalOpen: (isOpen: boolean) => void;
  setIsRunning: (isRunning: boolean) => void;
  setStartTime: (date: Date | null) => void;
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
    isRunning, elapsedTime, stopwatchCustomerId, stopwatchActivityId,
    stopwatchComment, isBreakModalOpen, setIsBreakModalOpen, setIsRunning, setStartTime, setElapsedTime,
    setStopwatchCustomerId, setStopwatchActivityId, setStopwatchComment
  } = props;
  
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    if (showSuccessMessage) {
        const timer = setTimeout(() => {
            setShowSuccessMessage(false);
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  // FIX: Added async/await to handle the asynchronous export function and passed the required 'holidays' property.
  const handleConfirmExport = async (selectedEmployees: Employee[], year: number, selectedMonths: number[]) => {
      if (selectedEmployees.length === 0) return;
      const employee = selectedEmployees[0]; // In dashboard, it's always the current user

      for (const month of selectedMonths) {
          await exportTimesheet({
              employee, year, month,
              allTimeEntries: timeEntries,
              allAbsenceRequests: absenceRequests,
              customers, activities,
              selectedState,
              companySettings,
              holidays,
          });
      }

      setIsExportModalOpen(false);
  };


  const timeBalanceColor = userAccount.timeBalanceHours > 0
    ? 'text-green-600'
    : userAccount.timeBalanceHours < 0
      ? 'text-red-600'
      : 'text-blue-600';
  
  const formattedTimeBalance = formatHoursAndMinutes(userAccount.timeBalanceHours);
  const formattedWorkedHours = formatHoursAndMinutes(currentMonthWorkedHours);
  
  const carryoverDays = userAccount.vacationCarryover || 0;
  const annualEntitlement = userAccount.vacationAnnualEntitlement || 0;

  // Logic for carryover warning
  const MOCK_TODAY = new Date(mockCurrentYear, 1, 15); // Simulate being in February to show the warning
  const deadline = new Date(mockCurrentYear, 2, 31); // March 31st
  const showCarryoverWarning = carryoverDays > 0 && MOCK_TODAY <= deadline;

  const statsCards = (
      <div className={`grid ${dashboardType === 'standard' ? 'grid-cols-3' : 'grid-cols-2'} gap-2 sm:gap-4`}>
        {dashboardType === 'standard' && (
          <Card className="text-center !p-2 sm:!p-4">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-500 truncate">Stundenkonto</h3>
            <p className={`text-xl sm:text-2xl font-bold ${timeBalanceColor}`}>{formattedTimeBalance}</p>
          </Card>
        )}
        <Card className="text-center !p-2 sm:!p-4">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-500 truncate">Ist-Stunden</h3>
            <p className="text-xl sm:text-2xl font-bold text-gray-800">{formattedWorkedHours}</p>
        </Card>
        <Card className="text-center !p-2 sm:!p-4">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-500 truncate">Urlaub</h3>
          <p className="text-xl sm:text-2xl font-bold text-green-600">{userAccount.vacationDaysLeft} Tage</p>
           {carryoverDays > 0 && annualEntitlement > 0 && (
              <p className="text-2xs sm:text-xs text-gray-500 mt-1">
                  ({annualEntitlement} Anspruch + {carryoverDays} Übertrag)
              </p>
          )}
        </Card>
      </div>
  );

  const mainContent = (
      timeTrackingMethod === 'manual' ? (
          <Card>
            <ManualEntryForm 
              addTimeEntry={addTimeEntry}
              timeEntries={timeEntries}
              customers={customers}
              activities={activities}
              onCancel={undefined}
              companySettings={companySettings}
              onSuccess={() => setShowSuccessMessage(true)}
            />
          </Card>
      ) : (
          <Card>
            <Stopwatch 
              addTimeEntry={addTimeEntry}
              timeEntries={timeEntries}
              customers={customers}
              activities={activities}
              companySettings={companySettings}
              // Pass down lifted state and handlers
              isRunning={isRunning}
              elapsedTime={elapsedTime}
              customerId={stopwatchCustomerId}
              activityId={stopwatchActivityId}
              comment={stopwatchComment}
              isBreakModalOpen={isBreakModalOpen}
              setIsBreakModalOpen={setIsBreakModalOpen}
              setIsRunning={setIsRunning}
              setStartTime={setStartTime}
              setElapsedTime={setElapsedTime}
              setCustomerId={setStopwatchCustomerId}
              setActivityId={setStopwatchActivityId}
              setComment={setStopwatchComment}
              onSuccess={() => setShowSuccessMessage(true)}
            />
          </Card>
      )
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
        
      <div className="space-y-6 max-w-2xl mx-auto">
        {statsCards}

        {showCarryoverWarning && (
            <div className="p-4 bg-yellow-50 text-yellow-800 border-l-4 border-yellow-400 rounded-r-lg flex items-start gap-3 shadow-sm">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Resturlaub verfällt bald</h4>
                  <p className="text-sm">
                    Bitte beachten Sie: Ihr Resturlaub aus dem Vorjahr ({carryoverDays} {carryoverDays === 1 ? 'Tag' : 'Tage'}) muss bis zum 31. März {mockCurrentYear} genommen werden, da er sonst verfällt.
                  </p>
                </div>
            </div>
        )}
        
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
          onClose={() => setIsExportModalOpen(false)}
          onConfirm={handleConfirmExport}
          employees={[currentUser]} 
          fixedEmployee={currentUser} 
        />
      )}
    </>
  );
};