import React, { useState, useEffect } from 'react';
import type { TimeEntry, Customer, Activity, UserAccount, Employee, AbsenceRequest, Holiday, CompanySettings } from '../types';
import { Stopwatch } from './Stopwatch';
import { ManualEntryForm } from './ManualEntryForm';
import { Card } from './ui/Card';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { TimesheetExportModal } from './admin/TimesheetExportModal';
import { formatHoursAndMinutes, exportTimesheet } from '../utils';
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
  onSuccess?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = (props) => {
  const { 
    currentUser, addTimeEntry, timeEntries, customers, activities, userAccount, 
    currentMonthWorkedHours, timeTrackingMethod, dashboardType, absenceRequests, holidays, 
    selectedState, companySettings, mockCurrentYear,
    isRunning, elapsedTime, stopwatchCustomerId, stopwatchActivityId,
    stopwatchComment, isBreakModalOpen, setIsBreakModalOpen, setIsRunning, setStartTime, setElapsedTime,
    setStopwatchCustomerId, setStopwatchActivityId, setStopwatchComment
  } = props;
  
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleConfirmExport = async (selectedEmployees: Employee[], year: number, selectedMonths: number[]) => {
      if (selectedEmployees.length === 0) return;
      for (const month of selectedMonths) {
          await exportTimesheet({
              employee: selectedEmployees[0], year, month,
              allTimeEntries: timeEntries, allAbsenceRequests: absenceRequests,
              customers, activities, selectedState, companySettings, holidays,
          });
      }
      setIsExportModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className={`grid ${dashboardType === 'standard' ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
        <Card className="text-center shadow-sm">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Stundenkonto</h3>
          <p className={`text-xl font-bold ${userAccount.timeBalanceHours >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatHoursAndMinutes(userAccount.timeBalanceHours)}
          </p>
        </Card>
        <Card className="text-center shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ist-Stunden</h3>
            <p className="text-xl font-bold text-blue-600">{formatHoursAndMinutes(currentMonthWorkedHours)}</p>
        </Card>
        <Card className="text-center shadow-sm">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Urlaub</h3>
          <p className="text-xl font-bold text-orange-600">{userAccount.vacationDaysLeft} Tage</p>
        </Card>
      </div>

      <Card className="shadow-lg border border-gray-100">
        {timeTrackingMethod === 'manual' ? (
          <ManualEntryForm addTimeEntry={addTimeEntry} timeEntries={timeEntries} customers={customers} activities={activities} companySettings={companySettings} absenceRequests={absenceRequests} />
        ) : (
          <Stopwatch {...{addTimeEntry, timeEntries, customers, activities, companySettings, absenceRequests, isRunning, elapsedTime, isBreakModalOpen, setIsBreakModalOpen, setIsRunning, setStartTime, setElapsedTime, setCustomerId: setStopwatchCustomerId, setActivityId: setStopwatchActivityId, setComment: setStopwatchComment, customerId: stopwatchCustomerId, activityId: stopwatchActivityId, comment: stopwatchComment}} />
        )}
      </Card>
      
      {companySettings.employeeCanExport && (
        <Card onClick={() => setIsExportModalOpen(true)} className="cursor-pointer hover:bg-blue-50 transition-all border-dashed border-2 border-gray-200 shadow-none text-center py-4">
            <div className="flex flex-col items-center gap-1">
                <DocumentArrowDownIcon className="h-6 w-6 text-gray-400" />
                <span className="font-semibold text-gray-600">Stundenzettel exportieren</span>
            </div>
        </Card>
      )}

      {isExportModalOpen && <TimesheetExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} onConfirm={handleConfirmExport} employees={[currentUser]} fixedEmployee={currentUser} />}
    </div>
  );
};