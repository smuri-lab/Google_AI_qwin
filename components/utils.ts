import type { Employee, ContractDetails, Holiday, AbsenceRequest, TimeEntry, Customer, Activity, CompanySettings, HolidaysByYear, WeeklySchedule, TimeBalanceAdjustment } from '../types';
import { EmploymentType, AbsenceType, TargetHoursModel } from '../types';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs';
import { getHolidays, GermanState } from '../constants';

/**
 * Finds the currently active contract details for an employee based on a specific date.
 * It sorts the contract history by the 'validFrom' date in descending order
 * and returns the first version that is effective as of the given date.
 * @param employee The employee object with its contract history.
 * @param date The date for which to find the valid contract.
 * @returns The active ContractDetails object for the given date.
 */
export const getContractDetailsForDate = (employee: Employee, date: Date): ContractDetails => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  if (!employee.contractHistory || employee.contractHistory.length === 0) {
    console.error(`Mitarbeiter ${employee.id} hat keine Vertragshistorie.`);
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


/**
 * Calculates the final time balance for an employee up to a specific date.
 * The balance is calculated as:
 * Starting Balance + Worked Hours + Absence/Holiday Credits + Adjustments - Payroll Target Hours.
 * This correctly reflects the model where a fixed monthly target is debited against all credited hours.
 * @param employee The employee.
 * @param endDate The date up to which the balance is calculated.
 * @param allTimeEntries All time entries in the system.
 * @param allAbsenceRequests All absence requests.
 * @param allTimeBalanceAdjustments All manual adjustments.
 * @param holidaysByYear A map of years to their holidays.
 * @returns The final time balance in hours.
 */
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

    // 1. Calculate Total Credits
    let totalCredits = 0;

    // 1a. Worked Hours
    const workedHours = allTimeEntries
        .filter(e => e.employeeId === employee.id && new Date(e.start) <= endDate)
        .reduce((sum, e) => sum + ((new Date(e.end).getTime() - new Date(e.start).getTime()) / 3600000 - (e.breakDurationMinutes / 60)), 0);
    totalCredits += workedHours;

    // 1b. Adjustments
    const adjustmentHours = allTimeBalanceAdjustments
        .filter(adj => adj.employeeId === employee.id && new Date(adj.date) <= endDate)
        .reduce((sum, adj) => sum + adj.hours, 0);
    totalCredits += adjustmentHours;
    
    // 1c. Absence & Holiday Credits
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
    
    // 2. Calculate Total Payroll Debits
    let totalPayrollTargetHours = 0;
    let monthLoopDate = new Date(employee.firstWorkDay);
    while (monthLoopDate <= endDate) {
        const contract = getContractDetailsForDate(employee, monthLoopDate);
        totalPayrollTargetHours += contract.monthlyTargetHours;
        monthLoopDate = new Date(monthLoopDate.getFullYear(), monthLoopDate.getMonth() + 1, 1);
    }

    return (employee.startingTimeBalanceHours || 0) + totalCredits - totalPayrollTargetHours;
};

/**
 * Provides a detailed breakdown of all time balance components for a specific month.
 * This is the central source of truth for all monthly calculations.
 * @returns An object with all calculated values for the month.
 */
export const calculateMonthlyBreakdown = (
    employee: Employee,
    year: number,
    month: number,
    allTimeEntries: TimeEntry[],
    allAbsenceRequests: AbsenceRequest[],
    allTimeBalanceAdjustments: TimeBalanceAdjustment[],
    holidaysByYear: HolidaysByYear,
) => {
    const holidaysForYear = holidaysByYear[year] || [];
    const holidayDates = new Set(holidaysForYear.map(h => h.date));
    
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    
    const prevMonthEnd = new Date(year, month, 0);
    prevMonthEnd.setHours(23, 59, 59, 999);
    
    const previousBalance = calculateBalance(employee, prevMonthEnd, allTimeEntries, allAbsenceRequests, allTimeBalanceAdjustments, holidaysByYear);
    
    const workedHours = allTimeEntries
        .filter(e => e.employeeId === employee.id && new Date(e.start) >= monthStart && new Date(e.start) <= monthEnd)
        .reduce((sum, e) => sum + ((new Date(e.end).getTime() - new Date(e.start).getTime()) / 3600000 - (e.breakDurationMinutes / 60)), 0);

    const adjustments = allTimeBalanceAdjustments
        .filter(adj => {
            const adjDate = new Date(adj.date);
            return adj.employeeId === employee.id &&
                   adjDate.getFullYear() === year &&
                   adjDate.getMonth() === month;
        })
        .reduce((sum, adj) => sum + adj.hours, 0);

    let vacationCreditHours = 0;
    let sickLeaveCreditHours = 0;
    let holidayCreditHours = 0;
    const approvedAbsences = allAbsenceRequests.filter(r => r.employeeId === employee.id && r.status === 'approved');

    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        const contract = getContractDetailsForDate(employee, d);
        const dayOfWeek = d.getDay();
        let dailyTarget = 0;

        if (contract.targetHoursModel === TargetHoursModel.Weekly && contract.weeklySchedule) {
            const dayKeys: (keyof WeeklySchedule)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            dailyTarget = contract.weeklySchedule[dayKeys[dayOfWeek]] || 0;
        } else if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            dailyTarget = contract.dailyTargetHours;
        }
        
        if (dailyTarget > 0) {
            const dateString = d.toLocaleDateString('sv-SE');
            const isHoliday = holidayDates.has(dateString);
            const absence = approvedAbsences.find(r => dateString >= r.startDate && dateString <= r.endDate);

            if (isHoliday) {
                holidayCreditHours += dailyTarget;
            } else if (absence) {
                 if (absence.type === AbsenceType.Vacation) {
                    const credit = absence.dayPortion && absence.dayPortion !== 'full' ? dailyTarget / 2 : dailyTarget;
                    vacationCreditHours += credit;
                 } else if (absence.type === AbsenceType.SickLeave) {
                    sickLeaveCreditHours += dailyTarget;
                 }
            }
        }
    }
    
    const absenceHolidayCredit = vacationCreditHours + sickLeaveCreditHours + holidayCreditHours;
    const totalCredited = workedHours + absenceHolidayCredit + adjustments;
    const contract = getContractDetailsForDate(employee, monthStart);
    const targetHours = contract.monthlyTargetHours;
    const monthlyBalance = totalCredited - targetHours;
    const endOfMonthBalance = previousBalance + monthlyBalance;

    return {
        previousBalance,
        workedHours,
        adjustments,
        vacationCreditHours,
        sickLeaveCreditHours,
        holidayCreditHours,
        absenceHolidayCredit,
        totalCredited,
        targetHours,
        monthlyBalance,
        endOfMonthBalance
    };
};


/**
 * Formats a decimal number of hours into a string with hours and minutes.
 * e.g., 8.5 becomes "8h 30min"
 * @param decimalHours The hours as a decimal number.
 * @returns A formatted string.
 */
export const formatHoursAndMinutes = (decimalHours: number, format: 'decimal' | 'hoursMinutes' = 'hoursMinutes'): string => {
    if (format === 'decimal') {
        if (typeof decimalHours !== 'number' || isNaN(decimalHours)) return '0,00h';
        return `${decimalHours.toFixed(2).replace('.', ',')}h`;
    }

    const sign = decimalHours < 0 ? "-" : "";
    const absDecimalHours = Math.abs(decimalHours);
    let hours = Math.floor(absDecimalHours);
    const fractionalPart = absDecimalHours - hours;
    let minutes = Math.round(fractionalPart * 60);

    if (minutes === 60) {
        hours += 1;
        minutes = 0;
    }

    return `${sign}${hours}h ${minutes.toString().padStart(2, '0')}m`;
};

/**
 * Counts the number of workdays (Mon-Fri) within a given date range, inclusive, excluding public holidays.
 * @param startDate The start of the date range.
 * @param endDate The end of the date range.
 * @param holidays A list of public holidays to exclude.
 * @returns The total number of workdays.
 */
const countWorkdaysInDateRange = (startDate: Date, endDate: Date, holidays: Holiday[]): number => {
    const holidayDates = new Set(holidays.map(h => h.date));
    let count = 0;
    const curDate = new Date(startDate.getTime());
    while (curDate <= endDate) {
        const dayOfWeek = curDate.getDay();
        const dateString = curDate.toLocaleDateString('sv-SE');
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateString)) { // 0=Sun, 6=Sat
            count++;
        }
        curDate.setDate(curDate.getDate() + 1);
    }
    return count;
};

/**
 * Calculates the total number of approved vacation days for an employee within a specific year.
 * @param employeeId The ID of the employee.
 * @param absenceRequests The list of all absence requests.
 * @param year The year to calculate for.
 * @param holidays A list of public holidays to exclude from vacation day count.
 * @returns The total number of taken vacation workdays.
 */
export const calculateAnnualVacationTaken = (employeeId: number, absenceRequests: AbsenceRequest[], year: number, holidays: Holiday[]): number => {
    const approvedVacations = absenceRequests.filter(req => 
        req.employeeId === employeeId &&
        req.status === 'approved' &&
        req.type === AbsenceType.Vacation
    );
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
            if (absence.dayPortion && absence.dayPortion !== 'full') {
                totalDays += 0.5;
            } else {
                totalDays += 1;
            }
        }
    }
    return totalDays;
};

/**
 * Calculates the total number of approved sick days for an employee within a specific year.
 * @param employeeId The ID of the employee.
 * @param absenceRequests The list of all absence requests.
 * @param year The year to calculate for.
 * @param holidays A list of public holidays to exclude from sick day count.
 * @returns The total number of taken sick workdays.
 */
export const calculateAnnualSickDays = (employeeId: number, absenceRequests: AbsenceRequest[], year: number, holidays: Holiday[]): number => {
    const approvedSickLeaves = absenceRequests.filter(req =>
        req.employeeId === employeeId &&
        req.status === 'approved' &&
        req.type === AbsenceType.SickLeave &&
        new Date(req.startDate).getFullYear() <= year &&
        new Date(req.endDate).getFullYear() >= year
    );

    let totalDays = 0;
    for (const req of approvedSickLeaves) {
        const reqStart = new Date(req.startDate);
        const reqEnd = new Date(req.endDate);
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);

        const effectiveStart = reqStart < yearStart ? yearStart : reqStart;
        const effectiveEnd = reqEnd > yearEnd ? yearEnd : reqEnd;

        totalDays += countWorkdaysInDateRange(effectiveStart, effectiveEnd, holidays);
    }
    return totalDays;
};


/**
 * Calculates the number of absence days (vacation, sick, time off) for a specific employee within a given month.
 * @param employeeId The ID of the employee.
 * @param absenceRequests The list of all absence requests.
 * @param year The year of the month to check.
 * @param month The month (0-indexed) to check.
 * @param holidays A list of public holidays to exclude from absence day counts.
 * @returns An object with the counts for vacation, sick, and time off days.
 */
export const calculateAbsenceDaysInMonth = (employeeId: number, absenceRequests: AbsenceRequest[], year: number, month: number, holidays: Holiday[]): { vacationDays: number, sickDays: number, timeOffDays: number } => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    const relevantAbsences = absenceRequests.filter(req => 
        req.employeeId === employeeId &&
        new Date(req.startDate) <= monthEnd && 
        new Date(req.endDate) >= monthStart
    );

    const result = { vacationDays: 0, sickDays: 0, timeOffDays: 0 };
    const holidayDates = new Set(holidays.map(h => h.date));
    
    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        const dateString = d.toLocaleDateString('sv-SE');
        if (holidayDates.has(dateString)) continue;

        const absence = relevantAbsences.find(req => dateString >= req.startDate && dateString <= req.endDate);
        if (absence) {
            if (absence.type === AbsenceType.Vacation) {
                if (absence.dayPortion && absence.dayPortion !== 'full') {
                    result.vacationDays += 0.5;
                } else {
                    result.vacationDays += 1;
                }
            } else if (absence.type === AbsenceType.SickLeave) {
                result.sickDays += 1;
            } else if (absence.type === AbsenceType.TimeOff) {
                result.timeOffDays += 1;
            }
        }
    }
    return result;
};


/**
 * Returns UI details (label, colors) for a given absence type.
 * @param type The AbsenceType enum value.
 * @returns An object with label and CSS class strings.
 */
export const getAbsenceTypeDetails = (type: AbsenceType) => {
    switch (type) {
        case AbsenceType.Vacation:
            return { 
                label: 'Urlaub', 
                solidClass: 'bg-blue-500 text-white',
                pendingClass: 'bg-blue-100 text-blue-700',
                pendingBorderClass: 'border-blue-400',
                dotClass: 'bg-blue-500', 
                bgClass: 'bg-blue-50', 
                borderClass: 'border-blue-200', 
                textClass: 'text-blue-800' 
            };
        case AbsenceType.SickLeave:
            return { 
                label: 'Krank', 
                solidClass: 'bg-orange-500 text-white',
                pendingClass: 'bg-orange-100 text-orange-700',
                pendingBorderClass: 'border-orange-400',
                dotClass: 'bg-orange-500', 
                bgClass: 'bg-orange-50', 
                borderClass: 'border-orange-200', 
                textClass: 'text-orange-800' 
            };
        case AbsenceType.TimeOff:
            return { 
                label: 'Frei', 
                solidClass: 'bg-green-500 text-white',
                pendingClass: 'bg-green-100 text-green-700',
                pendingBorderClass: 'border-green-400',
                dotClass: 'bg-green-500', 
                bgClass: 'bg-green-50', 
                borderClass: 'border-green-200', 
                textClass: 'text-green-800' 
            };
        default:
            return { 
                label: 'Abwesenheit', 
                solidClass: 'bg-gray-500 text-white',
                pendingClass: 'bg-gray-100',
                pendingBorderClass: 'border-gray-400',
                dotClass: 'bg-gray-500', 
                bgClass: 'bg-gray-50', 
                borderClass: 'border-gray-200', 
                textClass: 'text-gray-800' 
            };
    }
};


// --- EXPORT FUNCTION ---

interface ExportTimesheetParams {
    employee: Employee;
    year: number;
    month: number;
    allTimeEntries: TimeEntry[];
    allAbsenceRequests: AbsenceRequest[];
    customers: Customer[];
    activities: Activity[];
    selectedState: string;
    companySettings: CompanySettings;
    holidays: Holiday[];
    timeFormat?: 'decimal' | 'hoursMinutes';
}

const getTimesheetExportData = (params: ExportTimesheetParams) => {
    const { employee, year, month, allTimeEntries, allAbsenceRequests, customers, activities, selectedState, companySettings, timeFormat = 'hoursMinutes' } = params;
    
    const holidaysForCalc: HolidaysByYear = {};
    holidaysForCalc[year] = getHolidays(year, selectedState as GermanState);
    if (month === 0) {
      const prevYear = year - 1;
      holidaysForCalc[prevYear] = getHolidays(prevYear, selectedState as GermanState);
    }
    const yearSpecificHolidays = holidaysForCalc[year] || [];
    
    const breakdown = calculateMonthlyBreakdown(employee, year, month, allTimeEntries, allAbsenceRequests, [], holidaysForCalc);
    const {
        previousBalance,
        workedHours: actualWorkedHours,
        vacationCreditHours,
        sickLeaveCreditHours,
        holidayCreditHours,
        totalCredited: totalCreditedHours,
        targetHours: currentMonthTargetHours,
        endOfMonthBalance
    } = breakdown;

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    endDate.setHours(23, 59, 59, 999);
    
    const employeeTimeEntriesCurrentMonth = allTimeEntries.filter(entry => {
        const entryDate = new Date(entry.start);
        return entry.employeeId === employee.id && entryDate >= startDate && entryDate <= endDate;
    }).sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    
    const monthlyAbsences = calculateAbsenceDaysInMonth(employee.id, allAbsenceRequests, year, month, yearSpecificHolidays);
    const annualVacationTaken = calculateAnnualVacationTaken(employee.id, allAbsenceRequests, year, yearSpecificHolidays);
    const currentContract = getContractDetailsForDate(employee, new Date(year, month, 15));
    const remainingVacation = currentContract.vacationDays - annualVacationTaken;
    
    const monthName = startDate.toLocaleString('de-DE', { month: 'long' });

    return {
        employee, year, monthName, customers, activities, companySettings, timeFormat,
        previousBalance, actualWorkedHours, vacationCreditHours, sickLeaveCreditHours,
        holidayCreditHours, totalCreditedHours, currentMonthTargetHours, endOfMonthBalance,
        monthlyAbsences, remainingVacation, employeeTimeEntriesCurrentMonth
    };
};

export const exportTimesheet = (params: ExportTimesheetParams) => {
    const data = getTimesheetExportData(params);
    const { employee, year, monthName, customers, activities, companySettings, timeFormat,
            previousBalance, actualWorkedHours, vacationCreditHours, sickLeaveCreditHours, holidayCreditHours,
            totalCreditedHours, currentMonthTargetHours, endOfMonthBalance, monthlyAbsences, remainingVacation,
            employeeTimeEntriesCurrentMonth } = data;

    const wb = XLSX.utils.book_new();
    
    const customerLabel = companySettings.customerLabel || 'Kunde';
    const activityLabel = companySettings.activityLabel || 'Tätigkeit';
    
    const timesheet_aoa: (string | number)[][] = [
        ['Mitarbeiter:', `${employee.firstName} ${employee.lastName}`],
        ['Firma:', companySettings.companyName],
        ['Zeitraum:', `${monthName} ${year}`],
        [],
        ['Datum', customerLabel, activityLabel, 'Start', 'Ende', 'Pause', 'Dauer']
    ];

    employeeTimeEntriesCurrentMonth.forEach(entry => {
        const duration = (new Date(entry.end).getTime() - new Date(entry.start).getTime()) / 3600000 - (entry.breakDurationMinutes / 60);
        timesheet_aoa.push([
            new Date(entry.start).toLocaleDateString('de-DE'),
            customers.find(c => c.id === entry.customerId)?.name || 'N/A',
            activities.find(a => a.id === entry.activityId)?.name || 'N/A',
            new Date(entry.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit'}),
            new Date(entry.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit'}),
            entry.breakDurationMinutes > 0 ? `${entry.breakDurationMinutes} m` : '0 m',
            formatHoursAndMinutes(duration, timeFormat),
        ]);
    });

    timesheet_aoa.push([]);
    timesheet_aoa.push(['', '', '', '', '', 'Gesamt:', formatHoursAndMinutes(actualWorkedHours, timeFormat)]);

    const ws_timesheet = XLSX.utils.aoa_to_sheet(timesheet_aoa);
    ws_timesheet['!cols'] = [ { wch: 12 }, { wch: 30 }, { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 15 } ];
    XLSX.utils.book_append_sheet(wb, ws_timesheet, `Stundenzettel ${monthName}`);

    const summary_aoa = [
        ['Zusammenfassung Stundenzettel'],
        [],
        ['Mitarbeiter:', `${employee.firstName} ${employee.lastName}`],
        ['Zeitraum:', `${monthName} ${year}`],
        [],
        ['Zusammenfassung Stundenkonto'],
        ['Übertrag Vormonat:', formatHoursAndMinutes(previousBalance, timeFormat)],
        [],
        ['Berechnung für diesen Monat'],
        ['Gearbeitet (aus Zeiteinträgen):', formatHoursAndMinutes(actualWorkedHours, timeFormat)],
        [`+ Gutschrift Urlaub (${monthlyAbsences.vacationDays} Tage):`, formatHoursAndMinutes(vacationCreditHours, timeFormat)],
        [`+ Gutschrift Krankheit (${monthlyAbsences.sickDays} Tage):`, formatHoursAndMinutes(sickLeaveCreditHours, timeFormat)],
        [`+ Gutschrift Feiertage:`, formatHoursAndMinutes(holidayCreditHours, timeFormat)],
        ['', '--------------------'],
        ['= Total Ist-Stunden:', formatHoursAndMinutes(totalCreditedHours, timeFormat)],
        [`- Soll-Stunden (${monthName}):`, formatHoursAndMinutes(currentMonthTargetHours, timeFormat)],
        ['', '--------------------'],
        ['= Saldo am Monatsende:', formatHoursAndMinutes(endOfMonthBalance, timeFormat)],
        [],
        ['Zusammenfassung Abwesenheiten'],
        [`Genommene Urlaubstage (${monthName}):`, `${monthlyAbsences.vacationDays} Tag(e)`],
        ['Verbliebene Urlaubstage (Jahr):', `${remainingVacation} Tag(e)`],
        [`Krankheitstage (${monthName}):`, `${monthlyAbsences.sickDays} Tag(e)`],
        [`Genommener Freizeitausgleich (${monthName}):`, `${monthlyAbsences.timeOffDays} Tag(e)`],
    ];
    const ws_summary = XLSX.utils.aoa_to_sheet(summary_aoa);
    ws_summary['!cols'] = [ { wch: 45 }, { wch: 20 } ];
    XLSX.utils.book_append_sheet(wb, ws_summary, 'Zusammenfassung');
    
    XLSX.writeFile(wb, `Stundenzettel_${employee.lastName}_${year}_${monthName}.xlsx`);
};

export const exportTimesheetAsPdf = (params: ExportTimesheetParams) => {
    const data = getTimesheetExportData(params);
    const { employee, year, monthName, customers, activities, companySettings, timeFormat,
            previousBalance, actualWorkedHours, vacationCreditHours, sickLeaveCreditHours, holidayCreditHours,
            totalCreditedHours, currentMonthTargetHours, endOfMonthBalance, monthlyAbsences, remainingVacation,
            employeeTimeEntriesCurrentMonth } = data;

    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(`Stundenzettel für ${monthName} ${year}`, 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Mitarbeiter: ${employee.firstName} ${employee.lastName}`, 14, 32);
    doc.text(`Firma: ${companySettings.companyName}`, 14, 38);

    const customerLabel = companySettings.customerLabel || 'Kunde';
    const activityLabel = companySettings.activityLabel || 'Tätigkeit';

    const tableBody = employeeTimeEntriesCurrentMonth.map(entry => {
        const duration = (new Date(entry.end).getTime() - new Date(entry.start).getTime()) / 3600000 - (entry.breakDurationMinutes / 60);
        return [
            new Date(entry.start).toLocaleDateString('de-DE'),
            customers.find(c => c.id === entry.customerId)?.name || 'N/A',
            activities.find(a => a.id === entry.activityId)?.name || 'N/A',
            new Date(entry.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit'}),
            new Date(entry.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit'}),
            entry.breakDurationMinutes > 0 ? `${entry.breakDurationMinutes} m` : '0 m',
            formatHoursAndMinutes(duration, timeFormat),
        ];
    });

    const totalRow = ['', '', '', '', '', 'Gesamt:', formatHoursAndMinutes(actualWorkedHours, timeFormat)];

    (doc as any).autoTable({
        startY: 50,
        head: [['Datum', customerLabel, activityLabel, 'Start', 'Ende', 'Pause', 'Dauer']],
        body: tableBody,
        foot: [totalRow],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        footStyles: { fontStyle: 'bold', fillColor: [241, 241, 241], textColor: 0 },
    });

    let finalY = (doc as any).lastAutoTable.finalY || 100;

    doc.setFontSize(14);
    doc.text('Zusammenfassung', 14, finalY + 15);

    (doc as any).autoTable({
        startY: finalY + 20,
        body: [
            ['Übertrag Vormonat:', formatHoursAndMinutes(previousBalance, timeFormat)],
            ['Gearbeitet (aus Zeiteinträgen):', formatHoursAndMinutes(actualWorkedHours, timeFormat)],
            [`+ Gutschrift Urlaub (${monthlyAbsences.vacationDays} Tage):`, formatHoursAndMinutes(vacationCreditHours, timeFormat)],
            [`+ Gutschrift Krankheit (${monthlyAbsences.sickDays} Tage):`, formatHoursAndMinutes(sickLeaveCreditHours, timeFormat)],
            [`+ Gutschrift Feiertage:`, formatHoursAndMinutes(holidayCreditHours, timeFormat)],
            ['= Total Ist-Stunden:', formatHoursAndMinutes(totalCreditedHours, timeFormat)],
            [`- Soll-Stunden (${monthName}):`, formatHoursAndMinutes(currentMonthTargetHours, timeFormat)],
            ['= Saldo am Monatsende:', formatHoursAndMinutes(endOfMonthBalance, timeFormat)],
        ],
        theme: 'striped',
        styles: { cellPadding: 2.5 },
        columnStyles: { 0: { fontStyle: 'bold' } }
    });
    
    finalY = (doc as any).lastAutoTable.finalY;

    (doc as any).autoTable({
        startY: finalY + 10,
        body: [
             [`Genommene Urlaubstage (${monthName}):`, `${monthlyAbsences.vacationDays} Tag(e)`],
             ['Verbliebene Urlaubstage (Jahr):', `${remainingVacation} Tag(e)`],
             [`Krankheitstage (${monthName}):`, `${monthlyAbsences.sickDays} Tag(e)`],
             [`Genommener Freizeitausgleich (${monthName}):`, `${monthlyAbsences.timeOffDays} Tag(e)`],
        ],
        theme: 'striped',
        styles: { cellPadding: 2.5 },
        columnStyles: { 0: { fontStyle: 'bold' } }
    });

    doc.save(`Stundenzettel_${employee.lastName}_${year}_${monthName}.pdf`);
};
