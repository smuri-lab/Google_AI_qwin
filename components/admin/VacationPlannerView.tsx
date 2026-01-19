import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { Employee, AbsenceRequest, Holiday, HolidaysByYear, TimeEntry, CompanySettings } from '../../types';
import { AbsenceType } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { AbsenceFormModal, type AbsenceFormData } from './AbsenceFormModal';

interface VacationPlannerViewProps {
  employees: Employee[];
  absenceRequests: AbsenceRequest[];
  holidaysByYear: HolidaysByYear;
  timeEntries: TimeEntry[];
  addAbsenceRequest: (request: Omit<AbsenceRequest, 'id' | 'status'>, status: AbsenceRequest['status']) => void;
  onUpdateAbsenceRequest: (request: AbsenceRequest) => void;
  onDeleteAbsenceRequest: (id: number) => void;
  onEnsureHolidaysForYear: (year: number) => void;
  companySettings: CompanySettings;
}

const getAbsenceTypeUI = (type: AbsenceType) => {
    const details = {
        [AbsenceType.Vacation]: { 
            short: 'U',
            solidClass: 'bg-blue-500 text-white', 
            pendingClass: 'bg-blue-100 text-blue-700',
            pendingBorderClass: 'border-blue-400',
            title: 'Urlaub' 
        },
        [AbsenceType.SickLeave]: { 
            short: 'K',
            solidClass: 'bg-orange-500 text-white',
            pendingClass: 'bg-orange-100 text-orange-700',
            pendingBorderClass: 'border-orange-400',
            title: 'Krank' 
        },
        [AbsenceType.TimeOff]: { 
            short: 'F',
            solidClass: 'bg-green-500 text-white',
            pendingClass: 'bg-green-100 text-green-700',
            pendingBorderClass: 'border-green-400',
            title: 'Freizeitausgleich' 
        },
    };
    return details[type];
};


const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
};

const formatDateForComparison = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export const VacationPlannerView: React.FC<VacationPlannerViewProps> = ({ 
    employees, 
    absenceRequests, 
    holidaysByYear, 
    addAbsenceRequest, 
    onUpdateAbsenceRequest,
    onDeleteAbsenceRequest,
    onEnsureHolidaysForYear,
    timeEntries,
    companySettings
}) => {
    const [viewStartDate, setViewStartDate] = useState(() => getStartOfWeek(new Date()));
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [initialModalData, setInitialModalData] = useState<Partial<AbsenceFormData> | null>(null);
    const today = useMemo(() => new Date(), []);

    useEffect(() => {
        const startYear = viewStartDate.getFullYear();
        const endDay = new Date(viewStartDate);
        endDay.setDate(endDay.getDate() + 20); // Last visible day (3 weeks total)
        const endYear = endDay.getFullYear();
        
        onEnsureHolidaysForYear(startYear);
        if (startYear !== endYear) {
            onEnsureHolidaysForYear(endYear);
        }
    }, [viewStartDate, onEnsureHolidaysForYear]);

    const changePeriod = (offset: number) => {
        setViewStartDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + (offset * 7)); // 1 week
            return newDate;
        });
    };

    const visibleDays = useMemo(() => {
        return Array.from({ length: 21 }, (_, i) => { // 3 weeks
            const day = new Date(viewStartDate);
            day.setDate(day.getDate() + i);
            return day;
        });
    }, [viewStartDate]);
    
    const getAbsenceForDay = (employeeId: number, day: Date): AbsenceRequest | undefined => {
        const dayString = formatDateForComparison(day);
        const requestsForDay = absenceRequests.filter(req =>
            req.employeeId === employeeId && 
            dayString >= req.startDate && 
            dayString <= req.endDate &&
            req.status !== 'rejected'
        );
        // Prioritize showing pending requests
        return requestsForDay.find(r => r.status === 'pending') || requestsForDay[0];
    };

    const formatHeaderDate = () => {
        if (!visibleDays.length) return '';
        const start = visibleDays[0];
        const end = visibleDays[20];
        const startYear = start.getFullYear();
        const endYear = end.getFullYear();

        const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
        
        const startStr = start.toLocaleDateString('de-DE', { ...options, year: startYear !== endYear ? 'numeric' : undefined });
        const endStr = end.toLocaleDateString('de-DE', { ...options, year: 'numeric' });
        
        return `${startStr} - ${endStr}`;
    };
    
    const handleOpenModal = (data: Partial<AbsenceFormData> | null = null) => {
        setInitialModalData(data);
        setIsModalOpen(true);
    };
    
    const handleCellClick = (employeeId: number, day: Date) => {
        const existingAbsence = getAbsenceForDay(employeeId, day);
        if (existingAbsence) {
            handleOpenModal(existingAbsence);
        } else {
            const dateString = formatDateForComparison(day);
            handleOpenModal({
                employeeId,
                startDate: dateString,
                endDate: dateString,
            });
        }
    };
    
    const handleSaveAbsence = (data: AbsenceFormData) => {
        if (data.id) {
            onUpdateAbsenceRequest(data as AbsenceRequest);
        } else {
            addAbsenceRequest(data as Omit<AbsenceRequest, 'id' | 'status'>, 'approved');
        }
        setIsModalOpen(false);
    };

    const handleDeleteAbsence = (id: number) => {
        onDeleteAbsenceRequest(id);
        setIsModalOpen(false);
    };

    return (
        <>
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => changePeriod(-1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                    </button>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 text-center">
                       {formatHeaderDate()}
                    </h2>
                    <div className="flex items-center gap-2">
                         <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 hidden sm:flex items-center gap-2 text-sm px-3 py-2">
                            <PlusIcon className="h-4 w-4" />
                            <span>Abwesenheit eintragen</span>
                        </Button>
                        <button onClick={() => changePeriod(1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-200">
                        <thead className="sticky top-0 bg-white z-10 shadow-sm">
                            <tr>
                                <th className="sticky left-0 bg-white p-2 border-b border-r text-left text-sm font-semibold text-gray-700 w-40 z-20">Mitarbeiter</th>
                                {visibleDays.map(day => {
                                    const year = day.getFullYear();
                                    const holidaysForYear = holidaysByYear[year] || [];
                                    const dayString = formatDateForComparison(day);
                                    const holiday = holidaysForYear.find(h => h.date === dayString);
                                    const dayOfWeek = day.getDay();
                                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                    const isToday = day.toDateString() === today.toDateString();

                                    let thClassName = `p-2 border-b border-r text-center text-xs`;
                                    let dateClassName = 'font-semibold';

                                    if (holiday) {
                                        thClassName += ' bg-red-50/50 text-red-700';
                                    } else if (isWeekend) {
                                        thClassName += ' bg-gray-50/75';
                                    }
                                    if (isToday) {
                                        dateClassName += ' text-white bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center';
                                    }

                                    return (
                                        <th key={day.toISOString()} className={thClassName} title={holiday?.name}>
                                            <div className="font-normal text-gray-500">{day.toLocaleString('de-DE', { weekday: 'short' }).slice(0, 2)}</div>
                                            <div className={`flex justify-center items-center mt-1 h-6`}>
                                                <div className={dateClassName}>{day.getDate()}</div>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(employee => (
                                <tr key={employee.id}>
                                    <td className="sticky left-0 bg-white p-2 border-b border-r text-sm font-medium whitespace-nowrap w-40 z-10">{employee.firstName} {employee.lastName}</td>
                                    {visibleDays.map(day => {
                                        const year = day.getFullYear();
                                        const holidaysForYear = holidaysByYear[year] || [];
                                        const dayString = formatDateForComparison(day);
                                        const holiday = holidaysForYear.find(h => h.date === dayString);
                                        const absence = getAbsenceForDay(employee.id, day);
                                        const dayOfWeek = day.getDay();
                                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                        const isToday = day.toDateString() === today.toDateString();

                                        let cellClassName = `border-b border-r h-12 text-center text-sm font-bold transition-colors relative p-0`;
                                        let cellTitle = holiday?.name || 'Abwesenheit eintragen';

                                        if (!absence) {
                                           if (holiday) {
                                                cellClassName += ' bg-red-50/30';
                                            } else if (isWeekend) {
                                                cellClassName += ' bg-gray-50/50';
                                            } else {
                                                cellClassName += ' hover:bg-blue-50/50 cursor-pointer';
                                            }
                                        }
                                        if (isToday) {
                                            cellClassName += ' bg-blue-50/30';
                                        }

                                        return (
                                            <td key={day.toISOString()} className={cellClassName} title={cellTitle} onClick={() => handleCellClick(employee.id, day)}>
                                                {absence && (() => {
                                                    const ui = getAbsenceTypeUI(absence.type);
                                                    const isStart = absence.startDate === dayString;
                                                    const isEnd = absence.endDate === dayString;
                                                    const isSingleDay = isStart && isEnd;
                                                    const isPending = absence.status === 'pending';

                                                    let pillClasses = 'absolute inset-y-1 left-0 right-0 flex items-center justify-start text-sm font-bold transition-all px-3 ';
                                                    
                                                    if (isPending) {
                                                        pillClasses += `${ui.pendingClass} border-2 border-dashed ${ui.pendingBorderClass}`;
                                                    } else {
                                                        pillClasses += ui.solidClass;
                                                    }

                                                    if (isSingleDay) {
                                                        pillClasses += ' rounded-md mx-1 justify-center';
                                                    } else if (isStart) {
                                                        pillClasses += ' rounded-l-full';
                                                    } else if (isEnd) {
                                                        pillClasses += ' rounded-r-full';
                                                    } else {
                                                        // Middle part
                                                    }
                                                    
                                                    return (
                                                        <div className={pillClasses} title={isPending ? `${ui.title} (ausstehend)` : ui.title}>
                                                           {(isStart || isSingleDay) && <span>{ui.short}</span>}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {employees.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            Keine Mitarbeiter angelegt. Bitte fügen Sie zuerst Mitarbeiter hinzu.
                        </div>
                    )}
                </div>
            </Card>
            <AbsenceFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveAbsence}
                onDelete={handleDeleteAbsence}
                employees={employees}
                initialData={initialModalData}
                // FIX: Pass all absence requests for validation within the modal.
                allAbsenceRequests={absenceRequests}
                // FIX: Pass allTimeEntries to the modal for conflict checking.
                allTimeEntries={timeEntries}
                companySettings={companySettings}
            />
        </>
    );
};