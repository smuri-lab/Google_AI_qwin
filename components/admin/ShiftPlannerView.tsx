
import React, { useState, useMemo, useCallback } from 'react';
import type { Employee, Shift, Customer, Activity, CompanySettings } from '../../types';
import { Card } from '../ui/Card';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { ShiftFormModal } from './ShiftFormModal';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { CalendarModal } from '../ui/CalendarModal';

interface ShiftPlannerViewProps {
  employees: Employee[];
  shifts: Shift[];
  customers: Customer[];
  activities: Activity[];
  companySettings: CompanySettings;
  addShift: (shift: Omit<Shift, 'id'>) => void;
  updateShift: (shift: Shift) => void;
  deleteShift: (id: string) => void;
}

const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(d.setDate(diff));
};

export const ShiftPlannerView: React.FC<ShiftPlannerViewProps> = ({ 
    employees, shifts, customers, activities, companySettings, addShift, updateShift, deleteShift 
}) => {
    const [viewStartDate, setViewStartDate] = useState(() => getStartOfWeek(new Date()));
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDatePickModalOpen, setIsDatePickModalOpen] = useState(false);
    const [modalInitialData, setModalInitialData] = useState<Partial<Shift> | null>(null);
    const [modalDefaultDate, setModalDefaultDate] = useState<string | undefined>(undefined);
    const [modalDefaultEmployeeId, setModalDefaultEmployeeId] = useState<number | undefined>(undefined);
    
    const [isInputDisabled, setIsInputDisabled] = useState(false);

    // Dynamic Time Grid Logic
    const startHour = companySettings.shiftPlannerStartHour ?? 0;
    const endHour = companySettings.shiftPlannerEndHour ?? 24;
    const totalHours = endHour - startHour;
    const viewStartMinutes = startHour * 60;
    const viewEndMinutes = endHour * 60;
    const totalViewMinutes = viewEndMinutes - viewStartMinutes;

    const HOURS = useMemo(() => Array.from({ length: totalHours + 1 }, (_, i) => startHour + i), [startHour, totalHours]);

    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(viewStartDate);
            d.setDate(d.getDate() + i);
            return d;
        });
    }, [viewStartDate]);

    const changeWeek = (offset: number) => {
        setViewStartDate(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() + (offset * 7));
            return d;
        });
    };

    const unlockInput = useCallback(() => {
        setTimeout(() => {
            setIsInputDisabled(false);
        }, 500);
    }, []);

    const handleJumpToDate = (d: Date) => {
        setViewStartDate(getStartOfWeek(d));
        unlockInput();
        setIsDatePickModalOpen(false);
    };

    const handleTrackClick = (date: Date, employeeId?: number) => {
        if (isInputDisabled) return;
        setIsInputDisabled(true);
        
        setModalDefaultDate(date.toLocaleDateString('sv-SE'));
        setModalDefaultEmployeeId(employeeId);
        setModalInitialData(null); 
        setIsModalOpen(true);
    };

    const handleShiftClick = (e: React.MouseEvent, shift: Shift) => {
        e.stopPropagation();
        if (isInputDisabled) return;
        setIsInputDisabled(true);
        
        setModalInitialData(shift);
        setModalDefaultDate(undefined);
        setIsModalOpen(true);
    };

    const handleSave = (shift: Omit<Shift, 'id'> | Shift) => {
        if ('id' in shift) {
            updateShift(shift);
        } else {
            addShift(shift);
        }
        unlockInput();
        setIsModalOpen(false);
    };
    
    const handleCloseModal = () => {
        unlockInput();
        setIsModalOpen(false);
    };
    
    const handleCloseDatePickModal = () => {
        unlockInput();
        setIsDatePickModalOpen(false);
    };
    
    const handleOpenDatePickModal = () => {
        if (isInputDisabled) return;
        setIsInputDisabled(true);
        setIsDatePickModalOpen(true);
    };

    const handleDelete = (id: string) => {
        deleteShift(id);
        unlockInput();
        setIsModalOpen(false);
    };

    const getShiftPosition = (startStr: string, endStr: string) => {
        const start = new Date(startStr);
        const end = new Date(endStr);
        
        let startMinutes = start.getHours() * 60 + start.getMinutes();
        let endMinutes = end.getHours() * 60 + end.getMinutes();
        
        // Handle overlap with next day (simple version for single day view)
        if (endMinutes < startMinutes) endMinutes = 24 * 60; // Cap at midnight if wrapping

        // Clip to view range
        const effectiveStart = Math.max(startMinutes, viewStartMinutes);
        const effectiveEnd = Math.min(endMinutes, viewEndMinutes);
        
        // If completely outside
        if (effectiveEnd <= effectiveStart) {
             return { display: 'none' };
        }

        const relativeStart = effectiveStart - viewStartMinutes;
        const duration = effectiveEnd - effectiveStart;
        
        const left = (relativeStart / totalViewMinutes) * 100;
        const width = (duration / totalViewMinutes) * 100;
        
        return { left: `${left}%`, width: `calc(${width}% - 2px)` }; // -2px gap
    };

    const getEmployeeName = (id: number) => {
        const emp = employees.find(e => e.id === id);
        return emp ? `${emp.firstName} ${emp.lastName}` : 'Unbekannt';
    };
    
    const getShiftLabel = (shift: Shift) => {
        let parts = [];
        if (shift.customerId) {
            const customer = customers.find(c => c.id === shift.customerId);
            if (customer) parts.push(customer.name);
        }
        if (shift.activityId) {
            const activity = activities.find(a => a.id === shift.activityId);
            if (activity) parts.push(activity.name);
        }
        
        if (parts.length > 0) {
            return parts.join(' - ');
        }
        
        return shift.label || 'Schicht';
    };

    const weekRangeString = `${weekDays[0].toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - ${weekDays[6].toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;

    return (
        <div className="space-y-4">
            <Card className="overflow-hidden flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 px-2">
                    <button onClick={() => changeWeek(-1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><ChevronLeftIcon className="h-5 w-5 text-gray-600" /></button>
                    <button onClick={handleOpenDatePickModal} className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <h2 className="text-xl font-bold text-gray-800">{weekRangeString}</h2>
                        <CalendarDaysIcon className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
                    </button>
                    <button onClick={() => changeWeek(1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><ChevronRightIcon className="h-5 w-5 text-gray-600" /></button>
                </div>

                <div className={`overflow-x-auto relative ${isInputDisabled ? 'pointer-events-none' : ''}`}>
                    <div className="min-w-[800px]">
                        {/* Header Row */}
                        <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-20">
                            <div className="w-24 sm:w-32 shrink-0 p-2 border-r border-gray-200 font-semibold text-gray-600 bg-gray-50 z-20 sticky left-0">
                                Tag
                            </div>
                            <div className="w-32 sm:w-48 shrink-0 p-2 border-r border-gray-200 font-semibold text-gray-600 bg-gray-50 z-10">
                                Mitarbeiter
                            </div>
                            <div className="flex-1 relative h-8">
                                {HOURS.map((hour) => (
                                    <div 
                                        key={hour} 
                                        className="absolute top-0 bottom-0 border-l border-gray-300 text-[10px] sm:text-xs text-gray-400 pl-1"
                                        style={{ left: `${((hour - startHour) / totalHours) * 100}%` }}
                                    >
                                        {hour}:00
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Body: Days Rows */}
                        <div className="divide-y divide-gray-100">
                            {weekDays.map((day) => {
                                const dayStr = day.toLocaleDateString('sv-SE');
                                const dayShifts = shifts.filter(s => s.start.startsWith(dayStr));
                                
                                // Group shifts by Employee and Sort by Earliest Start Time
                                const employeesWithShifts = Array.from(new Set(dayShifts.map(s => s.employeeId)))
                                    .map(id => employees.find(e => e.id === id))
                                    .filter((e): e is Employee => !!e)
                                    .sort((a, b) => {
                                        // Find earliest shift start time for employee A
                                        const shiftsA = dayShifts.filter(s => s.employeeId === a.id);
                                        const minStartA = Math.min(...shiftsA.map(s => new Date(s.start).getTime()));
                                        
                                        // Find earliest shift start time for employee B
                                        const shiftsB = dayShifts.filter(s => s.employeeId === b.id);
                                        const minStartB = Math.min(...shiftsB.map(s => new Date(s.start).getTime()));
                                        
                                        // Sort by time ascending
                                        if (minStartA !== minStartB) {
                                            return minStartA - minStartB;
                                        }
                                        
                                        // Fallback: Alphabetical
                                        return a.lastName.localeCompare(b.lastName);
                                    });

                                const isToday = day.toDateString() === new Date().toDateString();
                                
                                return (
                                    <div key={day.toISOString()} className={`flex group ${isToday ? 'bg-blue-50/10' : 'bg-white'}`}>
                                        {/* Day Column */}
                                        <div className={`w-24 sm:w-32 shrink-0 p-3 border-r border-gray-200 sticky left-0 z-10 flex flex-col justify-center ${isToday ? 'bg-blue-50' : 'bg-white group-hover:bg-gray-50 transition-colors'}`}>
                                            <div className={`font-bold ${isToday ? 'text-blue-700' : 'text-gray-800'}`}>
                                                {day.toLocaleDateString('de-DE', { weekday: 'short' })}.
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {day.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}.
                                            </div>
                                        </div>

                                        {/* Employees & Timeline Container */}
                                        <div className="flex-1 flex flex-col">
                                            {employeesWithShifts.length > 0 ? (
                                                employeesWithShifts.map((employee) => {
                                                    const empShifts = dayShifts.filter(s => s.employeeId === employee.id)
                                                        .sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime());
                                                    
                                                    return (
                                                        <div key={employee.id} className="flex border-b border-gray-100 last:border-b-0 h-12">
                                                            {/* Employee Name Column */}
                                                            <div className="w-32 sm:w-48 shrink-0 p-2 border-r border-gray-200 flex items-center truncate text-sm font-medium text-gray-700 bg-white/50">
                                                                {employee.firstName} {employee.lastName}
                                                            </div>
                                                            {/* Timeline Track */}
                                                            <div 
                                                                className="flex-1 relative cursor-pointer hover:bg-gray-50 transition-colors"
                                                                onClick={() => handleTrackClick(day, employee.id)}
                                                            >
                                                                {/* Grid Lines */}
                                                                {HOURS.map((hour) => (
                                                                    <div key={hour} className="absolute top-0 bottom-0 border-l border-gray-100 pointer-events-none" style={{ left: `${((hour - startHour) / totalHours) * 100}%` }} />
                                                                ))}
                                                                
                                                                {/* Bars */}
                                                                {empShifts.map((shift) => {
                                                                    const pos = getShiftPosition(shift.start, shift.end);
                                                                    const startLabel = new Date(shift.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                                                                    const endLabel = new Date(shift.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                                                                    const shiftLabel = getShiftLabel(shift);

                                                                    return (
                                                                        <div
                                                                            key={shift.id}
                                                                            className="absolute h-8 top-2 rounded shadow-sm text-white text-xs flex items-center px-2 cursor-pointer hover:brightness-110 hover:scale-[1.01] hover:shadow-md transition-all z-10 overflow-hidden whitespace-nowrap"
                                                                            style={{
                                                                                ...pos,
                                                                                backgroundColor: shift.color || '#3b82f6',
                                                                                opacity: 0.95,
                                                                            }}
                                                                            onClick={(e) => handleShiftClick(e, shift)}
                                                                            title={`${employee.firstName} ${employee.lastName}: ${shiftLabel} (${startLabel} - ${endLabel})`}
                                                                        >
                                                                            <span className="opacity-90 truncate font-semibold">
                                                                                {startLabel}-{endLabel}
                                                                            </span>
                                                                            <span className="opacity-80 ml-1 truncate hidden sm:inline border-l border-white/30 pl-1">
                                                                                {shiftLabel}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                // Empty State Row for adding
                                                <div className="flex h-12">
                                                    <div className="w-32 sm:w-48 shrink-0 border-r border-gray-200 bg-gray-50/30"></div>
                                                    <div 
                                                        className="flex-1 relative cursor-pointer hover:bg-gray-50/50 transition-colors group/empty"
                                                        onClick={() => handleTrackClick(day)}
                                                    >
                                                        {HOURS.map((hour) => (
                                                            <div key={hour} className="absolute top-0 bottom-0 border-l border-gray-100 pointer-events-none" style={{ left: `${((hour - startHour) / totalHours) * 100}%` }} />
                                                        ))}
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/empty:opacity-100 pointer-events-none text-gray-400 text-xs">
                                                            <PlusIcon className="h-4 w-4 mr-1" /> Schicht hinzufügen
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </Card>

            {isModalOpen && (
                <ShiftFormModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    employees={employees}
                    customers={customers}
                    activities={activities}
                    companySettings={companySettings}
                    initialData={modalInitialData}
                    defaultDate={modalDefaultDate}
                    defaultEmployeeId={modalDefaultEmployeeId}
                />
            )}

            {isDatePickModalOpen && (
                <CalendarModal
                    isOpen={isDatePickModalOpen}
                    onClose={handleCloseDatePickModal}
                    onSelectDate={handleJumpToDate}
                    title="Woche auswählen"
                    initialStartDate={viewStartDate.toISOString()}
                    selectionMode="single"
                />
            )}
        </div>
    );
};
