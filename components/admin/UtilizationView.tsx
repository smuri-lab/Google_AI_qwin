import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Employee, TimeEntry, AbsenceRequest, HolidaysByYear, Holiday, WeeklySchedule, CompanySettings } from '../../types';
import { AbsenceType, TargetHoursModel } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { getContractDetailsForDate, formatHoursAndMinutes } from '../utils';
import { XIcon } from '../icons/XIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { FlexibleTimeInput } from '../ui/FlexibleTimeInput';

interface UtilizationViewProps {
  employees: Employee[];
  timeEntries: TimeEntry[];
  absenceRequests: AbsenceRequest[];
  holidaysByYear: HolidaysByYear;
  onEnsureHolidaysForYear: (year: number) => void;
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

const calculateMonthlyActualHours = (
    employee: Employee,
    year: number,
    month: number,
    timeEntries: TimeEntry[],
    absenceRequests: AbsenceRequest[],
    holidaysForYear: Holiday[]
): number => {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    const workedSeconds = timeEntries
        .filter(e => e.employeeId === employee.id && new Date(e.start) >= startDate && new Date(e.start) <= endDate)
        .reduce((sum, entry) => sum + ((new Date(entry.end).getTime() - new Date(entry.start).getTime()) / 1000 - (entry.breakDurationMinutes * 60)), 0);
    const workedHours = workedSeconds / 3600;

    let absenceAndHolidayHours = 0;
    const holidayDates = new Set(holidaysForYear.map(h => h.date));
    const approvedAbsences = absenceRequests.filter(r => r.employeeId === employee.id && r.status === 'approved');
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const contract = getContractDetailsForDate(employee, d);
        const dayOfWeek = d.getDay();
        const dateString = d.toLocaleDateString('sv-SE');
        
        let dailyScheduledHours = 0;
        if (contract.targetHoursModel === TargetHoursModel.Weekly && contract.weeklySchedule) {
            const dayKeys: (keyof WeeklySchedule)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            dailyScheduledHours = contract.weeklySchedule[dayKeys[dayOfWeek]] || 0;
        } else {
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { dailyScheduledHours = contract.dailyTargetHours; }
        }

        if (dailyScheduledHours > 0) {
            const isHoliday = holidayDates.has(dateString);
            const absenceOnThisDay = approvedAbsences.find(r => dateString >= r.startDate && dateString <= r.endDate);
            const isCreditedAbsence = absenceOnThisDay && (absenceOnThisDay.type === AbsenceType.Vacation || absenceOnThisDay.type === AbsenceType.SickLeave);
            
            if (isHoliday || isCreditedAbsence) {
                 if (isCreditedAbsence && absenceOnThisDay.dayPortion && absenceOnThisDay.dayPortion !== 'full') {
                    absenceAndHolidayHours += dailyScheduledHours / 2;
                } else {
                    absenceAndHolidayHours += dailyScheduledHours;
                }
            }
        }
    }
    
    return workedHours + absenceAndHolidayHours;
};


export const UtilizationView: React.FC<UtilizationViewProps> = ({ employees, timeEntries, absenceRequests, holidaysByYear, onEnsureHolidaysForYear, companySettings }) => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [targetHours, setTargetHours] = useState(170);
    const [scaleMaxHours, setScaleMaxHours] = useState(200);
    const [visibleEmployeeIds, setVisibleEmployeeIds] = useState<number[]>([]);
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const monthPickerRef = useRef<HTMLDivElement>(null);
    const [stagedDate, setStagedDate] = useState({ year: selectedYear, month: selectedMonth });

    const timeFormat = companySettings.adminTimeFormat || 'hoursMinutes';
    const chartMaxHours = scaleMaxHours || 200;

    useEffect(() => {
        setVisibleEmployeeIds(employees.filter(e => e.isActive).map(e => e.id));
    }, [employees]);

    useEffect(() => {
        onEnsureHolidaysForYear(selectedYear);
    }, [selectedYear, onEnsureHolidaysForYear]);
    
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
        setStagedDate({ year: selectedYear, month: selectedMonth });
    }, [selectedYear, selectedMonth]);

    const handleApplyDateChange = () => {
        setSelectedYear(stagedDate.year);
        setSelectedMonth(stagedDate.month);
        setIsMonthPickerOpen(false);
    };

    const reportData = useMemo(() => {
        const holidaysForYear = holidaysByYear[selectedYear] || [];
        if (holidaysForYear.length === 0 && selectedYear) return [];

        return employees
            .filter(e => visibleEmployeeIds.includes(e.id))
            .map(employee => {
                const totalHours = calculateMonthlyActualHours(employee, selectedYear, selectedMonth, timeEntries, absenceRequests, holidaysForYear);
                const contract = getContractDetailsForDate(employee, new Date(selectedYear, selectedMonth, 15));
                const monthlyTargetHours = contract.monthlyTargetHours;
                return {
                    employeeId: employee.id,
                    employeeName: `${employee.firstName} ${employee.lastName}`,
                    totalHours: totalHours,
                    monthlyTargetHours: monthlyTargetHours,
                };
            })
            .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    }, [visibleEmployeeIds, selectedYear, selectedMonth, employees, timeEntries, absenceRequests, holidaysByYear]);
    
    const changeMonth = (offset: number) => {
        const newDate = new Date(selectedYear, selectedMonth, 1);
        newDate.setMonth(newDate.getMonth() + offset);
        setSelectedYear(newDate.getFullYear());
        setSelectedMonth(newDate.getMonth());
    };

    const EmployeeFilterModal: React.FC = () => {
        const [tempVisibleIds, setTempVisibleIds] = useState(new Set(visibleEmployeeIds));

        const handleToggle = (id: number) => {
            const newSet = new Set(tempVisibleIds);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            setTempVisibleIds(newSet);
        };

        const handleSelectAll = () => setTempVisibleIds(new Set(employees.filter(e => e.isActive).map(e => e.id)));
        const handleDeselectAll = () => setTempVisibleIds(new Set());

        const handleApply = () => {
            setVisibleEmployeeIds(Array.from(tempVisibleIds));
            setIsEmployeeModalOpen(false);
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40 p-4" onClick={() => setIsEmployeeModalOpen(false)}>
                <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Mitarbeiter auswählen</h2><button onClick={() => setIsEmployeeModalOpen(false)}><XIcon className="h-6 w-6" /></button></div>
                    <div className="flex justify-between items-center mb-2"><button type="button" onClick={handleSelectAll} className="text-sm font-semibold text-blue-600">Alle auswählen</button><button type="button" onClick={handleDeselectAll} className="text-sm font-semibold text-blue-600">Alle abwählen</button></div>
                    <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">{employees.filter(e => e.isActive).map(emp => <label key={emp.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer"><input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={tempVisibleIds.has(emp.id)} onChange={() => handleToggle(emp.id)} /><span>{emp.firstName} {emp.lastName}</span></label>)}</div>
                    <div className="flex justify-end pt-4 mt-4 border-t"><Button onClick={handleApply} className="bg-blue-600 hover:bg-blue-700">Anwenden</Button></div>
                </Card>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Vorheriger Monat">
                        <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                    </button>
                    <div ref={monthPickerRef} className="text-center relative">
                        <button onClick={() => setIsMonthPickerOpen(p => !p)} className="hover:bg-gray-100 p-2 rounded-lg">
                            <h2 className="text-xl font-bold">Mitarbeiter-Auslastung</h2>
                            <p className="font-semibold text-gray-600">{months[selectedMonth]} {selectedYear}</p>
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
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Nächster Monat">
                        <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                    </button>
                </div>
                <div className="flex flex-col md:flex-row gap-4 items-end justify-center pt-4 border-t">
                    <div className="w-full md:w-auto">
                        <Button onClick={() => setIsEmployeeModalOpen(true)} className="w-full bg-gray-600 hover:bg-gray-700 h-10 flex items-center justify-center gap-2">
                            <UsersIcon className="h-5 w-5"/> Mitarbeiter filtern
                        </Button>
                    </div>
                    <div className="w-full md:w-56">
                        <FlexibleTimeInput
                            label="Soll-Stunden (Vergleich)"
                            value={targetHours}
                            onChange={setTargetHours}
                            format={timeFormat}
                        />
                    </div>
                    <div className="w-full md:w-56">
                        <FlexibleTimeInput
                            label="Max. Stunden (Skala)"
                            value={scaleMaxHours}
                            onChange={setScaleMaxHours}
                            format={timeFormat}
                        />
                    </div>
                </div>
            </Card>

            <Card>
                <div className="flex">
                    <div className="w-36 shrink-0 pr-4"></div> {/* Spacer */}
                    <div className="relative flex-1">
                        <div className="h-8 flex justify-between items-end text-xs text-gray-500">
                            <span>0h</span>
                            {chartMaxHours >= 80 && <span className="-translate-x-1/2">{Math.round(chartMaxHours / 2)}h</span>}
                            <span>{chartMaxHours}h</span>
                        </div>
                    </div>
                </div>

                <div className="flex">
                    <div className="w-36 shrink-0 pr-4">
                        {reportData.map(data => (
                            <div key={data.employeeId} className="h-8 mt-4 flex items-center justify-end truncate font-medium text-sm text-gray-700" title={data.employeeName}>
                                {data.employeeName}
                            </div>
                        ))}
                    </div>
                    
                    <div className="relative flex-1">
                        {/* Grid Lines */}
                        <div className="absolute top-0 bottom-0 left-0 w-full">
                            <div className="absolute top-0 bottom-0 left-0 border-r border-gray-300"></div>
                            {chartMaxHours >= 80 && <div className="absolute top-0 bottom-0 left-1/2 border-r border-gray-200 border-dashed"></div>}
                            <div className="absolute top-0 bottom-0 right-0 border-r border-gray-300"></div>
                        </div>
                        {/* General Target Line */}
                        {targetHours > 0 && targetHours <= chartMaxHours && (
                            <div className="absolute top-0 bottom-0 border-r-2 border-red-500 border-dashed z-10" style={{ left: `${(targetHours / chartMaxHours) * 100}%` }}>
                                <span className="absolute -top-7 -translate-x-1/2 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">{formatHoursAndMinutes(targetHours, timeFormat)} Soll</span>
                            </div>
                        )}
                        
                        {/* Data Bars */}
                        <div className="space-y-4 pt-8">
                             {reportData.length > 0 ? reportData.map(data => (
                                <div key={data.employeeId} className="h-8 bg-gray-200 rounded relative group">
                                    <div 
                                        className="bg-blue-600 h-full rounded absolute left-0 top-0 transition-all duration-300 flex items-center pl-3 overflow-hidden" 
                                        style={{ width: `min(${(data.totalHours / chartMaxHours) * 100}%, 100%)` }}
                                    >
                                        <span className="text-white font-bold text-sm tracking-tighter whitespace-nowrap">
                                            {formatHoursAndMinutes(data.totalHours, timeFormat)}
                                        </span>
                                    </div>
                                    
                                    {data.monthlyTargetHours > 0 && data.monthlyTargetHours <= chartMaxHours && (
                                        <div 
                                            className="absolute top-[-4px] bottom-[-4px] border-l-2 border-gray-500 z-10 group/marker"
                                            style={{ left: `${(data.monthlyTargetHours / chartMaxHours) * 100}%` }}
                                        >
                                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs text-white bg-gray-800 rounded-md opacity-0 group-hover/marker:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                Persönliches Soll: {formatHoursAndMinutes(data.monthlyTargetHours, timeFormat)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div className="h-40 flex items-center justify-center">
                                    <p className="text-center text-gray-500">Keine Mitarbeiter zur Anzeige ausgewählt oder keine Daten für den Zeitraum vorhanden.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Card>
            {isEmployeeModalOpen && <EmployeeFilterModal />}
        </div>
    );
};