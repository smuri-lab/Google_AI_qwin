import type { Employee, ContractDetails, Holiday, AbsenceRequest, TimeEntry, Customer, Activity, CompanySettings, HolidaysByYear, WeeklySchedule, TimeBalanceAdjustment } from './types';
import { EmploymentType, AbsenceType, TargetHoursModel } from './types';
import * as XLSX from 'xlsx';
import { getHolidays, GermanState } from './constants';

export const getContractDetailsForDate = (employee: Employee, date: Date): ContractDetails => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  if (!employee.contractHistory || employee.contractHistory.length === 0) {
    return {
        validFrom: '1970-01-01',
        employmentType: EmploymentType.FullTime,
        monthlyTargetHours: 0,
        dailyTargetHours: 0,
        vacationDays: 0,
        street: '', houseNumber: '', postalCode: '', city: ''
    };
  }
  
  const sortedHistory = [...employee.contractHistory].sort((a, b) => 
    new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime()
  );

  const currentContract = sortedHistory.find(contract => 
    new Date(contract.validFrom).getTime() <= targetDate.getTime()
  );

  return currentContract || sortedHistory[sortedHistory.length - 1];
};

export const calculateBalance = (
    employee: Employee,
    endDate: Date,
    allTimeEntries: TimeEntry[],
    allAbsenceRequests: AbsenceRequest[],
    allTimeBalanceAdjustments: TimeBalanceAdjustment[],
    holidaysByYear: HolidaysByYear,
): number => {
    if (!employee.firstWorkDay || new Date(employee.firstWorkDay) > endDate) {
        return employee.startingTimeBalanceHours || 0;
    }

    let totalCredits = 0;
    const workedHours = allTimeEntries
        .filter(e => e.employeeId === employee.id && new Date(e.start) <= endDate)
        .reduce((sum, e) => sum + ((new Date(e.end).getTime() - new Date(e.start).getTime()) / 3600000 - (e.breakDurationMinutes / 60)), 0);
    totalCredits += workedHours;

    const adjustmentHours = allTimeBalanceAdjustments
        .filter(adj => adj.employeeId === employee.id && new Date(adj.date) <= endDate)
        .reduce((sum, adj) => sum + adj.hours, 0);
    totalCredits += adjustmentHours;
    
    const approvedAbsences = allAbsenceRequests.filter(r => r.employeeId === employee.id && r.status === 'approved');
    let loopDate = new Date(employee.firstWorkDay);
    while (loopDate <= endDate) {
        const year = loopDate.getFullYear();
        const holidaysForYear = holidaysByYear[year] || [];
        const holidayDates = new Set(holidaysForYear.map(h => h.date));
        const dateString = loopDate.toLocaleDateString('sv-SE');
        const contract = getContractDetailsForDate(employee, loopDate);
        const dayOfWeek = loopDate.getDay();
        let dailyScheduledHours = 0;
        
        if (contract.targetHoursModel === TargetHoursModel.Weekly && contract.weeklySchedule) {
            const dayKeys: (keyof WeeklySchedule)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            dailyScheduledHours = contract.weeklySchedule[dayKeys[dayOfWeek]] || 0;
        } else {
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { dailyScheduledHours = contract.dailyTargetHours; }
        }

        if (dailyScheduledHours > 0) {
            const isHoliday = holidayDates.has(dateString);
            const absence = approvedAbsences.find(r => dateString >= r.startDate && r.endDate >= dateString);
            if (isHoliday) {
                totalCredits += dailyScheduledHours;
            } else if (absence && (absence.type === AbsenceType.Vacation || absence.type === AbsenceType.SickLeave)) {
                if (absence.type === AbsenceType.Vacation && absence.dayPortion && absence.dayPortion !== 'full') {
                    totalCredits += dailyScheduledHours / 2;
                } else {
                    totalCredits += dailyScheduledHours;
                }
            }
        }
        loopDate.setDate(loopDate.getDate() + 1);
    }
    
    let totalPayrollTargetHours = 0;
    let monthLoopDate = new Date(employee.firstWorkDay);
    while (monthLoopDate <= endDate) {
        const contract = getContractDetailsForDate(employee, monthLoopDate);
        totalPayrollTargetHours += contract.monthlyTargetHours;
        monthLoopDate = new Date(monthLoopDate.getFullYear(), monthLoopDate.getMonth() + 1, 1);
    }

    return (employee.startingTimeBalanceHours || 0) + totalCredits - totalPayrollTargetHours;
};

export const formatHoursAndMinutes = (decimalHours: number, format: 'decimal' | 'hoursMinutes' = 'hoursMinutes'): string => {
    if (format === 'decimal') {
        return `${decimalHours.toFixed(2).replace('.', ',')}h`;
    }
    const sign = decimalHours < 0 ? "-" : "";
    const absDecimalHours = Math.abs(decimalHours);
    let hours = Math.floor(absDecimalHours);
    const fractionalPart = absDecimalHours - hours;
    let minutes = Math.round(fractionalPart * 60);
    if (minutes === 60) { hours += 1; minutes = 0; }
    return `${sign}${hours}h ${minutes.toString().padStart(2, '0')}min`;
};

export const calculateAnnualVacationTaken = (employeeId: number, absenceRequests: AbsenceRequest[], year: number, holidays: Holiday[]): number => {
    const approvedVacations = absenceRequests.filter(req => req.employeeId === employeeId && req.status === 'approved' && req.type === AbsenceType.Vacation);
    const holidayDates = new Set(holidays.map(h => h.date));
    let totalDays = 0;
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    for (let d = new Date(yearStart); d <= yearEnd; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        const dateString = d.toLocaleDateString('sv-SE');
        if (holidayDates.has(dateString)) continue;
        const absence = approvedVacations.find(req => dateString >= req.startDate && dateString <= req.endDate);
        if (absence) {
            totalDays += (absence.dayPortion && absence.dayPortion !== 'full') ? 0.5 : 1;
        }
    }
    return totalDays;
};

export const calculateAnnualSickDays = (employeeId: number, absenceRequests: AbsenceRequest[], year: number, holidays: Holiday[]): number => {
    const approvedSickLeaves = absenceRequests.filter(req => req.employeeId === employeeId && req.status === 'approved' && req.type === AbsenceType.SickLeave);
    const holidayDates = new Set(holidays.map(h => h.date));
    let count = 0;
    for (const req of approvedSickLeaves) {
        let cur = new Date(req.startDate);
        const end = new Date(req.endDate);
        while (cur <= end) {
            if (cur.getFullYear() === year) {
                const dayOfWeek = cur.getDay();
                const dateStr = cur.toLocaleDateString('sv-SE');
                if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) count++;
            }
            cur.setDate(cur.getDate() + 1);
        }
    }
    return count;
};

export const calculateAbsenceDaysInMonth = (employeeId: number, absenceRequests: AbsenceRequest[], year: number, month: number, holidays: Holiday[]): { vacationDays: number, sickDays: number, timeOffDays: number } => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const approvedAbsences = absenceRequests.filter(req => req.employeeId === employeeId && req.status === 'approved' && new Date(req.startDate) <= monthEnd && new Date(req.endDate) >= monthStart);
    const result = { vacationDays: 0, sickDays: 0, timeOffDays: 0 };
    const holidayDates = new Set(holidays.map(h => h.date));
    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        const dateString = d.toLocaleDateString('sv-SE');
        if (holidayDates.has(dateString)) continue;
        const absence = approvedAbsences.find(req => dateString >= req.startDate && dateString <= req.endDate);
        if (absence) {
            if (absence.type === AbsenceType.Vacation) result.vacationDays += (absence.dayPortion && absence.dayPortion !== 'full') ? 0.5 : 1;
            else if (absence.type === AbsenceType.SickLeave) result.sickDays += 1;
            else if (absence.type === AbsenceType.TimeOff) result.timeOffDays += 1;
        }
    }
    return result;
};

export const getAbsenceTypeDetails = (type: AbsenceType) => {
    switch (type) {
        case AbsenceType.Vacation: return { label: 'Urlaub', solidClass: 'bg-blue-500 text-white', pendingClass: 'bg-blue-100 text-blue-700', pendingBorderClass: 'border-blue-400', dotClass: 'bg-blue-500', bgClass: 'bg-blue-50', borderClass: 'border-blue-200', textClass: 'text-blue-800' };
        case AbsenceType.SickLeave: return { label: 'Krank', solidClass: 'bg-orange-500 text-white', pendingClass: 'bg-orange-100 text-orange-700', pendingBorderClass: 'border-orange-400', dotClass: 'bg-orange-500', bgClass: 'bg-orange-50', borderClass: 'border-orange-200', textClass: 'text-orange-800' };
        case AbsenceType.TimeOff: return { label: 'Frei', solidClass: 'bg-green-500 text-white', pendingClass: 'bg-green-100 text-green-700', pendingBorderClass: 'border-green-400', dotClass: 'bg-green-500', bgClass: 'bg-green-50', borderClass: 'border-green-200', textClass: 'text-green-800' };
        default: return { label: 'Abwesenheit', solidClass: 'bg-gray-500 text-white', pendingClass: 'bg-gray-100', pendingBorderClass: 'border-gray-400', dotClass: 'bg-gray-500', bgClass: 'bg-gray-50', borderClass: 'border-gray-200', textClass: 'text-gray-800' };
    }
};

export const exportTimesheet = async (params: any) => {
    const { employee, year, month, allTimeEntries, allAbsenceRequests, customers, activities, companySettings, holidays, timeFormat = 'hoursMinutes' } = params;
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    const wb = XLSX.utils.book_new();
    const monthName = startDate.toLocaleString('de-DE', { month: 'long' });
    const customerLabel = companySettings.customerLabel || 'Kunde';
    const activityLabel = companySettings.activityLabel || 'Tätigkeit';
    
    const timesheet_aoa: (string | number)[][] = [['Mitarbeiter:', `${employee.firstName} ${employee.lastName}`], ['Firma:', companySettings.companyName], ['Zeitraum:', `${monthName} ${year}`], [], ['Datum', customerLabel, activityLabel, 'Start', 'Ende', 'Pause', 'Dauer']];
    const entries = allTimeEntries.filter((e: any) => e.employeeId === employee.id && new Date(e.start) >= startDate && new Date(e.start) <= endDate);
    entries.forEach((entry: any) => {
        const duration = (new Date(entry.end).getTime() - new Date(entry.start).getTime()) / 3600000 - (entry.breakDurationMinutes / 60);
        timesheet_aoa.push([new Date(entry.start).toLocaleDateString('de-DE'), customers.find((c: any) => c.id === entry.customerId)?.name || 'N/A', activities.find((a: any) => a.id === entry.activityId)?.name || 'N/A', new Date(entry.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit'}), new Date(entry.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit'}), entry.breakDurationMinutes, formatHoursAndMinutes(duration, timeFormat)]);
    });

    const ws = XLSX.utils.aoa_to_sheet(timesheet_aoa);
    XLSX.utils.book_append_sheet(wb, ws, `Stundenzettel`);
    XLSX.writeFile(wb, `Stundenzettel_${employee.lastName}_${monthName}.xlsx`);
};