import React, { useState, useMemo, useEffect } from 'react';
import type { TimeEntry, Customer, Activity, CompanySettings, Employee } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatHoursAndMinutes } from '../utils';
import { SelectorButton } from '../ui/SelectorButton';
import { CalendarModal } from '../ui/CalendarModal';
import { DateSelectorButton } from '../ui/DateSelectorButton';
import { DocumentArrowDownIcon } from '../icons/DocumentArrowDownIcon';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs';
import { EmployeeMultiSelectModal } from './EmployeeMultiSelectModal';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';

interface ReportsViewProps {
  timeEntries: TimeEntry[];
  customers: Customer[];
  activities: Activity[];
  companySettings: CompanySettings;
  employees: Employee[];
}

interface ReportEntry {
  employeeName: string;
  dayOfWeek: string;
  date: string;
  customerName: string;
  activityName: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  totalSeconds: number;
  comment?: string;
  sortDate: Date;
  employeeId: number;
  customerId: string;
  activityId: string;
}

const getStartOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('sv-SE');
const getEndOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString('sv-SE');
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const ReportsView: React.FC<ReportsViewProps> = ({ timeEntries, customers, activities, companySettings, employees }) => {
    // Filter States
    const [startDate, setStartDate] = useState(getStartOfMonth());
    const [endDate, setEndDate] = useState(getEndOfMonth());
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>(() => employees.filter(e => e.isActive).map(e => e.id));
    const [primaryCategory, setPrimaryCategory] = useState<'customer' | 'activity'>('customer');
    
    // Modal States
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
    const [isViewEmployeeModalOpen, setIsViewEmployeeModalOpen] = useState(false);
    const [isSecondaryCategoryModalOpen, setIsSecondaryCategoryModalOpen] = useState(false);

    // View State
    const [reportEntries, setReportEntries] = useState<ReportEntry[] | null>(null);
    const [viewEmployeeIds, setViewEmployeeIds] = useState<number[]>([]);
    const [commentSearchTerm, setCommentSearchTerm] = useState('');
    const [selectedSecondaryCategoryIds, setSelectedSecondaryCategoryIds] = useState<string[]>([]);

    const customerLabel = companySettings.customerLabel || 'Zeitkategorie 1';
    const activityLabel = companySettings.activityLabel || 'Zeitkategorie 2';
    const timeFormat = companySettings.adminTimeFormat || 'hoursMinutes';
    
    const activeEmployees = useMemo(() => employees.filter(e => e.isActive), [employees]);
    const getEmployeeName = (id: number) => { const e = employees.find(emp => emp.id === id); return e ? `${e.firstName} ${e.lastName}` : 'Unbekannt'; };

    useEffect(() => {
        if (reportEntries) {
            const uniqueEmployeeIdsInReport = [...new Set(reportEntries.map(e => e.employeeId))];
            setViewEmployeeIds(uniqueEmployeeIdsInReport);
            
            if (primaryCategory === 'customer') {
                const uniqueActivityIds = [...new Set(reportEntries.map(e => e.activityId))];
                setSelectedSecondaryCategoryIds(uniqueActivityIds);
            } else {
                const uniqueCustomerIds = [...new Set(reportEntries.map(e => e.customerId))];
                setSelectedSecondaryCategoryIds(uniqueCustomerIds);
            }
        } else {
            setViewEmployeeIds([]);
            setSelectedSecondaryCategoryIds([]);
        }
    }, [reportEntries, primaryCategory]);

    const handleApplyFilters = () => {
        const start = new Date(startDate); start.setHours(0, 0, 0, 0);
        const end = new Date(endDate); end.setHours(23, 59, 59, 999);

        const filteredEntries = timeEntries.filter(entry => {
            const entryDate = new Date(entry.start);
            const employeeMatch = selectedEmployeeIds.includes(entry.employeeId);
            return entryDate >= start && entryDate <= end && employeeMatch;
        });

        const mappedEntries: ReportEntry[] = filteredEntries.map(entry => {
            const entryDate = new Date(entry.start);
            const duration = ((new Date(entry.end).getTime() - new Date(entry.start).getTime()) / 1000) - (entry.breakDurationMinutes * 60);
            return {
                employeeId: entry.employeeId,
                customerId: entry.customerId,
                activityId: entry.activityId,
                employeeName: getEmployeeName(entry.employeeId),
                dayOfWeek: entryDate.toLocaleDateString('de-DE', { weekday: 'short' }),
                date: entryDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                customerName: customers.find(c => c.id === entry.customerId)?.name || 'N/A',
                activityName: activities.find(a => a.id === entry.activityId)?.name || 'N/A',
                startTime: entryDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
                endTime: new Date(entry.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
                breakMinutes: entry.breakDurationMinutes,
                totalSeconds: duration,
                comment: entry.comment,
                sortDate: entryDate,
            };
        });

        mappedEntries.sort((a, b) => {
            if (a.employeeName.localeCompare(b.employeeName) !== 0) {
                return a.employeeName.localeCompare(b.employeeName);
            }
            return a.sortDate.getTime() - b.sortDate.getTime();
        });

        setReportEntries(mappedEntries);
        setCommentSearchTerm('');
    };
    
    const handleExport = () => {
        if (!reportEntries) return;

        const viewEmployeeIdsSet = new Set(viewEmployeeIds);
        const secondaryCategoryIdsSet = new Set(selectedSecondaryCategoryIds);
        const filteredForExport = reportEntries.filter(entry =>
            viewEmployeeIdsSet.has(entry.employeeId) &&
            (entry.comment || '').toLowerCase().includes(commentSearchTerm.toLowerCase()) &&
            secondaryCategoryIdsSet.has(primaryCategory === 'customer' ? entry.activityId : entry.customerId)
        );

        const dataToExport = filteredForExport.map(entry => {
            const row: {[key: string]: any} = {};
            row['Mitarbeiter'] = entry.employeeName;
            row['Tag'] = entry.dayOfWeek;
            row['Datum'] = entry.date;
            if (primaryCategory === 'customer') {
                row[activityLabel] = entry.activityName;
            } else {
                row[customerLabel] = entry.customerName;
            }
            row['Startzeit'] = entry.startTime;
            row['Endzeit'] = entry.endTime;
            row['Pause (min)'] = entry.breakMinutes;
            row['Gesamtzeit'] = formatHoursAndMinutes(entry.totalSeconds / 3600, timeFormat);
            row['Kommentar'] = entry.comment || '';
            return row;
        });

        if (dataToExport.length > 0) {
            const totalSecondsForExport = filteredForExport.reduce((sum, entry) => sum + entry.totalSeconds, 0);
            const formattedTotal = formatHoursAndMinutes(totalSecondsForExport / 3600, timeFormat);

            dataToExport.push({}); // Spacer row

            const summaryRow: { [key: string]: any } = {
                'Mitarbeiter': '', 'Tag': '', 'Datum': '', 'Startzeit': '', 'Endzeit': '',
                'Pause (min)': 'Gesamt:', 'Gesamtzeit': formattedTotal, 'Kommentar': ''
            };
            if (primaryCategory === 'customer') { summaryRow[activityLabel] = ''; } 
            else { summaryRow[customerLabel] = ''; }
            dataToExport.push(summaryRow);
        }
        
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        ws['!cols'] = [ { wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 40 } ];
        ws['!freeze'] = { ySplit: 1 };

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Zeitauswertung');
    
        XLSX.writeFile(wb, `Zeitauswertung_${startDate}_bis_${endDate}.xlsx`);
    };

    const getSelectedEmployeesText = () => {
        if (selectedEmployeeIds.length === activeEmployees.length) return 'Alle Mitarbeiter';
        if (selectedEmployeeIds.length === 0) return 'Kein Mitarbeiter ausgewählt';
        if (selectedEmployeeIds.length === 1) {
            const emp = employees.find(e => e.id === selectedEmployeeIds[0]);
            return emp ? `${emp.firstName} ${emp.lastName}` : '1 Mitarbeiter';
        }
        return `${selectedEmployeeIds.length} Mitarbeiter ausgewählt`;
    };

    const renderReportTable = () => {
        const employeesInReport = useMemo(() => {
            if (!reportEntries) return [];
            const uniqueIds = [...new Set(reportEntries.map(e => e.employeeId))];
            return employees.filter(emp => uniqueIds.includes(emp.id));
        }, [reportEntries, employees]);

        const secondaryCategoriesInReport = useMemo(() => {
            if (!reportEntries) return [];
            if (primaryCategory === 'customer') {
                const uniqueIds = [...new Set(reportEntries.map(e => e.activityId))];
                return activities.filter(act => uniqueIds.includes(act.id));
            } else {
                const uniqueIds = [...new Set(reportEntries.map(e => e.customerId))];
                return customers.filter(cust => uniqueIds.includes(cust.id));
            }
        }, [reportEntries, primaryCategory, activities, customers]);
    
        const getViewEmployeesText = () => {
            const totalInReport = employeesInReport.length;
            const selectedCount = viewEmployeeIds.length;
        
            if (totalInReport > 0 && selectedCount === totalInReport) return 'Alle angezeigten Mitarbeiter';
            if (selectedCount === 0) return 'Kein Mitarbeiter';
            if (selectedCount === 1) {
                const emp = employees.find(e => e.id === viewEmployeeIds[0]);
                return emp ? `${emp.firstName} ${emp.lastName}` : '1 Mitarbeiter';
            }
            return `${selectedCount} von ${totalInReport} Mitarbeitern`;
        };
        
        const getSecondaryCategoryFilterText = () => {
            const totalInReport = secondaryCategoriesInReport.length;
            const selectedCount = selectedSecondaryCategoryIds.length;
            const label = primaryCategory === 'customer' ? activityLabel : customerLabel;
        
            if (totalInReport > 0 && selectedCount === totalInReport) return `Alle ${label}`;
            if (selectedCount === 0) return `Keine ${label}`;
            if (selectedCount === 1) {
                const cat = secondaryCategoriesInReport.find(c => c.id === selectedSecondaryCategoryIds[0]);
                return cat ? cat.name : `1 ${label}`;
            }
            return `${selectedCount} von ${totalInReport} ${label}`;
        };

        if (!reportEntries) return null;
        
        const viewEmployeeIdsSet = new Set(viewEmployeeIds);
        const secondaryCategoryIdsSet = new Set(selectedSecondaryCategoryIds);
        const filteredEntries = reportEntries.filter(entry => 
            viewEmployeeIdsSet.has(entry.employeeId) &&
            (entry.comment || '').toLowerCase().includes(commentSearchTerm.toLowerCase()) &&
            secondaryCategoryIdsSet.has(primaryCategory === 'customer' ? entry.activityId : entry.customerId)
        );

        if (reportEntries.length === 0) {
            return (
                <Card>
                    <p className="text-center text-gray-500 py-8">Für den ausgewählten Zeitraum und Filter wurden keine Zeiteinträge gefunden.</p>
                </Card>
            );
        }

        const totalSeconds = filteredEntries.reduce((sum, entry) => sum + entry.totalSeconds, 0);

        return (
            <>
                <Card>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                        <h3 className="text-lg font-semibold whitespace-nowrap">Alle Zeiteinträge</h3>
                        <div className="text-right whitespace-nowrap">
                            <span className="text-sm text-gray-500">Gefilterte Gesamtzeit: </span>
                            <span className="text-lg font-bold text-blue-600">{formatHoursAndMinutes(totalSeconds / 3600, timeFormat)}</span>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4 pb-4 border-b">
                        <div className="w-full sm:w-auto sm:max-w-xs">
                            <SelectorButton
                                label=""
                                value={getViewEmployeesText()}
                                onClick={() => setIsViewEmployeeModalOpen(true)}
                                placeholder="Mitarbeiter auswählen..."
                            />
                        </div>
                        <div className="w-full sm:w-auto sm:max-w-xs">
                            <SelectorButton
                                label=""
                                value={getSecondaryCategoryFilterText()}
                                onClick={() => setIsSecondaryCategoryModalOpen(true)}
                                placeholder={`${primaryCategory === 'customer' ? activityLabel : customerLabel} auswählen...`}
                            />
                        </div>
                        <div className="w-full sm:w-auto sm:max-w-xs">
                            <Input
                                label=""
                                placeholder="Kommentar durchsuchen..."
                                value={commentSearchTerm}
                                onChange={(e) => setCommentSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                     {filteredEntries.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="text-left bg-gray-50 border-b">
                                    <tr>
                                        <th className="py-2 px-3 font-semibold text-gray-600">Mitarbeiter</th>
                                        <th className="py-2 px-3 font-semibold text-gray-600">Tag, Datum</th>
                                        {primaryCategory === 'customer' ? (
                                            <th className="py-2 px-3 font-semibold text-gray-600">{activityLabel}</th>
                                        ) : (
                                            <th className="py-2 px-3 font-semibold text-gray-600">{customerLabel}</th>
                                        )}
                                        <th className="py-2 px-3 font-semibold text-gray-600">Start - Ende</th>
                                        <th className="py-2 px-3 text-right font-semibold text-gray-600">Pause</th>
                                        <th className="py-2 px-3 text-right font-semibold text-gray-600">Gesamt</th>
                                        <th className="py-2 px-3 font-semibold text-gray-600">Kommentar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredEntries.map((entry, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="py-2 px-3 whitespace-nowrap align-top font-medium">{entry.employeeName}</td>
                                            <td className="py-2 px-3 whitespace-nowrap align-top"><div>{entry.dayOfWeek},</div><div>{entry.date}</div></td>
                                            {primaryCategory === 'customer' ? (
                                                <td className="py-2 px-3 align-top">{entry.activityName}</td>
                                            ) : (
                                                <td className="py-2 px-3 align-top">{entry.customerName}</td>
                                            )}
                                            <td className="py-2 px-3 whitespace-nowrap align-top">{entry.startTime} - {entry.endTime}</td>
                                            <td className="py-2 px-3 text-right whitespace-nowrap align-top">{entry.breakMinutes > 0 ? `${entry.breakMinutes}m` : '-'}</td>
                                            <td className="py-2 px-3 text-right whitespace-nowrap font-medium text-blue-700 align-top">{formatHoursAndMinutes(entry.totalSeconds / 3600, timeFormat)}</td>
                                            <td className="py-2 px-3 max-w-[200px] truncate align-top" title={entry.comment}>{entry.comment || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">Keine Einträge für die aktuelle Auswahl gefunden.</p>
                    )}
                </Card>
                {isViewEmployeeModalOpen && (
                    <EmployeeMultiSelectModal
                        isOpen={isViewEmployeeModalOpen}
                        onClose={() => setIsViewEmployeeModalOpen(false)}
                        onApply={(ids) => setViewEmployeeIds(ids as number[])}
                        employees={employeesInReport}
                        selectedEmployeeIds={viewEmployeeIds}
                    />
                )}
                 {isSecondaryCategoryModalOpen && (
                    <EmployeeMultiSelectModal
                        isOpen={isSecondaryCategoryModalOpen}
                        onClose={() => setIsSecondaryCategoryModalOpen(false)}
                        onApply={(ids) => setSelectedSecondaryCategoryIds(ids as string[])}
                        items={secondaryCategoriesInReport}
                        selectedItemIds={selectedSecondaryCategoryIds}
                        title={`${primaryCategory === 'customer' ? activityLabel : customerLabel} auswählen`}
                    />
                )}
            </>
        );
    };

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-xl font-bold mb-4">Zeitauswertung</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div className="lg:col-span-1"><DateSelectorButton label="Zeitraum" value={`${formatDate(startDate)} - ${formatDate(endDate)}`} onClick={() => setIsDatePickerOpen(true)} placeholder="Zeitraum..."/></div>
                    <div className="lg:col-span-1"><SelectorButton label="Mitarbeiter laden" value={getSelectedEmployeesText()} onClick={() => setIsEmployeeModalOpen(true)} placeholder="Mitarbeiter auswählen..."/></div>
                    <div className="lg:col-span-1">
                        <Select
                            label="Gruppieren nach"
                            value={primaryCategory}
                            onChange={(e) => setPrimaryCategory(e.target.value as 'customer' | 'activity')}
                        >
                            <option value="customer">{customerLabel}</option>
                            <option value="activity">{activityLabel}</option>
                        </Select>
                    </div>
                    <Button onClick={handleApplyFilters} className="bg-blue-600 hover:bg-blue-700 h-10">Anzeigen</Button>
                    <Button onClick={handleExport} disabled={!reportEntries} className="bg-green-600 hover:bg-green-700 h-10 flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"><DocumentArrowDownIcon className="h-5 w-5" />Export</Button>
                </div>
            </Card>

            {renderReportTable()}

            <CalendarModal isOpen={isDatePickerOpen} onClose={() => setIsDatePickerOpen(false)} onSelectRange={(range) => { setStartDate(range.start); setEndDate(range.end); setIsDatePickerOpen(false); }} title="Zeitraum auswählen" selectionMode="range" initialStartDate={startDate} initialEndDate={endDate} />
            <EmployeeMultiSelectModal
                isOpen={isEmployeeModalOpen}
                onClose={() => setIsEmployeeModalOpen(false)}
                onApply={(ids) => setSelectedEmployeeIds(ids as number[])}
                employees={employees}
                selectedEmployeeIds={selectedEmployeeIds}
            />
        </div>
    );
};