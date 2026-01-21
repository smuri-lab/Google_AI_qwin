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
import { calculateBalance, formatHoursAndMinutes, calculateAbsenceDaysInMonth, calculateAnnualVacationTaken, getContractDetailsForDate, calculateAnnualSickDays, exportTimesheet, getAbsenceTypeDetails } from '../utils';
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

const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const getYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -5; i < 5; i++) {
        years.push(currentYear + i);
    }
    return years;
};

const TimeTrackingOverview: React.FC<TimeTrackingManagementProps> = ({ 
    timeEntries, 
    employees, 
    customers, 
    activities,
    holidaysByYear,
    absenceRequests,
    timeBalanceAdjustments,
    onAddTimeEntry,
    onUpdateTimeEntry,
    onDeleteTimeEntry,
    selectedState,
    onEnsureHolidaysForYear,
    addAbsenceRequest,
    addTimeBalanceAdjustment,
    onUpdateAbsenceRequest,
    onDeleteAbsenceRequest,
    onUpdateTimeBalanceAdjustment,
    onDeleteTimeBalanceAdjustment,
    companySettings
}) => {
  const [activeEmployeeId, setActiveEmployeeId] = useState<number | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [entryToEdit, setEntryToEdit] = useState<TimeEntry | null>(null);
  const [itemToEdit, setItemToEdit] = useState<AbsenceRequest | TimeBalanceAdjustment | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [addModalState, setAddModalState] = useState<'closed' | 'choice' | 'time' | 'absence' | 'payout' | 'correction'>('closed');
  const monthPickerRef = useRef<HTMLDivElement>(null);
  const [stagedDate, setStagedDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const [dateForNewEntry, setDateForNewEntry] = useState<string | null>(null);
  
  const timeFormat = companySettings.adminTimeFormat || 'hoursMinutes';

  useEffect(() => {
    onEnsureHolidaysForYear(viewDate.getFullYear());
  }, [viewDate, onEnsureHolidaysForYear]);

  const employeeOverviewStats = useMemo(() => {
    const now = new Date();
    const calculationEndDate = new Date(now.getFullYear(), now.getMonth(), 0); // End of previous month
    calculationEndDate.setHours(23, 59, 59, 999);

    const currentYear = now.getFullYear();
    const holidaysForYear = holidaysByYear[currentYear] || [];
    const previousYear = currentYear - 1;

    return employees.filter(e => e.isActive).map(emp => {
        const timeBalance = calculateBalance(
          emp, 
          calculationEndDate, 
          timeEntries, 
          absenceRequests, 
          timeBalanceAdjustments, 
          holidaysByYear
        );

        const contract = getContractDetailsForDate(emp, now);
        const vacationTaken = calculateAnnualVacationTaken(emp.id, absenceRequests, currentYear, holidaysForYear);
        
        const carryoverDays = emp.vacationCarryover?.[previousYear] || 0;
        const totalAvailableDays = contract.vacationDays + carryoverDays;
        const vacationRemaining = totalAvailableDays - vacationTaken;

        const sickDaysTaken = calculateAnnualSickDays(emp.id, absenceRequests, currentYear, holidaysForYear);

        return { id: emp.id, name: `${emp.firstName} ${emp.lastName}`, timeBalance, vacationRemaining, sickDaysTaken };
    });
  }, [employees, timeEntries, holidaysByYear, absenceRequests, timeBalanceAdjustments]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
        setIsMonthPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  useEffect(() => {
    setStagedDate({ year: viewDate.getFullYear(), month: viewDate.getMonth() });
  }, [viewDate]);
  
  const activeEmployee = useMemo(() => employees.find(e => e.id === activeEmployeeId), [employees, activeEmployeeId]);

  const changeMonth = (offset: number) => {
    setViewDate(current => {
      const newDate = new Date(current);
      newDate.setDate(1);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };

  const handleApplyDateChange = () => {
    setViewDate(new Date(stagedDate.year, stagedDate.month, 1));
    setIsMonthPickerOpen(false);
  };

  const monthlyStats = useMemo(() => {
    if (!activeEmployee) return null;

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const previousMonthEndDate = new Date(year, month, 0);
    previousMonthEndDate.setHours(23, 59, 59, 999);
    const currentMonthEndDate = new Date(year, month + 1, 0);
    currentMonthEndDate.setHours(23, 59, 59, 999);
    
    const previousBalance = calculateBalance(
        activeEmployee,
        previousMonthEndDate,
        timeEntries,
        absenceRequests,
        timeBalanceAdjustments,
        holidaysByYear
    );
    
    const endOfMonthBalance = calculateBalance(
        activeEmployee,
        currentMonthEndDate,
        timeEntries,
        absenceRequests,
        timeBalanceAdjustments,
        holidaysByYear
    );
    
    const contractForMonth = getContractDetailsForDate(activeEmployee, new Date(year, month, 1));
    const currentMonthTargetHours = contractForMonth.monthlyTargetHours;
    
    const totalCreditedHours = endOfMonthBalance - previousBalance + currentMonthTargetHours;

    return { previousBalance, totalCreditedHours, currentMonthTargetHours, endOfMonthBalance };
  }, [activeEmployee, viewDate, timeEntries, holidaysByYear, absenceRequests, timeBalanceAdjustments]);


  const monthlyCalendarItems = useMemo(() => {
    if (activeEmployeeId === null) return [];
    
    const activeEmployee = employees.find(e => e.id === activeEmployeeId);
    if (!activeEmployee) return [];

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const holidaysForYear = holidaysByYear[year] || [];
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    const allItems: any[] = [];

    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        const currentDate = new Date(d);
        const dateStr = currentDate.toLocaleDateString('sv-SE');
        
        const contractForDay = getContractDetailsForDate(activeEmployee, currentDate);
        const dayOfWeek = currentDate.getDay();
        let dailyTargetHours = 0;
        if (contractForDay.targetHoursModel === TargetHoursModel.Weekly && contractForDay.weeklySchedule) {
            const dayKeys: (keyof WeeklySchedule)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            dailyTargetHours = contractForDay.weeklySchedule[dayKeys[dayOfWeek]] || 0;
        } else {
            const isWeekendForModel = dayOfWeek === 0 || dayOfWeek === 6;
            if (!isWeekendForModel) {
                dailyTargetHours = contractForDay.dailyTargetHours;
            }
        }

        const holiday = holidaysForYear.find(h => h.date === dateStr);
        const entriesForDay = timeEntries.filter(entry => 
            entry.employeeId === activeEmployeeId && 
            new Date(entry.start).toLocaleDateString('sv-SE') === dateStr
        );
        const absence = absenceRequests.find(req => 
            req.employeeId === activeEmployeeId &&
            req.status === 'approved' &&
            dateStr >= req.startDate &&
            dateStr <= req.endDate
        );
        const adjustmentsForDay = timeBalanceAdjustments.filter(adj => 
            adj.employeeId === activeEmployeeId && adj.date === dateStr
        );

        adjustmentsForDay.forEach(adj => {
            allItems.push({
                date: currentDate,
                sortTime: new Date(currentDate).setHours(23, 0, 0, 0),
                type: 'adjustment' as const,
                data: adj,
                id: `adjustment-${adj.id}`
            });
        });

        if (entriesForDay.length > 0) {
            entriesForDay.forEach(entry => {
                allItems.push({
                    date: new Date(entry.start),
                    sortTime: new Date(entry.start).getTime(),
                    type: 'entry' as const,
                    data: entry,
                    id: `entry-${entry.id}`,
                    holidayName: holiday?.name,
                });
            });
            if (holiday && dailyTargetHours > 0 && !absence) {
                const sortTime = new Date(currentDate).setHours(0, 0, 0, 1);
                allItems.push({ date: currentDate, sortTime, type: 'holiday' as const, data: holiday, dailyTargetHours, id: `holiday-credit-${dateStr}` });
            }
        } else {
            const sortTime = new Date(currentDate).setHours(0, 0, 0, 0);
            if (absence) {
                allItems.push({ date: currentDate, sortTime, type: 'absence' as const, data: absence, dailyTargetHours, id: `absence-${absence.id}-${dateStr}` });
            } else if (holiday) {
                if (dailyTargetHours > 0) {
                    allItems.push({ date: currentDate, sortTime, type: 'holiday' as const, data: holiday, dailyTargetHours, id: `holiday-${dateStr}` });
                } else {
                    allItems.push({ date: currentDate, sortTime, type: 'weekend' as const, data: { date: currentDate, holidayName: holiday.name }, id: `weekend-${dateStr}` });
                }
            } else if (dailyTargetHours === 0) {
                 if (adjustmentsForDay.length === 0) {
                    allItems.push({ date: currentDate, sortTime, type: 'weekend' as const, data: { date: currentDate }, id: `weekend-${dateStr}` });
                 }
            } else {
                 if (adjustmentsForDay.length === 0) { // Only show empty if no adjustment
                    allItems.push({ date: currentDate, sortTime, type: 'emptyWorkday' as const, data: { date: currentDate }, id: `empty-${dateStr}` });
                 }
            }
        }
    }
    
    return allItems.sort((a, b) => a.sortTime - b.sortTime);

  }, [timeEntries, absenceRequests, holidaysByYear, timeBalanceAdjustments, activeEmployeeId, viewDate, employees]);

  const handleSelectEmployee = (employeeId: number) => {
    setActiveEmployeeId(employeeId);
    setViewDate(new Date());
  };

  const handleEmptyDayClick = (date: Date) => {
    setDateForNewEntry(date.toLocaleDateString('sv-SE'));
    setAddModalState('choice');
  };

  const handleConfirmExport = (selectedEmployees: Employee[], year: number, selectedMonths: number[]) => {
    selectedEmployees.forEach(employee => {
        selectedMonths.forEach(month => {
            exportTimesheet({
                employee, year, month,
                allTimeEntries: timeEntries,
                allAbsenceRequests: absenceRequests,
                customers, activities,
                selectedState,
                companySettings,
                holidays: holidaysByYear[year] || [],
                timeFormat,
            });
        });
    });
    setIsExportModalOpen(false);
  };
  
  const handleAddEntry = (entry: Omit<TimeEntry, 'id' | 'employeeId'>) => {
      if(activeEmployeeId !== null) {
          onAddTimeEntry(entry, activeEmployeeId);
          setAddModalState('closed');
      }
  };

  const handleSaveAbsence = (data: Partial<AbsenceRequest>) => {
    if (data.id) { // UPDATE
        onUpdateAbsenceRequest(data as AbsenceRequest);
    } else { // CREATE
        addAbsenceRequest(data as Omit<AbsenceRequest, 'id' | 'status'>, 'approved');
    }
    setAddModalState('closed');
    setItemToEdit(null);
  };
  
  const handleSaveAdjustment = (data: TimeBalanceAdjustmentFormData | TimeBalanceAdjustment) => {
    if ('id' in data) { // UPDATE
        onUpdateTimeBalanceAdjustment(data as TimeBalanceAdjustment);
    } else { // CREATE
        if (activeEmployeeId !== null) {
            addTimeBalanceAdjustment({ ...data, employeeId: activeEmployeeId });
        }
    }
    setAddModalState('closed');
    setItemToEdit(null);
  };
  
  const handleDeleteAbsence = (id: number) => {
    onDeleteAbsenceRequest(id);
    setAddModalState('closed');
    setItemToEdit(null);
  }
  
  const handleDeleteAdjustment = (id: number) => {
      onDeleteTimeBalanceAdjustment(id);
      setAddModalState('closed');
      setItemToEdit(null);
  }

  const isEditingAbsence = itemToEdit && 'startDate' in itemToEdit;
  const isEditingAdjustment = itemToEdit && 'hours' in itemToEdit;

  if (activeEmployeeId !== null && activeEmployee) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <Button onClick={() => setActiveEmployeeId(null)} className="bg-gray-500 hover:bg-gray-600 flex items-center gap-2">
                <ArrowUturnLeftIcon className="h-5 w-5" /> Zurück zur Übersicht
            </Button>
            <Button onClick={() => setAddModalState('choice')} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                <PlusIcon className="h-5 w-5" /> Eintrag hinzufügen
            </Button>
        </div>

        <Card>
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><ChevronLeftIcon className="h-5 w-5 text-gray-600" /></button>
                <div ref={monthPickerRef} className="text-center relative">
                    <button onClick={() => setIsMonthPickerOpen(p => !p)} className="hover:bg-gray-100 p-2 rounded-lg">
                        <h2 className="text-xl font-bold">{activeEmployee.firstName} {activeEmployee.lastName}</h2>
                        <p className="font-semibold text-gray-600">{viewDate.toLocaleString('de-DE', { month: 'long', year: 'numeric' })}</p>
                    </button>
                    {isMonthPickerOpen && (
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white p-4 rounded-lg shadow-xl z-20 border w-80">
                            <div className="grid grid-cols-2 gap-4">
                                <Select label="Monat" value={stagedDate.month} onChange={e => setStagedDate(prev => ({ ...prev, month: Number(e.target.value) }))}>
                                    {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                </Select>
                                <Select label="Jahr" value={stagedDate.year} onChange={e => setStagedDate(prev => ({ ...prev, year: Number(e.target.value) }))}>
                                    {getYears().map(y => <option key={y} value={y}>{y}</option>)}
                                </Select>
                            </div>
                            <Button onClick={handleApplyDateChange} className="w-full mt-4 bg-blue-600 hover:bg-blue-700">Anzeigen</Button>
                        </div>
                    )}
                </div>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><ChevronRightIcon className="h-5 w-5 text-gray-600" /></button>
            </div>
            
            {monthlyStats && (
                activeEmployee.dashboardType === 'simplified' ? (
                     <div className="grid grid-cols-1 gap-4 text-center border-t pt-4">
                         <div>
                            <p className="text-sm text-gray-500">Ist-Stunden</p>
                            <p className="font-bold text-lg text-blue-600">{formatHoursAndMinutes(monthlyStats.totalCreditedHours, timeFormat)}</p>
                         </div>
                     </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center border-t pt-4">
                        <div>
                            <p className="text-sm text-gray-500">Übertrag Vormonat</p>
                            <p className="font-bold text-lg">{formatHoursAndMinutes(monthlyStats.previousBalance, timeFormat)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Ist-Stunden</p>
                            <p className="font-bold text-lg text-blue-600">{formatHoursAndMinutes(monthlyStats.totalCreditedHours, timeFormat)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Soll-Stunden</p>
                            <p className="font-bold text-lg text-gray-700">{formatHoursAndMinutes(monthlyStats.currentMonthTargetHours, timeFormat)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Saldo Monatsende</p>
                            <p className={`font-bold text-lg ${monthlyStats.endOfMonthBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatHoursAndMinutes(monthlyStats.endOfMonthBalance, timeFormat)}</p>
                        </div>
                    </div>
                )
            )}
        </Card>
        
        <Card>
            <h3 className="text-xl font-bold mb-4">Ereignisse im {viewDate.toLocaleString('de-DE', { month: 'long' })}</h3>
             <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{companySettings.customerLabel || 'Ereignis'}</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Von - Bis</th>
                            <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pause</th>
                            <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Dauer</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                    {(() => {
                      if (monthlyCalendarItems.length === 0) {
                        return <tr><td colSpan={5} className="text-center py-10 text-gray-500">Keine Einträge für diesen Monat gefunden.</td></tr>;
                      }

                      let lastDisplayedDate = '';

                      return monthlyCalendarItems.map(item => {
                        const itemDate = item.date;
                        const displayDate = itemDate.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
                        const currentDateStr = itemDate.toLocaleDateString('sv-SE');
                        
                        const showDate = currentDateStr !== lastDisplayedDate;
                        if (showDate) {
                            lastDisplayedDate = currentDateStr;
                        }

                        const dateCell = (isDimmed = false) => (
                            <td className={`py-4 px-4 whitespace-nowrap align-top ${isDimmed ? 'text-gray-500' : 'font-normal'}`}>
                                {showDate ? displayDate : ''}
                            </td>
                        );

                        if (item.type === 'entry') {
                            const entry = item.data;
                            const durationHours = ((new Date(entry.end).getTime() - new Date(entry.start).getTime()) / 1000 - entry.breakDurationMinutes * 60) / 3600;
                            return (
                                <tr key={item.id} onClick={() => setEntryToEdit(entry)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                                    {dateCell()}
                                    <td className="py-4 px-4 whitespace-nowrap">
                                        <div className="font-normal">{customers.find(c => c.id === entry.customerId)?.name || 'N/A'}</div>
                                        <div className="text-sm text-gray-500">{activities.find(a => a.id === entry.activityId)?.name || 'N/A'}</div>
                                        {item.holidayName && (
                                            <div className="mt-1 px-2 py-0.5 inline-block bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                                                {item.holidayName}
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-4 px-4 whitespace-nowrap">{new Date(entry.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} - {new Date(entry.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="py-4 px-4 whitespace-nowrap text-right">{entry.breakDurationMinutes} m</td>
                                    <td className="py-4 px-4 whitespace-nowrap text-right font-semibold">{formatHoursAndMinutes(durationHours, timeFormat)}</td>
                                </tr>
                            );
                        }
                        if (item.type === 'adjustment') {
                            const adj = item.data;
                            const isPayout = adj.type === TimeBalanceAdjustmentType.Payout;
                            const hoursClass = adj.hours >= 0 ? 'text-green-600' : 'text-red-600';
                            const label = isPayout ? 'Auszahlung Überstunden' : 'Korrektur Stundenkonto';
                            const sign = adj.hours > 0 ? '+' : '';
                            return (
                                <tr key={item.id} onClick={() => setItemToEdit(adj)} className="bg-yellow-50 cursor-pointer hover:bg-yellow-100 transition-colors">
                                    {dateCell()}
                                    <td className="py-4 px-4 whitespace-nowrap">
                                        <div className="font-semibold text-yellow-800">{label}</div>
                                        {adj.note && <div className="text-sm text-gray-500 italic">"{adj.note}"</div>}
                                    </td>
                                    <td colSpan={2}></td>
                                    <td className={`py-4 px-4 whitespace-nowrap text-right font-semibold ${hoursClass}`}>
                                        {sign}{formatHoursAndMinutes(adj.hours, timeFormat)}
                                    </td>
                                </tr>
                            );
                        }
                        if (item.type === 'absence') {
                            const absence = item.data;
                            const details = getAbsenceTypeDetails(absence.type);
                            let hoursDisplay = '';
                            let hoursClass = '';
                            const dailyHours = item.dailyTargetHours || 0;

                            if (absence.type === AbsenceType.TimeOff) {
                                hoursDisplay = formatHoursAndMinutes(-dailyHours, timeFormat);
                                hoursClass = 'text-red-600';
                            } else {
                                hoursDisplay = `+${formatHoursAndMinutes(dailyHours, timeFormat)}`;
                                hoursClass = 'text-green-600';
                            }

                            return (
                                <tr key={item.id} onClick={() => setItemToEdit(absence)} className={`${details.bgClass} cursor-pointer hover:brightness-95 transition-all`}>
                                    {dateCell()}
                                    <td className={`py-4 px-4 whitespace-nowrap font-semibold ${details.textClass}`}>{details.label}</td>
                                    <td className="py-4 px-4"></td>
                                    <td className="py-4 px-4"></td>
                                    <td className={`py-4 px-4 whitespace-nowrap text-right font-semibold ${hoursClass}`}>{hoursDisplay}</td>
                                </tr>
                            );
                        }
                        if (item.type === 'holiday') {
                            const holiday = item.data;
                            const dailyHours = item.dailyTargetHours || 0;
                            return (
                                <tr key={item.id} onClick={() => handleEmptyDayClick(item.date)} className="bg-red-50 cursor-pointer hover:bg-red-100 transition-colors">
                                    {dateCell()}
                                    <td className="py-4 px-4 whitespace-nowrap font-semibold text-red-800">{holiday.name} (Feiertag)</td>
                                    <td className="py-4 px-4"></td>
                                    <td className="py-4 px-4"></td>
                                    <td className="py-4 px-4 whitespace-nowrap text-right font-semibold text-green-600">+{formatHoursAndMinutes(dailyHours, timeFormat)}</td>
                                </tr>
                            );
                        }
                        if (item.type === 'weekend') {
                            if (item.data.holidayName) {
                                return (
                                    <tr key={item.id} onClick={() => handleEmptyDayClick(item.date)} className="bg-red-50 cursor-pointer hover:bg-red-100 transition-colors">
                                        {dateCell(true)}
                                        <td className="py-4 px-4 whitespace-nowrap font-semibold text-red-800">{item.data.holidayName} (Feiertag)</td>
                                        <td colSpan={3} className="py-4 px-4"></td>
                                    </tr>
                                );
                            }
                            return (
                                <tr key={item.id} onClick={() => handleEmptyDayClick(item.date)} className="bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                                    {dateCell(true)}
                                    <td colSpan={4} className="py-4 px-4"></td>
                                </tr>
                            );
                        }
                        if (item.type === 'emptyWorkday') {
                           return (
                                <tr key={item.id} onClick={() => handleEmptyDayClick(item.date)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                                    {dateCell(true)}
                                    <td colSpan={4} className="py-4 px-4 text-gray-400 italic">Keine Einträge</td>
                                </tr>
                            );
                        }
                        return null;
                      });
                    })()}
                    </tbody>
                </table>
            </div>
        </Card>

        {entryToEdit && (<EntryDetailModal entry={entryToEdit} customers={customers} activities={activities} timeEntries={timeEntries} onClose={() => setEntryToEdit(null)} onUpdate={onUpdateTimeEntry} onDelete={onDeleteTimeEntry} isAdminView={true} companySettings={companySettings} />)}
        
        {addModalState === 'choice' && activeEmployeeId !== null && (
            <AddEntryChoiceModal
                onClose={() => { setAddModalState('closed'); setDateForNewEntry(null); }}
                onSelect={(choice) => setAddModalState(choice as any)}
            />
        )}
        {addModalState === 'time' && activeEmployeeId !== null && (
            <ManualEntryFormModal
                isOpen={true}
                onClose={() => { setAddModalState('closed'); setDateForNewEntry(null); }}
                addTimeEntry={handleAddEntry}
                onSuccess={() => {}}
                initialDate={dateForNewEntry}
                timeEntries={timeEntries.filter(e => e.employeeId === activeEmployeeId)}
                customers={customers}
                activities={activities}
                companySettings={companySettings}
                absenceRequests={absenceRequests.filter(req => req.employeeId === activeEmployeeId)}
            />
        )}
        {(addModalState === 'absence' || isEditingAbsence) && activeEmployeeId !== null && (
            <AbsenceFormModal
                isOpen={true}
                onClose={() => { setAddModalState('closed'); setItemToEdit(null); setDateForNewEntry(null); }}
                onSave={handleSaveAbsence}
                onDelete={handleDeleteAbsence}
                employees={employees}
                initialData={isEditingAbsence ? itemToEdit : { employeeId: activeEmployeeId, startDate: dateForNewEntry || undefined, endDate: dateForNewEntry || undefined }}
                allAbsenceRequests={absenceRequests}
                allTimeEntries={timeEntries}
                companySettings={companySettings}
            />
        )}
        {(addModalState === 'payout' || addModalState === 'correction' || isEditingAdjustment) && activeEmployeeId !== null && (
            <TimeBalanceAdjustmentModal
                isOpen={true}
                onClose={() => { setAddModalState('closed'); setItemToEdit(null); setDateForNewEntry(null); }}
                onSave={handleSaveAdjustment}
                onDelete={handleDeleteAdjustment}
                type={isEditingAdjustment ? itemToEdit.type : addModalState as 'payout' | 'correction'}
                initialData={isEditingAdjustment ? itemToEdit : (dateForNewEntry ? { date: dateForNewEntry } : null)}
                companySettings={companySettings}
            />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-end">
             <Button onClick={() => setIsExportModalOpen(true)} className="bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2">
                <DocumentArrowDownIcon className="h-5 w-5" />
                Stundenzettel exportieren
            </Button>
        </div>

        <Card>
            <h2 className="text-xl font-bold mb-4">Mitarbeiter-Übersicht</h2>
            <p className="text-sm text-gray-500 mb-4">Klicken Sie auf einen Mitarbeiter, um die monatliche Detailansicht zu öffnen.</p>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mitarbeiter</th>
                            <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stundenkonto (Ende Vormonat)</th>
                            <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Resturlaub (Jahr)</th>
                            <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Krankheitstage (Jahr)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {employeeOverviewStats.map(stat => (
                            <tr key={stat.id} onClick={() => handleSelectEmployee(stat.id)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                                <td className="py-4 px-4 whitespace-nowrap font-normal">{stat.name}</td>
                                <td className={`py-4 px-4 whitespace-nowrap text-right font-semibold ${stat.timeBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatHoursAndMinutes(stat.timeBalance, timeFormat)}</td>
                                <td className="py-4 px-4 whitespace-nowrap text-right">{stat.vacationRemaining} Tage</td>
                                <td className="py-4 px-4 whitespace-nowrap text-right">{stat.sickDaysTaken} Tage</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {employeeOverviewStats.length === 0 && (<p className="text-center text-gray-500 py-4">Keine aktiven Mitarbeiter gefunden.</p>)}
            </div>
        </Card>
        
        {isExportModalOpen && (<TimesheetExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} onConfirm={handleConfirmExport} employees={employees} />)}
    </div>
  );
};

export const TimeTrackingManagement: React.FC<TimeTrackingManagementProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'utilization'>('overview');

  const tabs = [
    { id: 'overview', label: 'Übersicht & Bearbeitung' },
    { id: 'utilization', label: 'Auslastung' },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'overview' && (
          <TimeTrackingOverview {...props} />
        )}
        {activeTab === 'utilization' && (
          <UtilizationView
            employees={props.employees}
            timeEntries={props.timeEntries}
            absenceRequests={props.absenceRequests}
            holidaysByYear={props.holidaysByYear}
            onEnsureHolidaysForYear={props.onEnsureHolidaysForYear}
            companySettings={props.companySettings}
          />
        )}
      </div>
    </div>
  );
};