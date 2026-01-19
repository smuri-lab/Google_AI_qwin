import React, { useState, useEffect } from 'react';
import type { CompanySettings } from '../../types';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { RadioGroup } from '../ui/RadioGroup';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface SettingsViewProps {
  selectedState: string;
  onStateChange: (state: string) => void;
  timeTrackingMethod: 'all' | 'manual';
  onTimeTrackingMethodChange: (method: 'all' | 'manual') => void;
  companySettings: CompanySettings;
  onUpdateCompanySettings: (settings: CompanySettings) => void;
}

const germanStates = [
    { code: 'BW', name: 'Baden-Württemberg' },
    { code: 'BY', name: 'Bayern' },
    { code: 'BE', name: 'Berlin' },
    { code: 'BB', name: 'Brandenburg' },
    { code: 'HB', name: 'Bremen' },
    { code: 'HH', name: 'Hamburg' },
    { code: 'HE', name: 'Hessen' },
    { code: 'MV', name: 'Mecklenburg-Vorpommern' },
    { code: 'NI', name: 'Niedersachsen' },
    { code: 'NW', name: 'Nordrhein-Westfalen' },
    { code: 'RP', name: 'Rheinland-Pfalz' },
    { code: 'SL', name: 'Saarland' },
    { code: 'SN', name: 'Sachsen' },
    { code: 'ST', name: 'Sachsen-Anhalt' },
    { code: 'SH', name: 'Schleswig-Holstein' },
    { code: 'TH', name: 'Thüringen' },
];

const timeTrackingOptions = [
    { value: 'all', label: 'Stempeluhr & Manuelle Eingabe' },
    { value: 'manual', label: 'Nur Manuelle Eingabe' },
];

const editabilityOptions = [
    { value: 'unlimited', label: 'Keine Sperrfrist (immer bearbeitbar)' },
    { value: 'currentMonth', label: 'Bearbeitbar im laufenden Monat' },
    { value: 'previousWeek', label: 'Bearbeitbar in aktueller & letzter Woche' },
    { value: 'sameDay', label: 'Bearbeitbar nur am selben Tag' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
    selectedState,
    onStateChange,
    timeTrackingMethod,
    onTimeTrackingMethodChange,
    companySettings,
    onUpdateCompanySettings,
}) => {
    const [localSelectedState, setLocalSelectedState] = useState(selectedState);
    const [localTimeTrackingMethod, setLocalTimeTrackingMethod] = useState(timeTrackingMethod);
    const [localSettings, setLocalSettings] = useState(companySettings);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'timeTracking' | 'employeeOptions'>('general');

    useEffect(() => {
        setLocalSelectedState(selectedState);
        setLocalTimeTrackingMethod(timeTrackingMethod);
        setLocalSettings(companySettings);
    }, [selectedState, timeTrackingMethod, companySettings]);

    const handleLockRuleChange = (value: string) => {
        setLocalSettings(prev => ({ ...prev, editLockRule: value as CompanySettings['editLockRule'] }));
    };

    const handleExportToggle = (checked: boolean) => {
        setLocalSettings(prev => ({ ...prev, employeeCanExport: checked }));
    };
    
    const handleLabelInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({...prev, [name]: value}));
    };
    
    const handleTimeFormatChange = (key: 'adminTimeFormat' | 'employeeTimeFormat', value: string) => {
        setLocalSettings(prev => ({ ...prev, [key]: value as 'decimal' | 'hoursMinutes' }));
    };

    const handleAllowHalfDayVacationsToggle = (checked: boolean) => {
        setLocalSettings(prev => ({ ...prev, allowHalfDayVacations: checked }));
    };

    const handleSave = () => {
        onStateChange(localSelectedState);
        onTimeTrackingMethodChange(localTimeTrackingMethod);
        onUpdateCompanySettings({
            ...localSettings,
            customerLabel: localSettings.customerLabel || 'Zeitkategorie 1',
            activityLabel: localSettings.activityLabel || 'Zeitkategorie 2',
        });
        setSuccessMessage('Änderungen erfolgreich gespeichert!');
        window.scrollTo(0, 0);
        setTimeout(() => setSuccessMessage(null), 3000);
    };
    
    const tabs = [
        { id: 'general', label: 'Allgemein' },
        { id: 'timeTracking', label: 'Zeiterfassung' },
        { id: 'employeeOptions', label: 'Mitarbeiter-Optionen' },
    ];

    return (
        <Card>
            <h2 className="text-xl font-bold mb-6">Einstellungen</h2>
            
            {successMessage && (
                <div className="mb-6 p-3 bg-green-100 text-green-800 border border-green-200 rounded-lg animate-fade-in" role="alert">
                    {successMessage}
                </div>
            )}
            
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`${
                                activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base`}
                            aria-current={activeTab === tab.id ? 'page' : undefined}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="pt-8">
                {activeTab === 'general' && (
                    <div className="space-y-8 animate-fade-in">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">Bundesland für Feiertage</h3>
                            <p className="text-sm text-gray-500 mb-4">Wählen Sie Ihr Bundesland, um die gesetzlichen Feiertage korrekt zu berechnen.</p>
                            <Select
                                value={localSelectedState}
                                onChange={(e) => setLocalSelectedState(e.target.value)}
                                aria-label="Bundesland für Feiertage"
                            >
                                {germanStates.map(state => (
                                    <option key={state.code} value={state.code}>{state.name}</option>
                                ))}
                            </Select>
                        </div>
                        
                        <div className="pt-8 border-t">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">Zeitformat für Anzeige & Eingabe</h3>
                            <p className="text-sm text-gray-500 mb-4">Legen Sie fest, ob Zeitdauern in Dezimalstunden (z.B. 8,50h) oder in Stunden und Minuten (z.B. 8h 30min) angezeigt werden.</p>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">Admin-Ansicht</h4>
                                    <RadioGroup
                                        name="adminTimeFormat"
                                        options={[
                                            { value: 'hoursMinutes', label: 'Stunden & Minuten (z.B. 8h 30min)' },
                                            { value: 'decimal', label: 'Dezimalstunden (z.B. 8,50h)' },
                                        ]}
                                        selectedValue={localSettings.adminTimeFormat || 'hoursMinutes'}
                                        onChange={(value) => handleTimeFormatChange('adminTimeFormat', value)}
                                    />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">Mitarbeiter-Ansicht</h4>
                                     <RadioGroup
                                        name="employeeTimeFormat"
                                        options={[
                                            { value: 'hoursMinutes', label: 'Stunden & Minuten (z.B. 8h 30min)' },
                                            { value: 'decimal', label: 'Dezimalstunden (z.B. 8,50h)' },
                                        ]}
                                        selectedValue={localSettings.employeeTimeFormat || 'hoursMinutes'}
                                        onChange={(value) => handleTimeFormatChange('employeeTimeFormat', value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'timeTracking' && (
                    <div className="space-y-8 animate-fade-in">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">Zeitkategorien</h3>
                            <p className="text-sm text-gray-500 mb-4">Benennen Sie die Zeitkategorien, um sie an die Terminologie Ihres Unternehmens anzupassen (z.B. 'Kunde' in 'Projekt' ändern).</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <Input name="customerLabel" label="Bezeichnung für Zeitkategorie 1" value={localSettings.customerLabel || ''} onChange={handleLabelInputChange} placeholder="z.B. Kunde, Projekt..." />
                                 <Input name="activityLabel" label="Bezeichnung für Zeitkategorie 2" value={localSettings.activityLabel || ''} onChange={handleLabelInputChange} placeholder="z.B. Tätigkeit, Aufgabe..." />
                            </div>
                        </div>
                        <div className="pt-8 border-t">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">Verfügbare Zeiterfassungsmethoden</h3>
                            <p className="text-sm text-gray-500 mb-4">Legen Sie fest, ob Mitarbeiter nur manuell Zeiten eintragen oder auch die Stempeluhr nutzen können.</p>
                            <RadioGroup
                                name="timeTrackingMethod"
                                options={timeTrackingOptions}
                                selectedValue={localTimeTrackingMethod}
                                onChange={(value) => setLocalTimeTrackingMethod(value as 'all' | 'manual')}
                            />
                        </div>

                        <div className="pt-8 border-t">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">Bearbeitbarkeit von Zeiteinträgen</h3>
                            <p className="text-sm text-gray-500 mb-4">Legen Sie fest, wie lange Mitarbeiter ihre eigenen Zeiteinträge bearbeiten oder löschen können. Als Admin können Sie immer alle Einträge bearbeiten.</p>
                            <RadioGroup
                                name="editLockRule"
                                options={editabilityOptions}
                                selectedValue={localSettings.editLockRule || 'currentMonth'}
                                onChange={handleLockRuleChange}
                            />
                        </div>
                    </div>
                )}
                
                {activeTab === 'employeeOptions' && (
                    <div className="space-y-8 animate-fade-in">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">Urlaubsanträge</h3>
                            <p className="text-sm text-gray-500 mb-4">Erlauben Sie Mitarbeitern, halbtägigen Urlaub zu beantragen.</p>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                                <label className="text-sm font-medium text-gray-700">Halbtägigen Urlaub erlauben</label>
                                <ToggleSwitch
                                    checked={localSettings.allowHalfDayVacations ?? false}
                                    onChange={handleAllowHalfDayVacationsToggle}
                                />
                            </div>
                        </div>

                        <div className="pt-8 border-t">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">Stundenzettel-Export</h3>
                            <p className="text-sm text-gray-500 mb-4">Erlauben Sie Mitarbeitern, ihre eigenen Stundenzettel als Excel-Datei herunterzuladen.</p>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                                <label className="text-sm font-medium text-gray-700">Export-Funktion für Mitarbeiter aktivieren</label>
                                <ToggleSwitch
                                    checked={localSettings.employeeCanExport ?? true}
                                    onChange={handleExportToggle}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-8 mt-8 border-t">
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                    Einstellungen Speichern
                </Button>
            </div>
        </Card>
    );
};