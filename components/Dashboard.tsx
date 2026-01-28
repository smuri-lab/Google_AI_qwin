
import React, { useState, useEffect, useMemo } from 'react';
import type { TimeEntry, Customer, Activity, UserAccount, Employee, AbsenceRequest, Holiday, CompanySettings, Shift } from '../types';
import { Stopwatch } from './Stopwatch';
import { ManualEntryForm } from './ManualEntryForm';
import { Card } from './ui/Card';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { TimesheetExportModal } from './admin/TimesheetExportModal';
import { formatHoursAndMinutes, exportTimesheet } from './utils';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ClockIcon } from './icons/ClockIcon';


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
  // Shift Props
  shifts: Shift[];
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
    selectedState, companySettings, mockCurrentYear, shifts,
    // Stopwatch props
    isRunning, startTime, stopTime, elapsedTime, stopwatchCustomerId, stopwatchActivityId,
    stopwatchComment, isBreakModalOpen, setIsBreakModalOpen, setIsRunning, setStartTime, setStopTime, setElapsedTime,
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

  const handleConfirmExport = async (selectedEmployees: Employee[], year: number, selectedMonths: number[]) => {
      if (selectedEmployees.length === 0) return;
      const employee = selectedEmployees[0];

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

  // --- SHIFT LOGIC ---
  const todayStr = new Date().toLocaleDateString('sv-SE');
  const upcomingShifts = useMemo(() => {
      const now = new Date();
      return shifts
        .filter(s => new Date(s.end) > now) // Only future or current shifts
        .sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, 3);
  }, [shifts]);

  const nextShift = upcomingShifts[0];

  const isLateForShift = useMemo(() => {
      if (isRunning) return false; // Already clocked in
      if (!nextShift) return false;

      const now = new Date();
      const shiftStart = new Date(nextShift.start);
      // Late if: Now is past start time + 5 minutes grace period
      const gracePeriod = 5 * 60 * 1000; 
      
      // Also check if we are still within the shift (before end)
      const shiftEnd = new Date(nextShift.end);

      if (now.getTime() > (shiftStart.getTime() + gracePeriod) && now < shiftEnd) {
          // Check if there is already a manual entry for today covering this start time
          // (Simple check: entry starts before shift start + grace)
          const hasEntry = timeEntries.some(e => {
              const entryStart = new Date(e.start);
              return entryStart.toDateString() === shiftStart.toDateString() && entryStart.getTime() <= (shiftStart.getTime() + gracePeriod);
          });
          return !hasEntry;
      }
      return false;
  }, [nextShift, isRunning, timeEntries]);


  const timeBalanceColor = userAccount.timeBalanceHours > 0
    ? 'text-green-600'
    : userAccount.timeBalanceHours < 0
      ? 'text-red-600'
      : 'text-blue-600';
  
  const formattedTimeBalance = formatHoursAndMinutes(userAccount.timeBalanceHours);
  const formattedWorkedHours = formatHoursAndMinutes(currentMonthWorkedHours);
  
  const carryoverDays = userAccount.vacationCarryover || 0;
  const annualEntitlement = userAccount.vacationAnnualEntitlement || 0;

  const MOCK_TODAY = new Date(mockCurrentYear, 1, 15);
  const deadline = new Date(mockCurrentYear, 2, 31);
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
              absenceRequests={absenceRequests}
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
              absenceRequests={absenceRequests}
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

        {/* LATE WARNING */}
        {isLateForShift && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-4 shadow-sm animate-pulse">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600 flex-shrink-0" />
                <div>
                    <h3 className="font-bold text-red-800 text-lg">Schichtbeginn verpasst!</h3>
                    <p className="text-red-700">
                        Sie sind für <strong>{new Date(nextShift.start).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</strong> Uhr 
                        ({nextShift.label || 'Schicht'}) eingeteilt, aber noch nicht eingestempelt.
                    </p>
                </div>
            </div>
        )}

        {/* NEXT SHIFT INFO */}
        {nextShift && !isLateForShift && !isRunning && (
             <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                        <ClockIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm text-blue-800 font-semibold">Nächste Schicht</p>
                        <p className="font-bold text-gray-800">
                            {new Date(nextShift.start).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}, {new Date(nextShift.start).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {new Date(nextShift.end).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        </p>
                        <p className="text-xs text-gray-500">{nextShift.label}</p>
                    </div>
                </div>
             </div>
        )}

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
