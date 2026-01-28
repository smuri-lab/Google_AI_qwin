
export interface Customer {
  id: string;
  name: string; // Display name for time tracking
  companyName: string;
  contactPerson?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  email?: string;
  phone?: string;
  nfcTagId?: string;
  // Geofencing fields
  gpsLat?: number;
  gpsLng?: number;
  gpsRadius?: number; // meters
  enforceGeofencing?: boolean;
}

export interface Activity {
  id: string;
  name: string;
}

export interface TimeEntry {
  id: number;
  employeeId: number;
  start: string;
  end: string;
  customerId: string;
  activityId: string;
  breakDurationMinutes: number;
  type: 'stopwatch' | 'manual';
  comment?: string;
  // Captured GPS Data
  startGpsLat?: number;
  startGpsLng?: number;
}

export interface Shift {
  id: string;
  employeeId: number;
  start: string; // ISO String containing date and time
  end: string;   // ISO String containing date and time
  label?: string; // Optional title e.g. "Frühschicht"
  color?: string; // Hex code for UI
  customerId?: string;
  activityId?: string;
}

export enum AbsenceType {
  Vacation = 'vacation',
  SickLeave = 'sick_leave',
  TimeOff = 'time_off',
}

export interface AbsenceRequest {
  id: number;
  employeeId: number;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  dayPortion?: 'full' | 'am' | 'pm';
  photo?: File;
  status: 'pending' | 'approved' | 'rejected';
  adminComment?: string;
}

export enum TimeBalanceAdjustmentType {
  Correction = 'correction',
  Payout = 'payout',
}

export interface TimeBalanceAdjustment {
  id: number;
  employeeId: number;
  date: string; // YYYY-MM-DD
  type: TimeBalanceAdjustmentType;
  hours: number; // can be positive or negative
  note: string;
}


export interface UserAccount {
    timeBalanceHours: number;
    vacationDaysLeft: number;
    vacationAnnualEntitlement?: number;
    vacationCarryover?: number;
}

export enum EmploymentType {
  FullTime = 'full_time',
  PartTime = 'part_time',
  MiniJob = 'mini_job',
}

export enum TargetHoursModel {
    Monthly = 'monthly',
    Weekly = 'weekly',
}

export interface WeeklySchedule {
    mon: number;
    tue: number;
    wed: number;
    thu: number;
    fri: number;
    sat: number;
    sun: number;
}

export interface ContractDetails {
  validFrom: string;
  employmentType: EmploymentType;
  monthlyTargetHours: number;
  dailyTargetHours: number;
  vacationDays: number;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  targetHoursModel?: TargetHoursModel;
  weeklySchedule?: WeeklySchedule;
}

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  username: string;
  password?: string;
  email?: string; // Added email field
  isActive: boolean;
  firstWorkDay: string;
  lastModified: string;
  contractHistory: ContractDetails[];
  role: 'admin' | 'employee';
  startingTimeBalanceHours?: number;
  dashboardType?: 'standard' | 'simplified';
  vacationCarryover?: { [year: number]: number };
  automaticBreakDeduction?: boolean;
  showVacationWarning?: boolean;
}


export enum View {
    Dashboard = 'dashboard',
    Calendar = 'calendar',
    Overview = 'overview',
}

export enum AdminViewType {
    Planner = 'planner',
    ShiftPlanner = 'shift_planner', // New View
    TimeTracking = 'time_tracking',
    Reports = 'reports',
    Employees = 'employees',
    Customers = 'customers',
    Activities = 'activities',
    Settings = 'settings',
    Profile = 'profile',
}

export interface Holiday {
    date: string;
    name: string;
}

export type HolidaysByYear = { [year: number]: Holiday[] };

export interface CompanySettings {
  companyName: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  email: string;
  editLockRule?: 'unlimited' | 'sameDay' | 'previousWeek' | 'currentMonth';
  employeeCanExport?: boolean;
  allowHalfDayVacations?: boolean;
  customerLabel?: string;
  activityLabel?: string;
  adminTimeFormat?: 'decimal' | 'hoursMinutes';
  employeeTimeFormat?: 'decimal' | 'hoursMinutes';
  // Shift Planner Settings
  shiftPlannerStartHour?: number;
  shiftPlannerEndHour?: number;
}
