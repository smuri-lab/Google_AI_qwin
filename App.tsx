import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/CalendarView';
import { AdminView } from './components/AdminView';
import { BottomNav } from './components/BottomNav';
import type { TimeEntry, AbsenceRequest, UserAccount, Employee, Customer, Activity, Holiday, CompanySettings, TimeBalanceAdjustment, HolidaysByYear, WeeklySchedule } from './types';
import { View, EmploymentType, AbsenceType, TargetHoursModel } from './types';
import { INITIAL_CUSTOMERS, INITIAL_ACTIVITIES, INITIAL_USER_ACCOUNT, INITIAL_EMPLOYEES, getHolidays, GermanState } from './constants';
import { LoginScreen } from './components/LoginScreen';
import { RegistrationScreen } from './components/RegistrationScreen';
import { getContractDetailsForDate, calculateAnnualVacationTaken, calculateBalance } from './utils';
import { ActionSheet } from './components/ui/ActionSheet';
import { AbsenceRequestModal } from './components/AbsenceRequestModal';
import { ManualEntryFormModal } from './components/ManualEntryFormModal';

const applyAutomaticBreaks = (entryData: Omit<TimeEntry, 'id' | 'employeeId'> | TimeEntry, employee: Employee): Omit<TimeEntry, 'id' | 'employeeId'> | TimeEntry => {
    if (!employee.automaticBreakDeduction) return entryData;
    const durationMs = new Date(entryData.end).getTime() - new Date(entryData.start).getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    let requiredBreak = 0;
    if (durationHours > 9) requiredBreak = 45;
    else if (durationHours > 6) requiredBreak = 30;
    const newBreakDuration = Math.max(entryData.breakDurationMinutes || 0, requiredBreak);
    return { ...entryData, breakDurationMinutes: newBreakDuration };
};

const MOCK_CURRENT_YEAR = 2026;

const App: React.FC = () => {
  const [loggedInUser, setLoggedInUser] = useState<Employee | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [adminViewMode, setAdminViewMode] = useState<'admin' | 'employee'>('admin');
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [absenceRequests, setAbsenceRequests] = useState<AbsenceRequest[]>([]);
  const [timeBalanceAdjustments, setTimeBalanceAdjustments] = useState<TimeBalanceAdjustment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [activities, setActivities] = useState<Activity[]>(INITIAL_ACTIVITIES);
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    companyName: 'Musterfirma GmbH',
    street: 'Hauptstraße',
    houseNumber: '1',
    postalCode: '10115',
    city: 'Berlin',
    email: 'admin@musterfirma.de',
    editLockRule: 'currentMonth',
    employeeCanExport: true,
    allowHalfDayVacations: true,
    customerLabel: 'Zeitkategorie 1',
    activityLabel: 'Zeitkategorie 2',
    adminTimeFormat: 'hoursMinutes',
    employeeTimeFormat: 'hoursMinutes',
  });
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [isAbsenceRequestModalOpen, setIsAbsenceRequestModalOpen] = useState(false);
  const [isManualEntryModalOpen, setIsManualEntryModalOpen] = useState(false);

  const [selectedState, setSelectedState] = useState<GermanState>('BW');
  const [timeTrackingMethod, setTimeTrackingMethod] = useState<'all' | 'manual'>('all');
  const [holidaysByYear, setHolidaysByYear] = useState<HolidaysByYear>({});

  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [stopwatchCustomerId, setStopwatchCustomerId] = useState('');
  const [stopwatchActivityId, setStopwatchActivityId] = useState('');
  const [stopwatchComment, setStopwatchComment] = useState('');
  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
  const intervalRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (isRunning && startTime) {
      intervalRef.current = window.setInterval(() => {
        setElapsedTime(Date.now() - startTime.getTime());
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, startTime]);

  const ensureHolidaysForYear = useCallback((year: number) => {
    if (holidaysByYear.hasOwnProperty(year)) return;
    const holidays = getHolidays(year, selectedState);
    setHolidaysByYear(prev => ({...prev, [year]: holidays}));
  }, [holidaysByYear, selectedState]);

  const isDisplayingAdminView = loggedInUser?.role === 'admin' && adminViewMode === 'admin';
  const currentUser = isDisplayingAdminView ? null : loggedInUser;

  const handleLogin = useCallback((username: string, password: string): string | null => {
    const user = employees.find(e => e.username.toLowerCase() === username.toLowerCase());
    if (!user) return 'Benutzer nicht gefunden.';
    if (user.password !== password) return 'Falsches Passwort.';
    setLoggedInUser(user);
    return null;
  }, [employees]);

  const handleRegister = useCallback((employeeData: any, companyData: any) => {
      const newAdmin: Employee = {
          ...employeeData,
          id: Date.now(), isActive: true, lastModified: new Date().toISOString(), role: 'admin',
          contractHistory: [{ validFrom: employeeData.firstWorkDay, employmentType: EmploymentType.FullTime, monthlyTargetHours: 160, dailyTargetHours: 8, vacationDays: 30, street: '', houseNumber: '', postalCode: '', city: '' }]
      };
      setEmployees([newAdmin]);
      setCompanySettings({ ...companyData, adminTimeFormat: 'hoursMinutes', employeeTimeFormat: 'hoursMinutes' });
      setLoggedInUser(newAdmin);
  }, []);

  const addTimeEntry = useCallback((entry: Omit<TimeEntry, 'id' | 'employeeId'>) => {
    if (loggedInUser) {
      const finalEntry = applyAutomaticBreaks(entry, loggedInUser);
      setTimeEntries(prev => [...prev, { ...finalEntry, id: Date.now(), employeeId: loggedInUser.id }]);
    }
  }, [loggedInUser]);

  const vacationInfo = useMemo(() => {
    if (!currentUser) return { vacationDaysLeft: 0, annualEntitlement: 0, carryover: 0 };
    const currentYear = MOCK_CURRENT_YEAR;
    const contract = getContractDetailsForDate(currentUser, new Date(currentYear, 6, 1));
    const vacationTaken = calculateAnnualVacationTaken(currentUser.id, absenceRequests, currentYear, holidaysByYear[currentYear] || []);
    return { vacationDaysLeft: contract.vacationDays - vacationTaken, annualEntitlement: contract.vacationDays, carryover: 0 };
  }, [currentUser, absenceRequests, holidaysByYear]);

  const timeBalanceHours = useMemo(() => {
    if (!currentUser) return 0;
    const now = new Date();
    const calculationEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
    return calculateBalance(currentUser, calculationEndDate, timeEntries, absenceRequests, timeBalanceAdjustments, holidaysByYear);
  }, [currentUser, timeEntries, absenceRequests, timeBalanceAdjustments, holidaysByYear]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-10 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">TimePro</h1>
        {loggedInUser && (
            <button onClick={() => setLoggedInUser(null)} className="text-sm text-gray-500 hover:text-red-600">Logout</button>
        )}
      </header>
      <main className="flex-grow p-4">
        {!loggedInUser ? (
          authView === 'login' ? <LoginScreen onLogin={handleLogin} onSwitchToRegister={() => setAuthView('register')} employees={employees} /> : <RegistrationScreen onRegister={handleRegister} onSwitchToLogin={() => setAuthView('login')} />
        ) : isDisplayingAdminView ? (
          <AdminView {...{loggedInUser, absenceRequests, timeEntries, employees, customers, activities, selectedState, timeTrackingMethod, holidaysByYear, companySettings, timeBalanceAdjustments}} onEnsureHolidaysForYear={ensureHolidaysForYear} onUpdateTimeEntry={e => setTimeEntries(p => p.map(x => x.id === e.id ? e : x))} onDeleteTimeEntry={id => setTimeEntries(p => p.filter(x => x.id !== id))} onAddEmployee={e => setEmployees(p => [...p, {...e, id: Date.now()}])} onUpdateEmployee={e => setEmployees(p => p.map(x => x.id === e.id ? e : x))} onDeleteEmployee={id => setEmployees(p => p.filter(x => x.id !== id))} onAddCustomer={c => setCustomers(p => [...p, {...c, id: `c${Date.now()}`}])} onUpdateCustomer={c => setCustomers(p => p.map(x => x.id === c.id ? c : x))} onDeleteCustomer={id => setCustomers(p => p.filter(x => x.id !== id))} onAddActivity={a => setActivities(p => [...p, {...a, id: `a${Date.now()}`}])} onUpdateActivity={a => setActivities(p => p.map(x => x.id === a.id ? a : x))} onDeleteActivity={id => setActivities(p => p.filter(x => x.id !== id))} onStateChange={s => setSelectedState(s as GermanState)} onTimeTrackingMethodChange={setTimeTrackingMethod} onUpdateCompanySettings={setCompanySettings} onUpdateRequestStatus={(id, s, c) => setAbsenceRequests(p => p.map(x => x.id === id ? {...x, status: s, adminComment: c} : x))} onUpdateAbsenceRequest={r => setAbsenceRequests(p => p.map(x => x.id === r.id ? r : x))} onDeleteAbsenceRequest={id => setAbsenceRequests(p => p.filter(x => x.id !== id))} addAbsenceRequest={(r, s) => setAbsenceRequests(p => [...p, {...r, id: Date.now(), status: s}])} addTimeBalanceAdjustment={a => setTimeBalanceAdjustments(p => [...p, {...a, id: Date.now()}])} onUpdateTimeBalanceAdjustment={a => setTimeBalanceAdjustments(p => p.map(x => x.id === a.id ? a : x))} onDeleteTimeBalanceAdjustment={id => setTimeBalanceAdjustments(p => p.filter(x => x.id !== id))} onAddTimeEntry={(e, id) => setTimeEntries(p => [...p, {...e, id: Date.now(), employeeId: id}])} />
        ) : (
          <Dashboard {...{currentUser, addTimeEntry, timeEntries, customers, activities, timeTrackingMethod, companySettings, isRunning, elapsedTime, stopwatchCustomerId, stopwatchActivityId, stopwatchComment, isBreakModalOpen}} userAccount={{timeBalanceHours, vacationDaysLeft: vacationInfo.vacationDaysLeft}} currentMonthWorkedHours={0} dashboardType={loggedInUser.dashboardType || 'standard'} absenceRequests={absenceRequests} holidays={holidaysByYear[MOCK_CURRENT_YEAR] || []} selectedState={selectedState} mockCurrentYear={MOCK_CURRENT_YEAR} setIsBreakModalOpen={setIsBreakModalOpen} setIsRunning={setIsRunning} setStartTime={setStartTime} setElapsedTime={setElapsedTime} setStopwatchCustomerId={setStopwatchCustomerId} setStopwatchActivityId={setStopwatchActivityId} setStopwatchComment={setStopwatchComment} />
        )}
      </main>
      {loggedInUser && !isDisplayingAdminView && <BottomNav currentView={currentView} setCurrentView={setCurrentView} onAddClick={() => setIsActionSheetOpen(true)} timeTrackingMethod={timeTrackingMethod} />}
      {isActionSheetOpen && <ActionSheet onClose={() => setIsActionSheetOpen(false)} onSelect={a => { if (a === 'manualTime') setIsManualEntryModalOpen(true); else setIsAbsenceRequestModalOpen(true); setIsActionSheetOpen(false); }} />}
      {isAbsenceRequestModalOpen && <AbsenceRequestModal isOpen={isAbsenceRequestModalOpen} onClose={() => setIsAbsenceRequestModalOpen(false)} currentUser={loggedInUser!} onSubmit={r => {setAbsenceRequests(p => [...p, {...r, id: Date.now(), status: 'pending'}])}} existingAbsences={absenceRequests} timeEntries={timeEntries} companySettings={companySettings} />}
      {isManualEntryModalOpen && <ManualEntryFormModal isOpen={isManualEntryModalOpen} onClose={() => setIsManualEntryModalOpen(false)} addTimeEntry={addTimeEntry} timeEntries={timeEntries} customers={customers} activities={activities} companySettings={companySettings} absenceRequests={absenceRequests} onSuccess={() => setIsManualEntryModalOpen(false)} />}
    </div>
  );
};

export default App;