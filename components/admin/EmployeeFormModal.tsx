
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
import { RadioGroup } from '../ui/RadioGroup';
import { TrashIcon } from '../icons/TrashIcon';
import { ConfirmModal } from '../ui/ConfirmModal';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Omit<Employee, 'id'> | Employee) => void;
  onDelete: (id: number) => void;
  initialData: Employee | null;
  loggedInUser: Employee;
  companySettings: CompanySettings;
}

type FormData = Omit<Employee, 'id' | 'contractHistory' | 'lastModified'> & Partial<ContractDetails> & { changesValidFrom?: string };

const defaultState: Omit<Employee, 'id'> = {
  firstName: '',
  lastName: '',
  dateOfBirth: '', // Kept empty internally for type compatibility
  username: '',
  password: '',
  email: '',
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
    street: '', // Empty strings as requested to remove address
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

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({ isOpen, onClose, onSave, onDelete, initialData, loggedInUser, companySettings }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<FormData>>(() => ({
    ...defaultState,
    ...defaultContractState,
    validFrom: defaultState.firstWorkDay,
  }));
  
  // Password Mode: 'manual' or 'email'
  const [passwordMode, setPasswordMode] = useState<'manual' | 'email'>('manual');

  // Vacation days state
  const [vacationYear1, setVacationYear1] = useState('');
  const [vacationYear2, setVacationYear2] = useState('');
  
  const [openDatePicker, setOpenDatePicker] = useState<'firstWorkDay' | 'changesValidFrom' | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const timeFormat = companySettings.adminTimeFormat || 'hoursMinutes';

  // Determine the reference year for vacation display
  const vacationRefYear = useMemo(() => {
      const startYear = formData.firstWorkDay ? new Date(formData.firstWorkDay).getFullYear() : new Date().getFullYear();
      const currentYear = new Date().getFullYear();
      if (initialData && initialData.id) {
          return Math.max(startYear, currentYear);
      }
      return startYear;
  }, [formData.firstWorkDay, initialData]);

  useEffect(() => {
    if (isOpen) {
        setIsClosing(false);
        setShowDeleteConfirm(false);
        setStep(1); // Reset to step 1 (or Tab 1)
        if (initialData) {
          const changesDate = new Date();
          changesDate.setHours(0,0,0,0);
          const currentContract = getContractDetailsForDate(initialData, changesDate);
          setFormData({
            ...initialData,
            ...currentContract,
            password: '', // Clear password on edit for security
            changesValidFrom: changesDate.toLocaleDateString('sv-SE'),
          });
          
          // Determine password mode based on data (heuristic)
          if (!initialData.password && initialData.email) {
              setPasswordMode('email');
          } else {
              setPasswordMode('manual');
          }

          // Load Vacation Days
          const refYear = initialData.firstWorkDay ? Math.max(new Date(initialData.firstWorkDay).getFullYear(), new Date().getFullYear()) : new Date().getFullYear();
          
          const date1 = new Date(refYear, 6, 1);
          const contract1 = getContractDetailsForDate(initialData, date1);
          setVacationYear1(String(contract1.vacationDays));

          const date2 = new Date(refYear + 1, 6, 1);
          const contract2 = getContractDetailsForDate(initialData, date2);
          setVacationYear2(String(contract2.vacationDays));
          
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
          setPasswordMode('manual');
          setVacationYear1('');
          setVacationYear2('');
        }
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

  const validateStep1 = () => {
      if (!formData.firstName || !formData.lastName || !formData.username) {
          alert("Bitte füllen Sie alle Pflichtfelder aus (Vorname, Nachname, Benutzername).");
          return false;
      }
      if (passwordMode === 'manual' && !initialData && !formData.password) {
          alert("Bitte geben Sie ein Passwort ein.");
          return false;
      }
      if (passwordMode === 'email' && !formData.email) {
          alert("Bitte geben Sie eine E-Mail-Adresse ein.");
          return false;
      }
      return true;
  };

  const validateStep2 = () => {
      // Basic validation for step 2 if needed (mostly handled by defaults)
      return true;
  };

  const handleNext = (e?: React.MouseEvent) => {
      if (e) e.preventDefault(); // Prevent default button behavior
      if (step === 1 && !validateStep1()) return;
      if (step === 2 && !validateStep2()) return;
      setStep(prev => prev + 1);
  };

  const handleBack = () => {
      setStep(prev => prev - 1);
  };

  const handleDelete = () => {
      if (initialData?.id) {
          setShowDeleteConfirm(true);
      }
  };

  const handleConfirmDelete = () => {
      if (initialData?.id) {
          setIsClosing(true);
          setTimeout(() => {
              onDelete(initialData.id);
          }, 300);
          setShowDeleteConfirm(false);
      }
  };

  // Helper for Tabs in Edit Mode
  const TabButton = ({ tabIndex, label }: { tabIndex: number, label: string }) => (
      <button
          type="button"
          onClick={() => {
              // Basic validation before switching tabs
              if (step === 1 && !formData.firstName) {
                   // Allow switching but maybe show warning? For simplicity, we allow switching in edit mode as fields are pre-filled
              }
              setStep(tabIndex);
          }}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              step === tabIndex
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
      >
          {label}
      </button>
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields (mainly Step 1) regardless of current step/tab
    if (!formData.firstName || !formData.lastName || !formData.username) {
        alert("Bitte füllen Sie die Pflichtfelder (Vorname, Nachname, Benutzername) aus.");
        setStep(1); // Jump to first tab
        return;
    }

    // In create mode (wizard), handle 'Next' behavior for Enter key
    if (!initialData && step < 3) {
        handleNext();
        return;
    }
    
    setIsClosing(true);
    setTimeout(() => {
        const {
            firstName, lastName, dateOfBirth, username, password, email, isActive, firstWorkDay,
            street, houseNumber, postalCode, city, employmentType, monthlyTargetHours,
            dailyTargetHours, role, startingTimeBalanceHours, dashboardType,
            targetHoursModel, weeklySchedule, showVacationWarning, automaticBreakDeduction
        } = formData;

        const isWeekly = employmentType !== EmploymentType.FullTime && targetHoursModel === TargetHoursModel.Weekly;

        // Empty address strings as requested
        const finalStreet = "";
        const finalHouseNumber = "";
        const finalPostalCode = "";
        const finalCity = "";

        const contractBase: Omit<ContractDetails, 'validFrom' | 'vacationDays'> = {
            street: finalStreet, houseNumber: finalHouseNumber, postalCode: finalPostalCode, city: finalCity, 
            employmentType: employmentType!, monthlyTargetHours: Number(monthlyTargetHours),
            dailyTargetHours: Number(dailyTargetHours),
            targetHoursModel: employmentType === EmploymentType.FullTime ? TargetHoursModel.Monthly : targetHoursModel,
            weeklySchedule: isWeekly ? weeklySchedule : undefined,
        };

        if (initialData) { // EDIT MODE
            const workingContractHistory = [...initialData.contractHistory];
            const startYear = new Date(initialData.firstWorkDay).getFullYear();
            
            const updateContractForYear = (targetYear: number, vacDays: number) => {
                let targetDateStr: string;
                if (targetYear === startYear) {
                    targetDateStr = initialData.firstWorkDay; 
                } else {
                    targetDateStr = `${targetYear}-01-01`;
                }

                const existingIndex = workingContractHistory.findIndex(c => c.validFrom === targetDateStr);
                if (existingIndex !== -1) {
                    workingContractHistory[existingIndex].vacationDays = vacDays;
                } else {
                    const prevContract = getContractDetailsForDate({ ...initialData, contractHistory: workingContractHistory }, new Date(targetYear, 0, 1));
                    workingContractHistory.push({
                        ...prevContract,
                        validFrom: targetDateStr,
                        vacationDays: vacDays
                    });
                }
            };

            if (vacationYear1) updateContractForYear(vacationRefYear, Number(vacationYear1));
            if (vacationYear2) updateContractForYear(vacationRefYear + 1, Number(vacationYear2));
            
            if (firstWorkDay && firstWorkDay !== initialData.firstWorkDay) {
                const oldStartIndex = workingContractHistory.findIndex(c => c.validFrom === initialData.firstWorkDay);
                if (oldStartIndex !== -1) {
                    workingContractHistory[oldStartIndex].validFrom = firstWorkDay;
                }
            }

             const updatedEmployee: Employee = {
                ...initialData,
                firstName: firstName!, lastName: lastName!, username: username!, email: email || undefined,
                isActive: isActive!, firstWorkDay: firstWorkDay!, role: role!,
                dashboardType: dashboardType || 'standard',
                showVacationWarning: showVacationWarning ?? true,
                automaticBreakDeduction: automaticBreakDeduction ?? false,
                lastModified: new Date().toISOString(),
                contractHistory: workingContractHistory,
                dateOfBirth: '', // Empty as requested
            };
            if (password && passwordMode === 'manual') updatedEmployee.password = password;
            // In a real app, if passwordMode === 'email', trigger invite email here
            
            onSave(updatedEmployee);

        } else { // CREATE MODE
            const contract1: ContractDetails = { ...contractBase, validFrom: firstWorkDay!, vacationDays: Number(vacationYear1) || 30 };
            
            const newEmployee: Omit<Employee, 'id'> = {
                firstName: firstName!, lastName: lastName!, username: username!, email: email || undefined,
                password: passwordMode === 'manual' ? password! : 'invite-pending', // Placeholder for invite
                isActive: isActive!, firstWorkDay: firstWorkDay!, role: role!,
                dashboardType: dashboardType || 'standard',
                showVacationWarning: showVacationWarning ?? true,
                automaticBreakDeduction: automaticBreakDeduction ?? false,
                lastModified: new Date().toISOString(),
                contractHistory: [contract1],
                startingTimeBalanceHours: Number(startingTimeBalanceHours) || 0,
                dateOfBirth: '', // Empty as requested
            };
            if (vacationYear2) {
                const year2Date = `${new Date(firstWorkDay!).getFullYear() + 1}-01-01`;
                newEmployee.contractHistory.push({
                    ...contract1,
                    validFrom: year2Date,
                    vacationDays: Number(vacationYear2)
                });
            }
            
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
            {initialData ? (
                <div className="mt-2 mb-4">
                    <h2 className="text-xl font-bold mb-4">Mitarbeiter bearbeiten</h2>
                    <div className="flex border-b border-gray-200">
                        <TabButton tabIndex={1} label="Persönlich & Zugang" />
                        <TabButton tabIndex={2} label="Vertrag & Zeit" />
                        <TabButton tabIndex={3} label="Einstellungen" />
                    </div>
                </div>
            ) : (
                <h2 className="text-xl font-bold pr-8 my-4">
                    Neuen Mitarbeiter anlegen
                    <span className="text-sm font-normal text-gray-500 ml-2">
                        (Schritt {step} von 3)
                    </span>
                </h2>
            )}
            
            <div className="space-y-6 flex-grow overflow-y-auto pr-2 pb-4 border-t pt-4">
               {/* SCHRITT 1: STAMMDATEN & ZUGANG */}
               {step === 1 && (
                   <div className="space-y-4 animate-fade-in">
                       <fieldset className="space-y-4 p-4 border rounded-lg">
                          <legend className="text-lg font-semibold px-2">Persönliche Daten</legend>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Input name="firstName" label="Vorname" value={formData.firstName || ''} onChange={handleChange} required />
                              <Input name="lastName" label="Nachname" value={formData.lastName || ''} onChange={handleChange} required />
                          </div>
                       </fieldset>

                       <fieldset className="space-y-4 p-4 border rounded-lg">
                          <legend className="text-lg font-semibold px-2">Zugangsdaten</legend>
                          <Input name="username" label="Benutzername" value={formData.username || ''} onChange={handleChange} required autoComplete="new-username" />
                          
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Passwort-Optionen</label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                                  <label className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${passwordMode === 'manual' ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'hover:bg-gray-50'}`}>
                                      <input type="radio" name="passwordMode" className="h-4 w-4 text-blue-600" checked={passwordMode === 'manual'} onChange={() => setPasswordMode('manual')} />
                                      <span className="ml-2 text-sm">Manuell festlegen</span>
                                  </label>
                                  <label className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${passwordMode === 'email' ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'hover:bg-gray-50'}`}>
                                      <input type="radio" name="passwordMode" className="h-4 w-4 text-blue-600" checked={passwordMode === 'email'} onChange={() => setPasswordMode('email')} />
                                      <span className="ml-2 text-sm">Einladung per E-Mail</span>
                                  </label>
                              </div>

                              {passwordMode === 'manual' && (
                                  <Input 
                                    name="password" 
                                    label={initialData ? "Neues Passwort (leer lassen zum Beibehalten)" : "Passwort"} 
                                    type="password" 
                                    value={formData.password || ''} 
                                    onChange={handleChange} 
                                    required={!initialData} 
                                    autoComplete="new-password" 
                                  />
                              )}
                              
                              {passwordMode === 'email' && (
                                  <div className="space-y-2">
                                      <Input 
                                        name="email" 
                                        label="E-Mail-Adresse" 
                                        type="email" 
                                        value={formData.email || ''} 
                                        onChange={handleChange} 
                                        required 
                                        placeholder="mitarbeiter@firma.de"
                                      />
                                      <p className="text-xs text-gray-500">
                                          Der Mitarbeiter erhält eine E-Mail mit einem Link zum Setzen des Passworts.
                                      </p>
                                  </div>
                              )}
                          </div>
                       </fieldset>
                   </div>
               )}

               {/* SCHRITT 2: VERTRAGSDATEN */}
               {step === 2 && (
                   <div className="space-y-4 animate-fade-in">
                       <fieldset className="space-y-4 p-4 border rounded-lg">
                          <legend className="text-lg font-semibold px-2">Vertragsdaten & Arbeitszeit</legend>
                          <DateSelectorButton
                              label="Erster Arbeitstag"
                              value={formatDate(formData.firstWorkDay)}
                              onClick={() => setOpenDatePicker('firstWorkDay')}
                              placeholder="Auswählen..."
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
                                  label={`Urlaubstage ${vacationRefYear}`}
                                  type="number" 
                                  value={vacationYear1} 
                                  onChange={(e) => setVacationYear1(e.target.value)} 
                                  placeholder="Tage"
                              />
                              <Input 
                                  label={`Urlaubstage ${vacationRefYear + 1}`}
                                  type="number" 
                                  value={vacationYear2} 
                                  onChange={(e) => setVacationYear2(e.target.value)} 
                                  placeholder="Tage"
                              />
                          </div>
                       </fieldset>
                   </div>
               )}

               {/* SCHRITT 3: EINSTELLUNGEN & BERECHTIGUNGEN */}
               {step === 3 && (
                   <div className="space-y-4 animate-fade-in">
                       {/* EINSTELLUNGEN (Moved Top) */}
                       <fieldset className="space-y-4 p-4 border rounded-lg">
                          <legend className="text-lg font-semibold px-2">Einstellungen</legend>

                          <div>
                              <Select name="dashboardType" label="Dashboard-Ansicht" value={formData.dashboardType || 'standard'} onChange={handleChange}>
                                  <option value="standard">Standard (Stundenkonto & Urlaub)</option>
                                  <option value="simplified">Vereinfacht (Nur Arbeitszeit)</option>
                              </Select>
                              <p className="text-xs text-gray-500 mt-1">
                                  "Vereinfacht" blendet das Stundenkonto und Urlaubsdetails für den Mitarbeiter aus. Ideal für Minijobber oder Aushilfen.
                              </p>
                          </div>
                          
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
                       </fieldset>

                       {/* BERECHTIGUNGEN & STATUS (Moved Bottom) */}
                       <fieldset className="space-y-4 p-4 border rounded-lg">
                          <legend className="text-lg font-semibold px-2">Berechtigungen & Status</legend>
                          
                          <div className="flex items-center justify-between p-3 border rounded-md">
                              <div className="mr-4">
                                <label className="text-sm font-medium text-gray-700">Administrator-Rechte</label>
                                <p className="text-xs text-gray-500">Zugriff auf alle Einstellungen und Mitarbeiterdaten</p>
                              </div>
                              <ToggleSwitch checked={formData.role === 'admin'} onChange={(c) => handleToggleChange('isAdmin', c)} disabled={initialData?.id === 0 || initialData?.id === loggedInUser.id} />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-md">
                              <label className="text-sm font-medium text-gray-700">Account aktiv</label>
                              <ToggleSwitch checked={formData.isActive || false} onChange={(c) => handleToggleChange('isActive', c)} disabled={initialData?.id === 0} />
                          </div>
                       </fieldset>
                   </div>
               )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div>
                  {initialData && (initialData.id !== 0 && initialData.id !== loggedInUser.id) && (
                      <Button type="button" onClick={handleDelete} className="bg-red-600 hover:bg-red-700 flex items-center gap-2">
                          <TrashIcon className="h-5 w-5" />
                          <span className="hidden sm:inline">Löschen</span>
                      </Button>
                  )}
              </div>
              
              {initialData ? (
                  // EDIT MODE: Single Save Button
                  <div className="flex gap-4">
                      <Button type="button" onClick={handleClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800">Abbrechen</Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Speichern</Button>
                  </div>
              ) : (
                  // CREATE MODE: Wizard Buttons
                  <div className="flex gap-4">
                    <Button type="button" onClick={handleClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800">Abbrechen</Button>
                    {step > 1 && (
                        <Button type="button" onClick={handleBack} className="bg-gray-500 hover:bg-gray-600">Zurück</Button>
                    )}
                    {step < 3 ? (
                        <Button type="button" onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">Weiter</Button>
                    ) : (
                        <Button type="submit" className="bg-green-600 hover:bg-green-700">Speichern</Button>
                    )}
                  </div>
              )}
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
      
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Mitarbeiter löschen"
        message={`Möchten Sie den Mitarbeiter ${initialData?.firstName} ${initialData?.lastName} wirklich endgültig löschen?`}
        confirmText="Ja, löschen"
      />
    </>,
    document.body
  );
};
