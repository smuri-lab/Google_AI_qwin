import type { Customer, Activity, UserAccount, Employee, Holiday } from './types';
import { EmploymentType, TargetHoursModel, type WeeklySchedule } from './types';

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Musterfirma GmbH - Projekt A', companyName: 'Musterfirma GmbH', city: 'Berlin', contactPerson: 'Max Mustermann' },
  { id: 'c2', name: 'Bauprojekt Meier - Baustelle 1', companyName: 'Bauunternehmen Meier', city: 'München', contactPerson: 'Petra Meier' },
  { id: 'c3', name: 'Kunde Schmidt - Wartung', companyName: 'Heizung & Sanitär Schmidt', city: 'Hamburg' },
  { id: 'c4', name: 'Interne Verwaltung', companyName: 'Eigene Firma', city: 'Köln' },
];

export const INITIAL_ACTIVITIES: Activity[] = [
  { id: 'a1', name: 'Beratung' },
  { id: 'a2', name: 'Installation' },
  { id: 'a3', name: 'Wartung' },
  { id: 'a4', name: 'Büroarbeit' },
];

export const INITIAL_USER_ACCOUNT: UserAccount = {
    timeBalanceHours: 0,
    vacationDaysLeft: 28,
};

export const INITIAL_EMPLOYEES: Employee[] = [
    {
        id: 0,
        firstName: 'Admin',
        lastName: 'User',
        dateOfBirth: '1980-01-01',
        username: 'admin',
        password: 'admin123',
        isActive: true,
        firstWorkDay: '2025-07-01',
        lastModified: new Date().toISOString(),
        role: 'admin',
        startingTimeBalanceHours: 0,
        automaticBreakDeduction: false,
        showVacationWarning: true,
        contractHistory: [
            {
                validFrom: '2025-07-01',
                employmentType: EmploymentType.FullTime,
                monthlyTargetHours: 160,
                dailyTargetHours: 8,
                vacationDays: 15,
                street: 'Hauptstraße',
                houseNumber: '1',
                postalCode: '10115',
                city: 'Berlin'
            },
            {
                validFrom: '2026-01-01',
                employmentType: EmploymentType.FullTime,
                monthlyTargetHours: 160,
                dailyTargetHours: 8,
                vacationDays: 30,
                street: 'Hauptstraße',
                houseNumber: '1',
                postalCode: '10115',
                city: 'Berlin'
            }
        ]
    },
    {
        id: 1,
        firstName: 'Jan',
        lastName: 'Demo',
        dateOfBirth: '1990-01-15',
        username: 'jdemo',
        password: 'password2025',
        isActive: true,
        firstWorkDay: '2025-01-01',
        lastModified: new Date().toISOString(),
        role: 'employee',
        startingTimeBalanceHours: 0,
        automaticBreakDeduction: true,
        dashboardType: 'standard',
        showVacationWarning: true,
        contractHistory: [
            {
                validFrom: '2025-01-01',
                employmentType: EmploymentType.FullTime,
                monthlyTargetHours: 174,
                dailyTargetHours: 8,
                vacationDays: 30,
                street: 'Demostraße',
                houseNumber: '1',
                postalCode: '12345',
                city: 'Demostadt'
            }
        ]
    },
    {
        id: 2,
        firstName: 'Tina',
        lastName: 'Teilzeit',
        dateOfBirth: '1995-05-20',
        username: 'tteilzeit',
        password: 'password2026',
        isActive: true,
        firstWorkDay: '2026-01-01',
        lastModified: new Date().toISOString(),
        role: 'employee',
        startingTimeBalanceHours: 0,
        automaticBreakDeduction: false,
        dashboardType: 'standard',
        showVacationWarning: true,
        contractHistory: [
            {
                validFrom: '2026-01-01',
                employmentType: EmploymentType.PartTime,
                targetHoursModel: TargetHoursModel.Weekly,
                weeklySchedule: { mon: 8, tue: 8, wed: 4, thu: 0, fri: 0, sat: 0, sun: 0 } as WeeklySchedule,
                monthlyTargetHours: 86.67, // (20h * 52) / 12
                dailyTargetHours: 6.67,    // 20h / 3 days
                vacationDays: 18,
                street: 'Nebenweg',
                houseNumber: '2',
                postalCode: '54321',
                city: 'Kleinstadt'
            }
        ]
    }
];

// FIX: Add GermanState type and getHolidays function to resolve import errors.
export type GermanState = 'BW' | 'BY' | 'BE' | 'BB' | 'HB' | 'HH' | 'HE' | 'MV' | 'NI' | 'NW' | 'RP' | 'SL' | 'SN' | 'ST' | 'SH' | 'TH';

const formatDate = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const getEasterSunday = (year: number): Date => {
    // Meeus/Jones/Butcher algorithm to determine Easter Sunday
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

export const getHolidays = (year: number, state: GermanState): Holiday[] => {
    const holidays: Holiday[] = [];
    const easterSunday = getEasterSunday(year);

    const addHoliday = (name: string, date: Date) => {
        holidays.push({ name, date: formatDate(date) });
    };

    const addHolidayWithOffset = (name: string, baseDate: Date, offsetDays: number) => {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + offsetDays);
        addHoliday(name, date);
    };

    // Nationwide fixed holidays
    addHoliday('Neujahr', new Date(year, 0, 1));
    addHoliday('Tag der Arbeit', new Date(year, 4, 1));
    addHoliday('Tag der Deutschen Einheit', new Date(year, 9, 3));
    addHoliday('1. Weihnachtstag', new Date(year, 11, 25));
    addHoliday('2. Weihnachtstag', new Date(year, 11, 26));

    // Nationwide holidays dependent on Easter
    addHolidayWithOffset('Karfreitag', easterSunday, -2);
    addHolidayWithOffset('Ostermontag', easterSunday, 1);
    addHolidayWithOffset('Christi Himmelfahrt', easterSunday, 39);
    addHolidayWithOffset('Pfingstmontag', easterSunday, 50);

    // State-specific holidays
    switch (state) {
        case 'BW':
        case 'BY':
        case 'ST':
            addHoliday('Heilige Drei Könige', new Date(year, 0, 6));
            break;
        case 'BE':
            addHoliday('Internationaler Frauentag', new Date(year, 2, 8));
            break;
        case 'BB':
        case 'MV':
        case 'SN':
        case 'TH':
        case 'HH':
        case 'NI':
        case 'SH':
            addHoliday('Reformationstag', new Date(year, 9, 31));
            break;
    }

    // Holidays in multiple, but not all, states
    if (['BW', 'BY', 'HE', 'NW', 'RP', 'SL'].includes(state)) {
        addHolidayWithOffset('Fronleichnam', easterSunday, 60);
    }
    if (state === 'SL' || (state === 'BY')) {
        addHoliday('Mariä Himmelfahrt', new Date(year, 7, 15));
    }
    if (['BW', 'BY', 'NW', 'RP', 'SL'].includes(state)) {
        addHoliday('Allerheiligen', new Date(year, 10, 1));
    }
    if (state === 'SN') {
        let bussUndBettag = new Date(year, 10, 22);
        bussUndBettag.setDate(bussUndBettag.getDate() - ((bussUndBettag.getDay() + 4) % 7));
        addHoliday('Buß- und Bettag', bussUndBettag);
    }
    if (state === 'TH') {
        addHoliday('Weltkindertag', new Date(year, 8, 20));
    }
    
    return holidays.sort((a, b) => a.date.localeCompare(b.date));
};