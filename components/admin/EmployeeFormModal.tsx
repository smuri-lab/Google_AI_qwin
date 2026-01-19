import React, { useState, useEffect } from 'react';
import type { Employee, ContractDetails, WeeklySchedule, CompanySettings } from '../../types';
import { EmploymentType, TargetHoursModel } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { XIcon } from '../icons/XIcon';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { getContractDetailsForDate } from '../utils';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
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
  lastModified: '', // Will be set on save
  contractHistory: [], // Will be set on save
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
  const [entryYearVacationDays, setEntryYearVacationDays] = useState('');
  const [followingYearVacationDays, setFollowingYearVacationDays] = useState('');
  const [futureVacationDays, setFutureVacationDays] = useState<{year: number; days: string}[]>([]);
  const [openDatePicker, setOpenDatePicker] = useState<'firstWorkDay' | 'dateOfBirth' | 'changesValidFrom' | null>(null);
  const timeFormat = companySettings.adminTimeFormat || 'hoursMinutes';

  useEffect(() => {
    if (initialData) {
      const changesDate = new Date();
      changesDate.setHours(0,0,0,0);
      const currentContract = getContractDetailsForDate(initialData, changesDate);
      setFormData({
        ...initialData,
        ...currentContract,
        password: '', // Clear password field on edit
        changesValidFrom: changesDate.toLocaleDateString('sv-SE'),
      });

      const entryYear = new Date(initialData.firstWorkDay).getFullYear();
      const entryContract = getContractDetailsForDate(initialData, new Date(initialData.firstWorkDay));
      setEntryYearVacationDays(String(entryContract.vacationDays));
      const followingYearContract = getContractDetailsForDate(initialData, new Date(entryYear + 1, 0, 1));
      setFollowingYearVacationDays(String(followingYearContract.vacationDays));
      
      const changesYear = new Date(changesDate).getFullYear();
      const futureContracts = initialData.contractHistory
          .filter(c => new Date(c.validFrom).getFullYear() > changesYear && c.validFrom.endsWith('-01-01'))
          .sort((a, b) => new Date(a.validFrom).getTime() - new Date(b.validFrom).getTime());

      const futureData = futureContracts.map(c => ({
          year: new Date(c.validFrom).getFullYear(),
          days: String(c.vacationDays)
      }));
      setFutureVacationDays([{ year: changesYear, days: String(currentContract.vacationDays) }, ...futureData]);
      
    } else {
      const newFirstWorkDay = new Date().toLocaleDateString('sv-SE');
      setFormData({
        ...defaultState,
        ...defaultContractState,
        vacationDays: undefined, // Clear for placeholder
        firstWorkDay: newFirstWorkDay,
        validFrom: newFirstWorkDay,
        weeklySchedule: defaultWeeklySchedule,
      });
      setEntryYearVacationDays('');
      setFollowingYearVacationDays('');
      setFutureVacationDays([]);
    }
  }, [initialData, isOpen]);

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
    const newSchedule = { ...formData.weeklySchedule, [day]: hours };
    
    const weeklySum = Object.values(newSchedule).reduce((sum, h) => sum + Number(h || 0), 0);
    const workingDays = Object.values(newSchedule).filter(h => Number(h || 0) > 0).length;
    const monthlyTarget = (weeklySum * 52) / 12;
    const dailyTarget = workingDays > 0 ? weeklySum / workingDays : 0;
    
    setFormData(prev => ({
        ...prev,
        weeklySchedule: newSchedule,
        monthlyTargetHours: parseFloat(monthlyTarget.toFixed(2)),
        dailyTargetHours: parseFloat(dailyTarget.toFixed(2))
    }));
  };
  
  const handleToggleChange = (name: 'isAdmin', checked: boolean) => {
      if (name === 'isAdmin') {
          setFormData(prev => ({ ...prev, role: checked ? 'admin' : 'employee' }));
      }
  };
  
  const handleAddFutureYear = () => {
      setFutureVacationDays(prev => {
          let lastYear: number;
          if (prev.length > 0) {
              lastYear = prev[prev.length - 1].year;
          } else {
              const baseYear = initialData 
                  ? new Date(formData.changesValidFrom!).getFullYear()
                  : new Date(formData.firstWorkDay!).getFullYear() + 1;
              lastYear = baseYear;
          }
          const nextYear = lastYear + 1;
          
          if (prev.some(p => p.year === nextYear)) return prev;
          return [...prev, { year: nextYear, days: '' }];
      });
  };

  const handleFutureDayChange = (index: number, days: string) => {
      const newFutureDays = [...futureVacationDays];
      newFutureDays[index].days = days;
      setFutureVacationDays(newFutureDays);
  };
  
  const handleRemoveFutureYear = (index: number) => {
      setFutureVacationDays(prev => prev.filter((_, i) => i !== index));
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const {
        firstName, lastName, dateOfBirth, username, password, isActive, firstWorkDay,
        street, houseNumber, postalCode, city, employmentType, monthlyTargetHours,
        dailyTargetHours, vacationDays, changesValidFrom, role, startingTimeBalanceHours, dashboardType,
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
        const workingContractHistory = JSON.parse(JSON.stringify(initialData.contractHistory));
        const entryYear = new Date(initialData.firstWorkDay).getFullYear();
        
        const firstContractIndex = workingContractHistory.findIndex((c: ContractDetails) => c.validFrom === initialData.firstWorkDay);
        if (firstContractIndex !== -1) {
            workingContractHistory[firstContractIndex].vacationDays = Number(entryYearVacationDays);
        }

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
        
        if (firstWorkDay && firstWorkDay !== initialData.firstWorkDay && workingContractHistory.length > 0) {
            if (firstContractIndex !== -1) {
                workingContractHistory[firstContractIndex].validFrom = firstWorkDay;
            }
        }

        const currentFutureData = [...futureVacationDays];
        const changesYear = new Date(changesValidFrom!).getFullYear();
        if (changesYear === entryYear && currentFutureData[0]) {
            currentFutureData[0].days = entryYearVacationDays;
        }
        if (changesYear === entryYear + 1 && currentFutureData[0]) {
            currentFutureData[0].days = followingYearVacationDays;
        }

        const [currentPeriodData, ...actualFutureData] = currentFutureData;
        const newContractVersion: ContractDetails = {
            ...contractBase,
            validFrom: changesValidFrom!,
            vacationDays: Number(currentPeriodData.days)
        };
        
        const relevantHistory = workingContractHistory.filter((c: ContractDetails) => new Date(c.validFrom) < new Date(changesValidFrom!));
        const futureContracts = actualFutureData
            .filter(f => f.days && Number(f.days) >= 0)
            .map(future => ({ ...newContractVersion, validFrom: `${future.year}-01-01`, vacationDays: Number(future.days) }));
        
        const contractMap = new Map<string, ContractDetails>();
        [...relevantHistory, newContractVersion, ...futureContracts].forEach(c => contractMap.set(c.validFrom, c));
        const finalHistory = Array.from(contractMap.values()).sort((a, b) => new Date(a.validFrom).getTime() - new Date(b.validFrom).getTime());

        const updatedEmployee: Employee = {
            ...initialData,
            firstName: firstName!, lastName: lastName!, dateOfBirth: dateOfBirth!, username: username!, 
            isActive: isActive!, firstWorkDay: firstWorkDay!, role: role!,
            dashboardType: dashboardType || 'standard',
            showVacationWarning: showVacationWarning ?? true,
            automaticBreakDeduction: automaticBreakDeduction ?? false,
            lastModified: new Date().toISOString(),
            contractHistory: finalHistory,
        };
        if (password) updatedEmployee.password = password;
        onSave(updatedEmployee);

    } else { // CREATE MODE
        const entryYear = new Date(firstWorkDay!).getFullYear();
        const contract1: ContractDetails = { ...contractBase, validFrom: firstWorkDay!, vacationDays: Number(entryYearVacationDays) };
        const contract2: ContractDetails = { ...contractBase, validFrom: `${entryYear + 1}-01-01`, vacationDays: Number(followingYearVacationDays) };
        const futureContracts = futureVacationDays
            .filter(f => f.days && Number(f.days) >= 0)
            .map(future => ({ ...contractBase, validFrom: `${future.year}-01-01`, vacationDays: Number(future.days) }));
        
        const newEmployee: Omit<Employee, 'id'> = {
            firstName: firstName!, lastName: lastName!, dateOfBirth: dateOfBirth!, username: username!, 
            password: password!, isActive: isActive!, firstWorkDay: firstWorkDay!, role: role!,
            dashboardType: dashboardType || 'standard',
            showVacationWarning: showVacationWarning ?? true,
            automaticBreakDeduction: automaticBreakDeduction ?? false,
            lastModified: new Date().toISOString(),
            contractHistory: [contract1, contract2, ...futureContracts],
            startingTimeBalanceHours: Number(startingTimeBalanceHours) || 0,
        };
        onSave(newEmployee);
    }
  };

  if (!isOpen) return null;

  const isEditingSuperAdmin = initialData?.id === 0;
  const isSuperAdminLoggedIn = loggedInUser.id === 0;
  const entryYear = formData.firstWorkDay ? new Date(formData.firstWorkDay).getFullYear() : null;
  const changesYear = formData.changesValidFrom ? new Date(formData.changesValidFrom).getFullYear() : null;
  const isPartTimeOrMinijob = formData.employmentType === EmploymentType.PartTime || formData.employmentType === EmploymentType.MiniJob;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-30 p-4">
        <Card className="w-full max-w-2xl relative max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
            <XIcon className="h-6 w-6" />
          </button>

          <form onSubmit={handleSubmit} className="flex flex-col flex-grow min-h-0">
            <h2 className="text-xl font-bold pr-8 my-4">{initialData ? 'Mitarbeiter bearbeiten' : 'Neuen Mitarbeiter anlegen'}</h2>
            
            <div className="space-y-4 flex-grow overflow-y-auto pr-2 pb-4 border-t pt-4">
              <fieldset className="space-y-4 p-4 border rounded-lg">
                  <legend className="text-lg font-semibold px-2">Stammdaten</legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input name="firstName" label="Vorname" value={formData.firstName || ''} onChange={handleChange} required />
                      <Input name="lastName" label="Nachname" value={formData.lastName || ''} onChange={handleChange} required />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-4">
                      <Input name="street" label="Straße" value={formData.street || ''} onChange={handleChange} required />
                      <Input name="houseNumber" label="Nr." value={formData.houseNumber || ''} onChange={handleChange} required />
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-[1fr,2fr] gap-4">
                      <Input name="postalCode" label="PLZ" value={formData.postalCode || ''} onChange={handleChange} required />
                      <Input name="city" label="Stadt" value={formData.city || ''} onChange={handleChange} required />
                  </div>
                  <DateSelectorButton
                      label="Geburtsdatum"
                      value={formatDate(formData.dateOfBirth)}
                      onClick={() => setOpenDatePicker('dateOfBirth')}
                      placeholder="Datum auswählen..."
                  />
                  <DateSelectorButton
                      label="1. Arbeitstag"
                      value={formatDate(formData.firstWorkDay)}
                      onClick={() => setOpenDatePicker('firstWorkDay')}
                      placeholder="Datum auswählen..."
                  />
              </fieldset>
              
              <fieldset className="space-y-4 p-4 border rounded-lg">
                  <legend className="text-lg font-semibold px-2">Vertragsdetails</legend>
                  {initialData && (
                    <DateSelectorButton
                        label="Änderungen gültig ab"
                        value={formatDate(formData.changesValidFrom)}
                        onClick={() => setOpenDatePicker('changesValidFrom')}
                        placeholder="Datum auswählen..."
                    />
                  )}
                  
                  <Select name="employmentType" label="Anstellungsart" value={formData.employmentType || ''} onChange={handleChange} required>
                      <option value={EmploymentType.FullTime}>Vollzeit</option>
                      <option value={EmploymentType.PartTime}>Teilzeit</option>
                      <option value={EmploymentType.MiniJob}>Minijob</option>
                  </Select>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input label="Urlaub Eintrittsjahr" type="number" value={entryYearVacationDays} onChange={(e) => setEntryYearVacationDays(e.target.value)} required placeholder={String(entryYear ?? '...')} />
                      <Input label="Anspruch Folgejahr" type="number" value={followingYearVacationDays} onChange={(e) => setFollowingYearVacationDays(e.target.value)} required placeholder={String(entryYear ? entryYear + 1 : '...')} />
                  </div>

                  <Select name="dashboardType" label="Stundenkonto" value={formData.dashboardType || 'standard'} onChange={handleChange}>
                      <option value="standard">Ja</option>
                      <option value="simplified">Nein</option>
                  </Select>

                  {isPartTimeOrMinijob && formData.dashboardType !== 'simplified' && (
                      <FlexibleTimeInput
                          label="Soll/Monat"
                          value={formData.monthlyTargetHours}
                          onChange={(value) => handleHoursMinutesChange('monthlyTargetHours', value)}
                          format={timeFormat}
                      />
                  )}

                  {!initialData && formData.dashboardType !== 'simplified' && (
                    <FlexibleTimeInput
                        label="Startguthaben Stundenkonto"
                        value={formData.startingTimeBalanceHours}
                        onChange={(value) => handleHoursMinutesChange('startingTimeBalanceHours', value)}
                        format={timeFormat}
                    />
                  )}
                   
                  {isPartTimeOrMinijob && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Berechnungsmodell für Soll-Stunden</label>
                        <div className="space-y-2">
                          <div className="p-3 border rounded-md has-[:checked]:bg-blue-50 has-[:checked]:border-blue-300 transition-colors">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="targetHoursModel"
                                value={TargetHoursModel.Monthly}
                                checked={formData.targetHoursModel === TargetHoursModel.Monthly}
                                onChange={(e) => setFormData(prev => ({...prev, targetHoursModel: e.target.value as TargetHoursModel}))}
                                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              />
                              <span className="ml-3 text-sm text-gray-700">Flexibel (Monatsstunden)</span>
                            </label>
                            {formData.targetHoursModel === TargetHoursModel.Monthly && (
                              <div className="mt-4 pl-7">
                                <FlexibleTimeInput
                                    label="Soll/Tag"
                                    value={formData.dailyTargetHours}
                                    onChange={(value) => handleHoursMinutesChange('dailyTargetHours', value)}
                                    format={timeFormat}
                                />
                              </div>
                            )}
                          </div>
                  
                          <div className="p-3 border rounded-md has-[:checked]:bg-blue-50 has-[:checked]:border-blue-300 transition-colors">
                             <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="targetHoursModel"
                                value={TargetHoursModel.Weekly}
                                checked={formData.targetHoursModel === TargetHoursModel.Weekly}
                                onChange={(e) => setFormData(prev => ({...prev, targetHoursModel: e.target.value as TargetHoursModel}))}
                                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              />
                              <span className="ml-3 text-sm text-gray-700">Fester Wochenplan</span>
                            </label>
                            {formData.targetHoursModel === TargetHoursModel.Weekly && (
                              <div className="mt-4 pl-7">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Wochenplan (Soll-Stunden pro Tag)</label>
                                    <div className="space-y-3 rounded-lg border p-4">
                                        {weekDays.map(day => (
                                            <div key={day} className="flex items-center justify-between">
                                                <label className="font-medium text-sm text-gray-700">{weekDayLabels[day]}</label>
                                                <div className="w-32">
                                                    <FlexibleTimeInputCompact
                                                        value={formData.weeklySchedule?.[day]} 
                                                        onChange={(value) => handleWeeklyScheduleChange(day, value)} 
                                                        format={timeFormat}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                  )}
                  
                  {!isPartTimeOrMinijob && (
                      formData.dashboardType !== 'simplified' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FlexibleTimeInput
                                label="Soll/Monat"
                                value={formData.monthlyTargetHours}
                                onChange={(value) => handleHoursMinutesChange('monthlyTargetHours', value)}
                                format={timeFormat}
                            />
                            <FlexibleTimeInput
                                label="Soll/Tag"
                                value={formData.dailyTargetHours}
                                onChange={(value) => handleHoursMinutesChange('dailyTargetHours', value)}
                                format={timeFormat}
                            />
                          </div>
                      ) : (
                        <FlexibleTimeInput
                            label="Soll/Tag"
                            value={formData.dailyTargetHours}
                            onChange={(value) => handleHoursMinutesChange('dailyTargetHours', value)}
                            format={timeFormat}
                        />
                      )
                  )}

              </fieldset>

              <fieldset className="space-y-4 p-4 border rounded-lg">
                  <legend className="text-lg font-semibold px-2">Zukünftiger Urlaubsanspruch</legend>
                  <p className="text-sm text-gray-500 px-2 -mt-2">Legen Sie hier abweichende Ansprüche für die Zukunft fest. Der letzte Eintrag gilt für alle Folgejahre, bis ein neuer definiert wird.</p>
                  
                  {futureVacationDays.map((item, index) => {
                      const isFirstEditableRow = initialData && index === 0;
                      return (
                          <div key={index} className="grid grid-cols-[1fr,1fr,auto] gap-2 items-end">
                              <Input label={index === 0 ? "Jahr" : ""} value={isFirstEditableRow ? changesYear : item.year} readOnly disabled />
                              <Input label={index === 0 ? (isFirstEditableRow ? `Anspruch ab ${changesYear}` : "Urlaubstage") : ""} type="number" value={item.days} onChange={(e) => handleFutureDayChange(index, e.target.value)} required />
                              <Button type="button" onClick={() => handleRemoveFutureYear(index)} className="bg-red-500 hover:bg-red-600 p-2 h-10 w-10 flex items-center justify-center disabled:bg-red-300 disabled:cursor-not-allowed" aria-label="Jahr entfernen" disabled={isFirstEditableRow} >
                                  <TrashIcon className="h-5 w-5" />
                              </Button>
                          </div>
                      );
                  })}
                  <Button type="button" onClick={handleAddFutureYear} className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300 flex items-center justify-center gap-2">
                      <PlusIcon className="h-5 w-5" /> Weiteres Jahr hinzufügen
                  </Button>
              </fieldset>

              <fieldset className="space-y-4 p-4 border rounded-lg">
                  <legend className="text-lg font-semibold px-2">Account & Ansicht</legend>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input name="username" label="Benutzername" type="text" value={formData.username || ''} onChange={handleChange} required />
                      <Input name="password" label="Passwort" type="password" placeholder={initialData ? "Leer lassen, um nicht zu ändern" : "Mind. 6 Zeichen"} value={formData.password || ''} onChange={handleChange} required={!initialData} />
                  </div>
                  {isSuperAdminLoggedIn && (
                    <div className="flex items-center justify-between pt-2">
                        <label className="text-sm font-medium text-gray-700">Admin-Rechte</label>
                        <ToggleSwitch checked={formData.role === 'admin'} onChange={(checked) => handleToggleChange('isAdmin', checked)} disabled={isEditingSuperAdmin} />
                    </div>
                  )}
                   <div className="flex items-center justify-between pt-2">
                        <label className="text-sm font-medium text-gray-700">Warnung für Resturlaub anzeigen</label>
                        <ToggleSwitch checked={formData.showVacationWarning ?? true} onChange={(checked) => setFormData(prev => ({...prev, showVacationWarning: checked}))} />
                    </div>
                     <div className="flex items-center justify-between pt-2">
                        <label className="text-sm font-medium text-gray-700">Gesetzliche Pausen automatisch abziehen</label>
                        <ToggleSwitch checked={formData.automaticBreakDeduction ?? false} onChange={(checked) => setFormData(prev => ({...prev, automaticBreakDeduction: checked}))} />
                    </div>
              </fieldset>
            </div>

            <div className="flex justify-end items-center pt-4 border-t">
              <div className="flex gap-4">
                <Button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600">Abbrechen</Button>
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
            title={
                openDatePicker === 'firstWorkDay' ? '1. Arbeitstag auswählen' :
                openDatePicker === 'dateOfBirth' ? 'Geburtsdatum auswählen' :
                'Gültigkeitsdatum auswählen'
            }
            initialStartDate={openDatePicker ? formData[openDatePicker] : undefined}
            selectionMode="single"
        />
      )}
    </>
  );
};