import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import type { Employee, ContractDetails, WeeklySchedule, CompanySettings } from '../../types';
import { EmploymentType, TargetHoursModel } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { XIcon } from '../icons/XIcon';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { getContractDetailsForDate } from '../utils';
import { CalendarModal } from '../ui/CalendarModal';
import { DateSelectorButton } from '../ui/DateSelectorButton';
import { FlexibleTimeInput } from '../ui/FlexibleTimeInput';
import { FlexibleTimeInputCompact } from '../ui/FlexibleTimeInputCompact';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Omit<Employee, 'id'> | Employee) => void;
  initialData: Employee | null;
  loggedInUser: Employee;
  companySettings: CompanySettings;
}

type FormData = Omit<Employee, 'id' | 'contractHistory' | 'lastModified'> & Partial<ContractDetails> & { changesValidFrom?: string };

const defaultState: Omit<Employee, 'id'> = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  username: '',
  password: '',
  isActive: true,
  firstWorkDay: new Date().toLocaleDateString('sv-SE'),
  lastModified: '', 
  contractHistory: [],
  role: 'employee',
  startingTimeBalanceHours: 0,
  dashboardType: 'standard',
  automaticBreakDeduction: false,
  showVacationWarning: true,
};

const defaultContractState: Omit<ContractDetails, 'validFrom'> = {
    street: '',
    houseNumber: '',
    postalCode: '',
    city: '',
    employmentType: EmploymentType.FullTime,
    monthlyTargetHours: 160,
    dailyTargetHours: 8,
    vacationDays: 30,
    targetHoursModel: TargetHoursModel.Monthly,
};

const defaultWeeklySchedule: WeeklySchedule = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 };
const weekDays: (keyof WeeklySchedule)[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const weekDayLabels: { [key in keyof WeeklySchedule]: string } = { mon: 'Montag', tue: 'Dienstag', wed: 'Mittwoch', thu: 'Donnerstag', fri: 'Freitag', sat: 'Samstag', sun: 'Sonntag' };

const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({ isOpen, onClose, onSave, initialData, loggedInUser, companySettings }) => {
  const [formData, setFormData] = useState<Partial<FormData>>(() => ({
    ...defaultState,
    ...defaultContractState,
    validFrom: defaultState.firstWorkDay,
  }));
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [entryYearVacationDays, setEntryYearVacationDays] = useState('');
  const [followingYearVacationDays, setFollowingYearVacationDays] = useState('');
  const [openDatePicker, setOpenDatePicker] = useState<'firstWorkDay' | 'changesValidFrom' | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const timeFormat = companySettings.adminTimeFormat || 'hoursMinutes';

  const birthYears = useMemo(() => Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - 18 - i), []);
  const birthMonths = useMemo(() => [
      { value: '01', label: 'Januar' }, { value: '02', label: 'Februar' },
      { value: '03', label: 'März' }, { value: '04', label: 'April' },
      { value: '05', label: 'Mai' }, { value: '06', label: 'Juni' },
      { value: '07', label: 'Juli' }, { value: '08', label: 'August' },
      { value: '09', label: 'September' }, { value: '10', label: 'Oktober' },
      { value: '11', label: 'November' }, { value: '12', label: 'Dezember' },
  ], []);
  const daysInMonth = useMemo(() => {
      if (birthYear && birthMonth) {
          return new Date(parseInt(birthYear), parseInt(birthMonth), 0).getDate();
      }
      return 31;
  }, [birthYear, birthMonth]);
  const birthDays = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString()), [daysInMonth]);

  useEffect(() => {
    if (isOpen) {
        setIsClosing(false); // Reset animation state
        if (initialData) {
          const changesDate = new Date();
          changesDate.setHours(0,0,0,0);
          const currentContract = getContractDetailsForDate(initialData, changesDate);
          setFormData({
            ...initialData,
            ...currentContract,
            password: '', 
            changesValidFrom: changesDate.toLocaleDateString('sv-SE'),
          });
            if (initialData.dateOfBirth) {
                const [year, month, day] = initialData.dateOfBirth.split('-');
                setBirthYear(year);
                setBirthMonth(month);
                setBirthDay(parseInt(day, 10).toString());
            } else {
                setBirthYear(''); setBirthMonth(''); setBirthDay('');
            }

          const entryYear = new Date(initialData.firstWorkDay).getFullYear();
          const entryContract = getContractDetailsForDate(initialData, new Date(initialData.firstWorkDay));
          setEntryYearVacationDays(String(entryContract.vacationDays));
          const followingYearContract = getContractDetailsForDate(initialData, new Date(entryYear + 1, 0, 1));
          setFollowingYearVacationDays(String(followingYearContract.vacationDays));
          
        } else {
          const newFirstWorkDay = new Date().toLocaleDateString('sv-SE');
          setFormData({
            ...defaultState,
            ...defaultContractState,
            vacationDays: undefined, 
            firstWorkDay: newFirstWorkDay,
            validFrom: newFirstWorkDay,
            weeklySchedule: defaultWeeklySchedule,
          });
          setBirthYear(''); setBirthMonth(''); setBirthDay('');
          setEntryYearVacationDays('');
          setFollowingYearVacationDays('');
        }
    }
  }, [initialData, isOpen]);

    useEffect(() => {
        if (birthYear && birthMonth && birthDay) {
            const maxDays = new Date(parseInt(birthYear), parseInt(birthMonth), 0).getDate();
            if (parseInt(birthDay) > maxDays) {
                setBirthDay(maxDays.toString());
            }
        }
    }, [birthYear, birthMonth]);

    useEffect(() => {
        if (birthYear && birthMonth && birthDay) {
            const fullDate = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
            setFormData(prev => ({ ...prev, dateOfBirth: fullDate }));
        } else {
            setFormData(prev => ({ ...prev, dateOfBirth: '' }));
        }
    }, [birthDay, birthMonth, birthYear]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'dashboardType' && value === 'simplified') {
        setFormData(prev => ({ ...prev, [name]: value, monthlyTargetHours: 0 }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleHoursMinutesChange = (name: 'monthlyTargetHours' | 'dailyTargetHours' | 'startingTimeBalanceHours', value: number) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateSelect = (selectedDate: Date) => {
    if (openDatePicker) {
        setFormData(prev => ({ ...prev, [openDatePicker]: selectedDate.toLocaleDateString('sv-SE') }));
    }
    setOpenDatePicker(null);
  };

  const handleWeeklyScheduleChange = (day: keyof WeeklySchedule, hours: number) => {
    const newSchedule: WeeklySchedule = { ...(formData.weeklySchedule || defaultWeeklySchedule), [day]: hours };
    
    const weeklySum = Object.values(newSchedule).reduce((sum, h) => sum + (h || 0), 0);
    const workingDays = Object.values(newSchedule).filter(h => (h || 0) > 0).length;
    const monthlyTarget = (weeklySum * 52) / 12;
    const dailyTarget = workingDays > 0 ? weeklySum / workingDays : 0;
    
    setFormData(prev => ({
        ...prev,
        weeklySchedule: newSchedule,
        monthlyTargetHours: parseFloat(monthlyTarget.toFixed(2)),
        dailyTargetHours: parseFloat(dailyTarget.toFixed(2))
    }));
  };
  
  const handleToggleChange = (name: 'isAdmin' | 'isActive' | 'automaticBreakDeduction' | 'showVacationWarning', checked: boolean) => {
      if (name === 'isAdmin') {
          setFormData(prev => ({ ...prev, role: checked ? 'admin' : 'employee' }));
      } else {
          setFormData(prev => ({ ...prev, [name]: checked }));
      }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dateOfBirth) {
        alert("Bitte geben Sie ein vollständiges Geburtsdatum an.");
        return;
    }
    
    setIsClosing(true);
    setTimeout(() => {
        const {
            firstName, lastName, dateOfBirth, username, password, isActive, firstWorkDay,
            street, houseNumber, postalCode, city, employmentType, monthlyTargetHours,
            dailyTargetHours, role, startingTimeBalanceHours, dashboardType,
            targetHoursModel, weeklySchedule, showVacationWarning, automaticBreakDeduction
        } = formData;

        const isWeekly = employmentType !== EmploymentType.FullTime && targetHoursModel === TargetHoursModel.Weekly;

        const contractBase: Omit<ContractDetails, 'validFrom' | 'vacationDays'> = {
            street: street!, houseNumber: houseNumber!, postalCode: postalCode!, city: city!, 
            employmentType: employmentType!, monthlyTargetHours: Number(monthlyTargetHours),
            dailyTargetHours: Number(dailyTargetHours),
            targetHoursModel: employmentType === EmploymentType.FullTime ? TargetHoursModel.Monthly : targetHoursModel,
            weeklySchedule: isWeekly ? weeklySchedule : undefined,
        };

        if (initialData) { // EDIT MODE
            const workingContractHistory = [...initialData.contractHistory];
            const entryYear = new Date(initialData.firstWorkDay).getFullYear();
            
            // Update vacation days for first contract (if editing)
            const firstContractIndex = workingContractHistory.findIndex((c: ContractDetails) => c.validFrom === initialData.firstWorkDay);
            if (firstContractIndex !== -1) {
                workingContractHistory[firstContractIndex].vacationDays = Number(entryYearVacationDays);
            }

            // Update/Create contract for following year
            const followingYearDateString = `${entryYear + 1}-01-01`;
            const followingYearContractIndex = workingContractHistory.findIndex((c: ContractDetails) => c.validFrom === followingYearDateString);
            if (followingYearContractIndex !== -1) {
                workingContractHistory[followingYearContractIndex].vacationDays = Number(followingYearVacationDays);
            } else if (followingYearVacationDays) {
                 const lastContractBefore = getContractDetailsForDate({ ...initialData, contractHistory: workingContractHistory }, new Date(entryYear, 11, 31));
                workingContractHistory.push({
                    ...lastContractBefore,
                    validFrom: followingYearDateString,
                    vacationDays: Number(followingYearVacationDays)
                });
            }
            
            // Handle first workday change
            if (firstWorkDay && firstWorkDay !== initialData.firstWorkDay && workingContractHistory.length > 0) {
                if (firstContractIndex !== -1) {
                    workingContractHistory[firstContractIndex].validFrom = firstWorkDay;
                }
            }

             const updatedEmployee: Employee = {
                ...initialData,
                firstName: firstName!, lastName: lastName!, dateOfBirth: dateOfBirth!, username: username!, 
                isActive: isActive!, firstWorkDay: firstWorkDay!, role: role!,
                dashboardType: dashboardType || 'standard',
                showVacationWarning: showVacationWarning ?? true,
                automaticBreakDeduction: automaticBreakDeduction ?? false,
                lastModified: new Date().toISOString(),
                contractHistory: workingContractHistory,
            };
            if (password) updatedEmployee.password = password;
            onSave(updatedEmployee);

        } else { // CREATE MODE
            const contract1: ContractDetails = { ...contractBase, validFrom: firstWorkDay!, vacationDays: Number(entryYearVacationDays) };
            
            const newEmployee: Omit<Employee, 'id'> = {
                firstName: firstName!, lastName: lastName!, dateOfBirth: dateOfBirth!, username: username!, 
                password: password!, isActive: isActive!, firstWorkDay: firstWorkDay!, role: role!,
                dashboardType: dashboardType || 'standard',
                showVacationWarning: showVacationWarning ?? true,
                automaticBreakDeduction: automaticBreakDeduction ?? false,
                lastModified: new Date().toISOString(),
                contractHistory: [contract1],
                startingTimeBalanceHours: Number(startingTimeBalanceHours) || 0,
            };
            onSave(newEmployee);
        }
    }, 300);
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <div className={`fixed inset-0 bg-black flex items-center justify-center z-30 p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
        <Card className={`w-full max-w-2xl relative max-h-[90vh] flex flex-col ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={(e) => e.stopPropagation()}>
          <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
            <XIcon className="h-6 w-6" />
          </button>

          <form onSubmit={handleSubmit} className="flex flex-col flex-grow min-h-0">
            <h2 className="text-xl font-bold pr-8 my-4">{initialData ? 'Mitarbeiter bearbeiten' : 'Neuen Mitarbeiter anlegen'}</h2>
            
            <div className="space-y-6 flex-grow overflow-y-auto pr-2 pb-4 border-t pt-4">
               {/* STAMMDATEN */}
               <fieldset className="space-y-4 p-4 border rounded-lg">
                  <legend className="text-lg font-semibold px-2">Stammdaten</legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input name="firstName" label="Vorname" value={formData.firstName || ''} onChange={handleChange} required />
                      <Input name="lastName" label="Nachname" value={formData.lastName || ''} onChange={handleChange} required />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Geburtsdatum</label>
                      <div className="grid grid-cols-3 gap-2">
                          <Select label="" value={birthDay} onChange={(e) => setBirthDay(e.target.value)} required>
                              <option value="" disabled>Tag</option>
                              {birthDays.map(d => <option key={d} value={d}>{d}</option>)}
                          </Select>
                          <Select label="" value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} required>
                              <option value="" disabled>Monat</option>
                              {birthMonths.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                          </Select>
                          <Select label="" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} required>
                              <option value="" disabled>Jahr</option>
                              {birthYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </Select>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-4">
                      <Input name="street" label="Straße" value={formData.street || ''} onChange={handleChange} />
                      <Input name="houseNumber" label="Nr." value={formData.houseNumber || ''} onChange={handleChange} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr,2fr] gap-4">
                      <Input name="postalCode" label="PLZ" value={formData.postalCode || ''} onChange={handleChange} />
                      <Input name="city" label="Stadt" value={formData.city || ''} onChange={handleChange} />
                  </div>
               </fieldset>

               {/* ZUGANGSDATEN */}
               <fieldset className="space-y-4 p-4 border rounded-lg">
                  <legend className="text-lg font-semibold px-2">Zugangsdaten</legend>
                  <Input name="username" label="Benutzername" value={formData.username || ''} onChange={handleChange} required autoComplete="new-username" />
                  <Input name="password" label={initialData ? "Neues Passwort (leer lassen zum Beibehalten)" : "Passwort"} type="password" value={formData.password || ''} onChange={handleChange} required={!initialData} autoComplete="new-password" />
                  
                  <div className="flex items-center justify-between p-3 border rounded-md">
                      <label className="text-sm font-medium text-gray-700">Administrator-Rechte</label>
                      <ToggleSwitch checked={formData.role === 'admin'} onChange={(c) => handleToggleChange('isAdmin', c)} disabled={initialData?.id === 0 || initialData?.id === loggedInUser.id} />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-md">
                      <label className="text-sm font-medium text-gray-700">Account aktiv</label>
                      <ToggleSwitch checked={formData.isActive || false} onChange={(c) => handleToggleChange('isActive', c)} disabled={initialData?.id === 0} />
                  </div>
               </fieldset>

               {/* VERTRAGSDATEN */}
               <fieldset className="space-y-4 p-4 border rounded-lg">
                  <legend className="text-lg font-semibold px-2">Vertragsdaten & Arbeitszeit</legend>
                  <DateSelectorButton
                      label="Erster Arbeitstag"
                      value={formatDate(formData.firstWorkDay)}
                      onClick={() => setOpenDatePicker('firstWorkDay')}
                      placeholder="Datum auswählen..."
                  />
                  <Select name="employmentType" label="Anstellungsart" value={formData.employmentType || ''} onChange={handleChange}>
                      <option value={EmploymentType.FullTime}>Vollzeit</option>
                      <option value={EmploymentType.PartTime}>Teilzeit</option>
                      <option value={EmploymentType.MiniJob}>Minijob</option>
                  </Select>

                  {formData.employmentType !== EmploymentType.FullTime && (
                      <Select name="targetHoursModel" label="Soll-Stunden Modell" value={formData.targetHoursModel || ''} onChange={handleChange}>
                          <option value={TargetHoursModel.Monthly}>Monatliches Soll (Pauschal)</option>
                          <option value={TargetHoursModel.Weekly}>Wöchentlicher Plan (Tagesgenau)</option>
                      </Select>
                  )}

                  {formData.targetHoursModel === TargetHoursModel.Weekly && formData.employmentType !== EmploymentType.FullTime ? (
                      <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Wochenplan (Stunden pro Tag)</label>
                          <div className="grid grid-cols-7 gap-1">
                              {weekDays.map(day => (
                                  <div key={day} className="flex flex-col items-center">
                                      <span className="text-xs text-gray-500 mb-1">{weekDayLabels[day].substring(0, 2)}</span>
                                      <FlexibleTimeInputCompact
                                          value={formData.weeklySchedule?.[day]}
                                          onChange={(val) => handleWeeklyScheduleChange(day, val)}
                                          format={timeFormat}
                                      />
                                  </div>
                              ))}
                          </div>
                          <div className="text-sm text-gray-500 mt-2 text-right">
                              Monatssoll (autom. berechnet): <strong>{formData.monthlyTargetHours?.toFixed(2)}h</strong>
                          </div>
                      </div>
                  ) : (
                      <div className="grid grid-cols-2 gap-4">
                          <FlexibleTimeInput label="Soll-Stunden / Monat" value={formData.monthlyTargetHours} onChange={(val) => handleHoursMinutesChange('monthlyTargetHours', val)} format={timeFormat} />
                          <FlexibleTimeInput label="Soll-Stunden / Tag" value={formData.dailyTargetHours} onChange={(val) => handleHoursMinutesChange('dailyTargetHours', val)} format={timeFormat} />
                      </div>
                  )}
                  
                  {!initialData && (
                      <FlexibleTimeInput
                          label="Start-Stundenkonto"
                          value={formData.startingTimeBalanceHours}
                          onChange={(val) => handleHoursMinutesChange('startingTimeBalanceHours', val)}
                          format={timeFormat}
                      />
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                      <Input 
                          label={`Urlaubstage ${new Date(formData.firstWorkDay || new Date()).getFullYear()}`}
                          type="number" 
                          value={entryYearVacationDays} 
                          onChange={(e) => setEntryYearVacationDays(e.target.value)} 
                          placeholder="Tage"
                      />
                      <Input 
                          label={`Urlaubstage ${new Date(formData.firstWorkDay || new Date()).getFullYear() + 1}`}
                          type="number" 
                          value={followingYearVacationDays} 
                          onChange={(e) => setFollowingYearVacationDays(e.target.value)} 
                          placeholder="Tage"
                      />
                  </div>
               </fieldset>

               {/* EINSTELLUNGEN */}
               <fieldset className="space-y-4 p-4 border rounded-lg">
                  <legend className="text-lg font-semibold px-2">Einstellungen</legend>
                  
                  <div className="flex items-center justify-between p-3 border rounded-md">
                      <div className="mr-4">
                          <label className="text-sm font-medium text-gray-700 block">Automatische Pause</label>
                          <span className="text-xs text-gray-500">Zieht autom. Pause ab (nach 6h: 30m, nach 9h: 45m)</span>
                      </div>
                      <ToggleSwitch checked={formData.automaticBreakDeduction || false} onChange={(c) => handleToggleChange('automaticBreakDeduction', c)} />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-md">
                      <div className="mr-4">
                          <label className="text-sm font-medium text-gray-700 block">Resturlaub-Warnung</label>
                          <span className="text-xs text-gray-500">Zeigt Hinweis im Dashboard, wenn Resturlaub verfällt</span>
                      </div>
                      <ToggleSwitch checked={formData.showVacationWarning ?? true} onChange={(c) => handleToggleChange('showVacationWarning', c)} />
                  </div>

                  <div>
                      <Select name="dashboardType" label="Dashboard-Ansicht" value={formData.dashboardType || 'standard'} onChange={handleChange}>
                          <option value="standard">Standard (Stundenkonto & Urlaub)</option>
                          <option value="simplified">Vereinfacht (Nur Arbeitszeit)</option>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                          "Vereinfacht" blendet das Stundenkonto und Urlaubsdetails für den Mitarbeiter aus. Ideal für Minijobber oder Aushilfen.
                      </p>
                  </div>
               </fieldset>
            </div>

            <div className="flex justify-end items-center pt-4 border-t">
              <div className="flex gap-4">
                <Button type="button" onClick={handleClose} className="bg-gray-500 hover:bg-gray-600">Abbrechen</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Speichern</Button>
              </div>
            </div>
          </form>
        </Card>
      </div>

      {openDatePicker && (
        <CalendarModal
            isOpen={!!openDatePicker}
            onClose={() => setOpenDatePicker(null)}
            onSelectDate={handleDateSelect}
            title={openDatePicker === 'firstWorkDay' ? '1. Arbeitstag auswählen' : 'Gültigkeitsdatum auswählen'}
            initialStartDate={openDatePicker ? formData[openDatePicker] : undefined}
            selectionMode="single"
        />
      )}
    </>,
    document.body
  );
};