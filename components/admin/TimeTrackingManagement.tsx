import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { TimeEntry, Employee, Customer, Activity, Holiday, AbsenceRequest, TimeBalanceAdjustment, CompanySettings, HolidaysByYear, WeeklySchedule } from '../../types';
import { AbsenceType, TimeBalanceAdjustmentType, TargetHoursModel } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { EntryDetailModal } from '../EntryDetailModal';
import { DocumentArrowDownIcon } from '../icons/DocumentArrowDownIcon';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { ArrowUturnLeftIcon } from '../icons/ArrowUturnLeftIcon';
import { PlusIcon } from '../icons/PlusIcon';
// Pfad korrigiert auf ../../utils
import { calculateBalance, formatHoursAndMinutes, calculateAbsenceDaysInMonth, calculateAnnualVacationTaken, getContractDetailsForDate, calculateAnnualSickDays, exportTimesheet, getAbsenceTypeDetails } from '../../utils';
import { TimesheetExportModal } from './TimesheetExportModal';
import { Select } from '../ui/Select';
import { ManualEntryFormModal } from './ManualEntryFormModal';
import { AddEntryChoiceModal } from './AddEntryChoiceModal';
import { AbsenceFormModal } from './AbsenceFormModal';
import { TimeBalanceAdjustmentModal, type TimeBalanceAdjustmentFormData } from './TimeBalanceAdjustmentModal';
import { UtilizationView } from './UtilizationView';

interface TimeTrackingManagementProps {
  timeEntries: TimeEntry[];
  employees: Employee[];
  customers: Customer[];
  activities: Activity[];
  holidaysByYear: HolidaysByYear;
  absenceRequests: AbsenceRequest[];
  timeBalanceAdjustments: TimeBalanceAdjustment[];
  onAddTimeEntry: (entry: Omit<TimeEntry, 'id' | 'employeeId'>, employeeId: number) => void;
  onUpdateTimeEntry: (entry: TimeEntry) => void;
  onDeleteTimeEntry: (id: number) => void;
  selectedState: string;
  onEnsureHolidaysForYear: (year: number) => void;
  addAbsenceRequest: (request: Omit<AbsenceRequest, 'id' | 'status'>, status: AbsenceRequest['status']) => void;
  addTimeBalanceAdjustment: (adjustment: Omit<TimeBalanceAdjustment, 'id'>) => void;
  onUpdateAbsenceRequest: (request: AbsenceRequest) => void;
  onDeleteAbsenceRequest: (id: number) => void;
  onUpdateTimeBalanceAdjustment: (adjustment: TimeBalanceAdjustment) => void;
  onDeleteTimeBalanceAdjustment: (id: number) => void;
  companySettings: CompanySettings;
}

export const TimeTrackingManagement: React.FC<TimeTrackingManagementProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'utilization'>('overview');

  const tabs = [
    { id: 'overview', label: 'Übersicht & Bearbeitung' },
    { id: 'utilization', label: 'Auslastung' },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'overview' ? <div>Übersicht wird geladen...</div> : <UtilizationView {...props} />}
      </div>
    </div>
  );
};