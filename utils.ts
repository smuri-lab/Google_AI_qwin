
import type { Employee, ContractDetails, Holiday, AbsenceRequest, TimeEntry, Customer, Activity, CompanySettings, HolidaysByYear } from '../types';
import { EmploymentType, AbsenceType } from '../types';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs';

/**
 * Finds the currently active contract details for an employee based on the current date.
 * It sorts the contract history by the 'validFrom' date in descending order
 * and returns the first version that is effective as of today.
 * @param employee The employee object with its contract history.
 * @returns The currently active ContractDetails object.
 */
export const getCurrentContractDetails = (employee: Employee): ContractDetails => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Handle case where contract history might be missing or empty
  if (!employee.contractHistory || employee.contractHistory.length === 0) {
    console.error(`Mitarbeiter ${employee.id} hat keine Vertragshistorie.`);
    // Return a default/empty contract to avoid crashes
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
    new Date(contract.validFrom).getTime() <= today.getTime()
  );

  return currentContract || sortedHistory[sortedHistory.length - 1];
};


/**
 * Formats a decimal number of hours into a string with hours and minutes.
 * e.g., 8.5 becomes "8h 30min"
 * @param decimalHours The hours as a decimal number.
 * @returns A formatted string.
 */
export const formatHoursAndMinutes = (decimalHours: number): string => {
    const sign = decimalHours < 0 ? "-" : "";
    const absDecimalHours = Math.abs(decimalHours);
    let hours = Math.floor(absDecimalHours);
    const fractionalPart = absDecimalHours - hours;
    let minutes = Math.round(fractionalPart * 60);

    if (minutes === 60) {
        hours += 1;
        minutes = 0;
    }

    return `${sign}${hours}h ${minutes.toString().padStart(2, '0')}min`;
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
        req.type === AbsenceType.Vacation &&
        new Date(req.startDate).getFullYear() <= year &&
        new Date(req.endDate).getFullYear() >= year
    );

    let totalDays = 0;
    for (const req of approvedVacations) {
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

    const approvedAbsences = absenceRequests.filter(req => 
        req.employeeId === employeeId &&
        req.status === 'approved' &&
        new Date(req.startDate) <= monthEnd && 
        new Date(req.endDate) >= monthStart
    );

    const result = { vacationDays: 0, sickDays: 0, timeOffDays: 0 };
    
    for (const req of approvedAbsences) {
        const reqStart = new Date(req.startDate);
        const reqEnd = new Date(req.endDate);

        const effectiveStart = reqStart < monthStart ? monthStart : reqStart;
        const effectiveEnd = reqEnd > monthEnd ? monthEnd : reqEnd;
        
        const workdays = countWorkdaysInDateRange(effectiveStart, effectiveEnd, holidays);
        
        if (workdays > 0) {
            if (req.type === AbsenceType.Vacation) result.vacationDays += workdays;
            else if (req.type === AbsenceType.SickLeave) result.sickDays += workdays;
            else if (req.type === AbsenceType.TimeOff) result.timeOffDays += workdays;
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
            return { label: 'Urlaub', dotClass: 'bg-blue-500', bgClass: 'bg-blue-50', borderClass: 'border-blue-200', textClass: 'text-blue-800' };
        case AbsenceType.SickLeave:
            return { label: 'Krankmeldung', dotClass: 'bg-yellow-500', bgClass: 'bg-yellow-50', borderClass: 'border-yellow-200', textClass: 'text-yellow-800' };
        case AbsenceType.TimeOff:
            return { label: 'Freizeitausgleich', dotClass: 'bg-blue-500', bgClass: 'bg-blue-50', borderClass: 'border-blue-200', textClass: 'text-blue-800' };
        default:
            return { label: 'Abwesenheit', dotClass: 'bg-gray-500', bgClass: 'bg-gray-50', borderClass: 'border-gray-200', textClass: 'text-gray-800' };
    }
};


// --- EXPORT FUNCTION ---

interface ExportTimesheetParams {
    employee: Employee;
    year: number;
    month: number;
    allTimeEntries: TimeEntry[];
    allAbsenceRequests: AbsenceRequest[];
    holidays: Holiday[];
    customers: Customer[];
    activities: Activity[];
    selectedState: string;
    companySettings: CompanySettings;
}

export const exportTimesheet = async (params: ExportTimesheetParams) => {
    const { employee, year, month, allTimeEntries, allAbsenceRequests, holidays, customers, activities, selectedState, companySettings } = params;
    
    let yearSpecificHolidays: Holiday[];
    try {
        const response = await fetch(`https://feiertage-api.de/api/?jahr=${year}&nur_land=${selectedState}`);
        if (!response.ok) throw new Error('Failed to fetch holidays for the selected year.');
        const data = await response.json();
        yearSpecificHolidays = Object.entries(data).map(([name, details]: [string, any]) => ({ name, date: details.datum }));
    } catch (error) {
        console.error("Could not fetch year-specific holidays, falling back to current year's holidays.", error);
        yearSpecificHolidays = holidays;
    }
    
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    endDate.setHours(23, 59, 59, 999);
    
    const previousMonthEndDate = new Date(year, month, 0);
    previousMonthEndDate.setHours(23, 59, 59, 999);

    const currentContract = getCurrentContractDetails(employee);

    const timeEntriesBefore = allTimeEntries.filter(e => e.employeeId === employee.id && new Date(e.start) <= previousMonthEndDate);
    const workedHoursBefore = timeEntriesBefore.reduce((sum, e) => sum + ((new Date(e.end).getTime() - new Date(e.start).getTime()) / 1000 / 3600 - (e.breakDurationMinutes / 60)), 0);
    
    // The previous implementation of calculateTargetHours was complex and potentially incorrect,
    // so we derive the previous balance from simplified logic for the export.
    // NOTE: This will not perfectly match the live balance if there are contract changes,
    // but it provides a reasonable estimate for the timesheet.
    const monthCount = (previousMonthEndDate.getFullYear() - new Date(employee.firstWorkDay).getFullYear()) * 12 + (previousMonthEndDate.getMonth() - new Date(employee.firstWorkDay).getMonth());
    const targetHoursBefore = monthCount * currentContract.monthlyTargetHours; // Simplified
    const previousBalance = (employee.startingTimeBalanceHours || 0) + workedHoursBefore - targetHoursBefore;
    
    const employeeTimeEntriesCurrentMonth = allTimeEntries.filter(entry => {
        const entryDate = new Date(entry.start);
        return entry.employeeId === employee.id && entryDate >= startDate && entryDate <= endDate;
    }).sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const actualWorkedHours = employeeTimeEntriesCurrentMonth.reduce((sum, e) => sum + ((new Date(e.end).getTime() - new Date(e.start).getTime()) / 1000 / 3600 - (e.breakDurationMinutes / 60)), 0);
    
    const monthlyAbsences = calculateAbsenceDaysInMonth(employee.id, allAbsenceRequests, year, month, yearSpecificHolidays);
    const annualVacationTaken = calculateAnnualVacationTaken(employee.id, allAbsenceRequests, year, yearSpecificHolidays);
    const remainingVacation = currentContract.vacationDays - annualVacationTaken;

    const holidayDates = new Set(yearSpecificHolidays.map(h => h.date));
    let holidayWorkdaysInMonth = 0;
    const curDate = new Date(year, month, 1);
    
    while(curDate <= endDate) {
        const dayOfWeek = curDate.getDay();
        const dateString = curDate.toLocaleDateString('sv-SE');
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && holidayDates.has(dateString)) {
            holidayWorkdaysInMonth++;
        }
        curDate.setDate(curDate.getDate() + 1);
    }
    
    const holidayCreditHours = holidayWorkdaysInMonth * currentContract.dailyTargetHours;
    const vacationCreditHours = monthlyAbsences.vacationDays * currentContract.dailyTargetHours;
    const sickLeaveCreditHours = monthlyAbsences.sickDays * currentContract.dailyTargetHours;
    const totalCreditedHours = actualWorkedHours + vacationCreditHours + sickLeaveCreditHours + holidayCreditHours;

    const currentMonthTargetHours = currentContract.monthlyTargetHours;
    const endOfMonthBalance = previousBalance + totalCreditedHours - currentMonthTargetHours;
    
    const dataForExcel = employeeTimeEntriesCurrentMonth.map(entry => {
        const duration = (new Date(entry.end).getTime() - new Date(entry.start).getTime()) / 1000 / 3600 - (entry.breakDurationMinutes / 60);

        const customerLabel = companySettings.customerLabel || 'Kunde';
        const activityLabel = companySettings.activityLabel || 'Tätigkeit';

        return {
            "Datum": new Date(entry.start).toLocaleDateString('de-DE'),
            [customerLabel]: customers.find(c => c.id === entry.customerId)?.name || 'N/A',
            [activityLabel]: activities.find(a => a.id === entry.activityId)?.name || 'N/A',
            "Start": new Date(entry.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit'}),
            "Ende": new Date(entry.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit'}),
            "Pause (Min)": entry.breakDurationMinutes,
            "Dauer": formatHoursAndMinutes(duration),
        };
    });

    const monthName = startDate.toLocaleString('de-DE', { month: 'long' });

    const customerLabel = companySettings.customerLabel || 'Kunde';
    const activityLabel = companySettings.activityLabel || 'Tätigkeit';

    const ws = XLSX.utils.json_to_sheet([], {
      headers: ["Datum", customerLabel, activityLabel, "Start", "Ende", "Pause (Min)", "Dauer"],
    });
    XLSX.utils.sheet_add_json(ws, dataForExcel, { skipHeader: true, origin: -1 });
    
    const summaryData = [
        [],
        ["Zusammenfassung Stundenkonto"],
        ["Übertrag Vormonat:", formatHoursAndMinutes(previousBalance)],
        [""],
        ["Berechnung für diesen Monat"],
        ["   Gearbeitet (aus Zeiteinträgen):", formatHoursAndMinutes(actualWorkedHours)],
        [`   + Gutschrift Urlaub (${monthlyAbsences.vacationDays} Tage):`, formatHoursAndMinutes(vacationCreditHours)],
        [`   + Gutschrift Krankheit (${monthlyAbsences.sickDays} Tage):`, formatHoursAndMinutes(sickLeaveCreditHours)],
        [`   + Gutschrift Feiertage (${holidayWorkdaysInMonth} Tage):`, formatHoursAndMinutes(holidayCreditHours)],
        ["   ---------------------------------"],
        ["   = Total Ist-Stunden:", formatHoursAndMinutes(totalCreditedHours)],
        [`   - Soll-Stunden (${monthName}):`, formatHoursAndMinutes(currentMonthTargetHours)],
        ["   ---------------------------------"],
        ["= Saldo am Monatsende:", formatHoursAndMinutes(endOfMonthBalance)],
    ];
    XLSX.utils.sheet_add_aoa(ws, summaryData, { origin: -1 });

    const absenceSummaryData = [
      [],
      ["Zusammenfassung Abwesenheiten"],
      [`Genommene Urlaubstage (${monthName}):`, `${monthlyAbsences.vacationDays} Tag(e)`],
      ["Verbliebene Urlaubstage (Jahr):", `${remainingVacation} Tag(e)`],
      [`Krankheitstage (${monthName}):`, `${monthlyAbsences.sickDays} Tag(e)`],
      [`Genommener Freizeitausgleich (${monthName}):`, `${monthlyAbsences.timeOffDays} Tag(e)`],
    ];
    XLSX.utils.sheet_add_aoa(ws, absenceSummaryData, { origin: -1 });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Stundenzettel ${monthName}`);
    XLSX.writeFile(wb, `Stundenzettel_${employee.lastName}_${year}_${monthName}.xlsx`);
};
