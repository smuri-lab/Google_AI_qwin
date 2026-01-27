import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { Employee, AbsenceRequest, Holiday, HolidaysByYear, TimeEntry, CompanySettings } from '../../types';
import { AbsenceType, EmploymentType } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { XIcon } from '../icons/XIcon';
import { AbsenceFormModal, type AbsenceFormData } from './AbsenceFormModal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { SelectionModal } from '../ui/SelectionModal';
import { SelectorButton } from '../ui/SelectorButton';
import { VacationSunIcon } from '../icons/VacationSunIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { SickFaceIcon } from '../icons/SickFaceIcon';
import { PlannerDisplayOptionsModal } from './PlannerDisplayOptionsModal';
import { AdjustmentsHorizontalIcon } from '../icons/AdjustmentsHorizontalIcon';
import { getContractDetailsForDate } from '../utils';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { PlannerDateRangeModal, type Preset } from './PlannerDateRangeModal';
import { ArrowsPointingOutIcon } from '../icons/ArrowsPointingOutIcon';
import { ArrowsPointingInIcon } from '../icons/ArrowsPointingInIcon';
import { DevicePhoneMobileIcon } from '../icons/DevicePhoneMobileIcon';

interface PlannerViewProps {
  employees: Employee[];
  absenceRequests: AbsenceRequest[];
  holidaysByYear: HolidaysByYear;
  timeEntries: TimeEntry[];
  addAbsenceRequest: (request: Omit<AbsenceRequest, 'id' | 'status'>, status: AbsenceRequest['status']) => void;
  onUpdateAbsenceRequest: (request: AbsenceRequest) => void;
  onDeleteAbsenceRequest: (id: number) => void;
  onEnsureHolidaysForYear: (year: number) => void;
  onUpdateRequestStatus: (id: number, status: 'approved' | 'rejected', comment?: string) => void;
  companySettings: CompanySettings;
}

const getAbsenceTypeUI = (type: AbsenceType) => {
    const details = {
        [AbsenceType.Vacation]: { icon: VacationSunIcon, solidClass: 'bg-yellow-500 text-white', pendingClass: 'bg-yellow-100 text-yellow-700', pendingBorderClass: 'border-yellow-400', title: 'Urlaub' },
        [AbsenceType.SickLeave]: { icon: SickFaceIcon, solidClass: 'bg-orange-500 text-white', pendingClass: 'bg-orange-100 text-orange-700', pendingBorderClass: 'border-orange-400', title: 'Krank' },
        [AbsenceType.TimeOff]: { icon: ClockIcon, solidClass: 'bg-green-500 text-white', pendingClass: 'bg-green-100 text-green-700', pendingBorderClass: 'border-green-400', title: 'Freizeitausgleich' },
    };
    return details[type];
};

const formatDateForComparison = (date: Date): string => {
    return date.toLocaleDateString('sv-SE');
};

const AbsencePillWithTooltip: React.FC<{ absence: AbsenceRequest; day: Date; daySpan: number; }> = ({ absence, day, daySpan }) => {
    const [tooltip, setTooltip] = useState<{ content: React.ReactNode; x: number; y: number } | null>(null);

    const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ui = getAbsenceTypeUI(absence.type);
        const statusText = absence.status === 'pending' ? 'ausstehend' : 'genehmigt';
        const dayPortionText = absence.dayPortion === 'am' ? ' (Vormittags)' : absence.dayPortion === 'pm' ? ' (Nachmittags)' : '';
        const dateText = absence.startDate === absence.endDate
            ? `${new Date(absence.startDate).toLocaleDateString('de-DE')}${dayPortionText}`
            : `${new Date(absence.startDate).toLocaleDateString('de-DE')} - ${new Date(absence.endDate).toLocaleDateString('de-DE')}`;
        
        const content = (
            <div className="text-xs">
                <p className="font-bold">{ui.title} ({statusText})</p>
                <p>{dateText}</p>
            </div>
        );
        setTooltip({ content, x: rect.left, y: rect.bottom });
    };

    const handlePointerLeave = () => {
        setTooltip(null);
    };
    
    const dayStr = formatDateForComparison(day);
    const ui = getAbsenceTypeUI(absence.type);

    const isTrueStart = absence.startDate === dayStr;
    
    const lastVisibleDayOfSpan = new Date(day);
    lastVisibleDayOfSpan.setDate(lastVisibleDayOfSpan.getDate() + daySpan - 1);
    const isTrueEnd = absence.endDate === formatDateForComparison(lastVisibleDayOfSpan);

    const isSingle = absence.startDate === absence.endDate;
    const isPending = absence.status === 'pending';
    const isHalfDay = absence.dayPortion && absence.dayPortion !== 'full';

    let pillStyle: React.CSSProperties = {
        width: `calc(${daySpan * 100}%)`,
        zIndex: 10,
    };
    
    let pillClasses = `absolute top-1/2 -translate-y-1/2 h-10 flex items-center justify-start text-sm font-bold px-2.5 transition-all duration-150 hover:shadow-lg hover:brightness-110 ${isPending ? `${ui.pendingClass} border border-dashed ${ui.pendingBorderClass}` : ui.solidClass}`;
    
    if (isSingle) {
        pillClasses += ' rounded-md';
        pillStyle.width = `calc(100% - 4px)`;
        pillStyle.left = '2px';
    } else {
        if (isTrueStart) {
            pillClasses += ' rounded-l-md';
        }
        if (isTrueEnd) {
            pillClasses += ' rounded-r-md';
        }
    }

    if (isHalfDay && isSingle) {
        if (absence.dayPortion === 'am') {
            pillStyle.clipPath = 'polygon(0 0, 100% 0, 0 100%)';
        } else { // pm
            pillStyle.clipPath = 'polygon(100% 0, 100% 100%, 0 100%)';
        }
    }

    return (
        <>
            <div className={pillClasses} style={pillStyle} onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave}>
                <div className="flex items-center gap-1.5 truncate pl-1">
                    {isPending && <div className={`w-2 h-2 rounded-full animate-pulse-dot ${ui.pendingBorderClass.replace('border-', 'bg-')}`}></div>}
                    <span className="truncate">{ui.title}</span>
                </div>
            </div>
            {tooltip && ReactDOM.createPortal(
                <div className="fixed z-[280] p-2 text-white bg-gray-800 rounded-md shadow-lg pointer-events-none" style={{ top: tooltip.y + 5, left: tooltip.x }}>
                    {tooltip.content}
                </div>,
                document.body
            )}
        </>
    );
};


const getWeekAndYear = (d: Date): { week: number, year: number } => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const year = d.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year,0,1));
    const weekNo = Math.ceil(( ( (d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    return { week: weekNo, year };
}

export const PlannerView: React.FC<PlannerViewProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'planner' | 'list'>('planner');
    const [viewMode, setViewMode] = useState<'period' | 'month'>('month');
    const todayForDefault = new Date();
    const [viewStartDate, setViewStartDate] = useState(() => new Date(todayForDefault.getFullYear(), todayForDefault.getMonth(), 1));
    const [viewEndDate, setViewEndDate] = useState(() => new Date(todayForDefault.getFullYear(), todayForDefault.getMonth() + 1, 0));
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [initialModalData, setInitialModalData] = useState<Partial<AbsenceFormData> | null>(null);
    const [approvalTarget, setApprovalTarget] = useState<AbsenceRequest | null>(null);
    const [adminComment, setAdminComment] = useState('');
    const today = useMemo(() => new Date(), []);
    const [isDisplayOptionsModalOpen, setIsDisplayOptionsModalOpen] = useState(false);
    const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);
    const [displayOptions, setDisplayOptions] = useState<{
        visibleEmployeeIds: number[];
    }>({
        visibleEmployeeIds: props.employees.map(e => e.id)
    });
    
    // Fullscreen & Landscape Logic
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLandscape, setIsLandscape] = useState(false);
    
    // For List View
    const [requestToDelete, setRequestToDelete] = useState<AbsenceRequest | null>(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
    const [actionTarget, setActionTarget] = useState<{ id: number; status: 'approved' | 'rejected' } | null>(null);
    const [openYears, setOpenYears] = useState<Set<string>>(() => new Set([new Date().getFullYear().toString()]));

    const toggleYear = (year: string) => {
        setOpenYears(prev => {
            const newSet = new Set(prev);
            if (newSet.has(year)) {
                newSet.delete(year);
            } else {
                newSet.add(year);
            }
            return newSet;
        });
    };

    const displayedEmployees = useMemo(() => {
        const visibleIds = new Set(displayOptions.visibleEmployeeIds);
        return props.employees
            .filter(emp => visibleIds.has(emp.id))
            .sort((a, b) => {
                const lastNameCompare = a.lastName.localeCompare(b.lastName);
                if (lastNameCompare !== 0) return lastNameCompare;
                return a.firstName.localeCompare(b.firstName);
            });
    }, [props.employees, displayOptions]);


    useEffect(() => {
        const startYear = viewStartDate.getFullYear();
        const endYear = viewEndDate.getFullYear();
        props.onEnsureHolidaysForYear(startYear);
        if (startYear !== endYear) props.onEnsureHolidaysForYear(endYear);
    }, [viewStartDate, viewEndDate, props.onEnsureHolidaysForYear]);

    const changePeriod = (offset: number) => {
        if (viewMode === 'month') {
            const newStartDate = new Date(viewStartDate);
            newStartDate.setMonth(newStartDate.getMonth() + offset);
            const newEndDate = new Date(newStartDate.getFullYear(), newStartDate.getMonth() + 1, 0);
            setViewStartDate(newStartDate);
            setViewEndDate(newEndDate);
        } else {
            const duration = (viewEndDate.getTime() - viewStartDate.getTime()) + (24 * 60 * 60 * 1000);
            const newStartDate = new Date(viewStartDate);
            newStartDate.setTime(newStartDate.getTime() + offset * duration);
            const newEndDate = new Date(viewEndDate);
            newEndDate.setTime(newEndDate.getTime() + offset * duration);
            setViewStartDate(newStartDate);
            setViewEndDate(newEndDate);
        }
    };
    
    const visibleDays = useMemo(() => {
        const days = [];
        let currentDate = new Date(viewStartDate);
        while (currentDate <= viewEndDate) {
            days.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return days;
    }, [viewStartDate, viewEndDate]);

    const getAbsenceForDay = (employeeId: number, day: Date) => {
        const dayString = formatDateForComparison(day);
        const reqs = props.absenceRequests.filter(r => r.employeeId === employeeId && dayString >= r.startDate && dayString <= r.endDate && r.status !== 'rejected');
        return reqs.find(r => r.status === 'pending') || reqs[0];
    };

    const handleOpenFormModal = (data: Partial<AbsenceFormData> | null = null) => { setInitialModalData(data); setIsFormModalOpen(true); };
    const handleCellClick = (employeeId: number, day: Date) => {
        const absence = getAbsenceForDay(employeeId, day);
        if (absence) {
            if (absence.status === 'pending') setApprovalTarget(absence);
            else handleOpenFormModal(absence);
        } else handleOpenFormModal({ employeeId, startDate: formatDateForComparison(day), endDate: formatDateForComparison(day) });
    };
    const handleSaveAbsence = (data: AbsenceFormData) => {
        if (data.id) props.onUpdateAbsenceRequest(data as AbsenceRequest);
        else props.addAbsenceRequest(data as Omit<AbsenceRequest, 'id' | 'status'>, 'approved');
        setIsFormModalOpen(false);
    };
    const handleDeleteAbsence = (id: number) => { props.onDeleteAbsenceRequest(id); setIsFormModalOpen(false); };
    const handleConfirmAction = (status: 'approved' | 'rejected') => {
        if (approvalTarget) {
            props.onUpdateRequestStatus(approvalTarget.id, status, adminComment.trim() || undefined);
            setApprovalTarget(null); setAdminComment('');
        }
    };
    
    // List logic
    const filteredRequests = useMemo(() => {
        return props.absenceRequests.filter(req => {
            const employeeMatch = selectedEmployeeId === 'all' || req.employeeId === Number(selectedEmployeeId);
            return employeeMatch;
        });
    }, [props.absenceRequests, selectedEmployeeId]);
    
    const pendingRequests = useMemo(() => filteredRequests.filter(r => r.status === 'pending').sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()), [filteredRequests]);
    
    const groupRequestsByYear = (requests: AbsenceRequest[]) => {
        const groups: { [year: string]: AbsenceRequest[] } = {};
        for (const req of requests) {
            const year = new Date(req.startDate).getFullYear().toString();
            if (!groups[year]) groups[year] = [];
            groups[year].push(req);
        }
        return groups;
    };

    const groupedApprovedRequests = useMemo(() => groupRequestsByYear(filteredRequests.filter(r => r.status === 'approved').sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())), [filteredRequests]);
    const groupedRejectedRequests = useMemo(() => groupRequestsByYear(filteredRequests.filter(r => r.status === 'rejected').sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())), [filteredRequests]);
    
    const sortedApprovedYears = useMemo(() => Object.keys(groupedApprovedRequests).sort((a, b) => Number(b) - Number(a)), [groupedApprovedRequests]);
    const sortedRejectedYears = useMemo(() => Object.keys(groupedRejectedRequests).sort((a, b) => Number(b) - Number(a)), [groupedRejectedRequests]);
    
    const employeeOptions = useMemo(() => [{ id: 'all', name: 'Alle Mitarbeiter' }, ...props.employees.map(e => ({ id: String(e.id), name: `${e.firstName} ${e.lastName}` }))], [props.employees]);
    const getEmployeeName = (employeeId: number) => { const e = props.employees.find(e => e.id === employeeId); return e ? `${e.firstName} ${e.lastName}` : 'Unbekannt'; };
    const getAbsenceLabel = (type: AbsenceType) => ({ [AbsenceType.Vacation]: 'Urlaubsantrag', [AbsenceType.SickLeave]: 'Krankmeldung', [AbsenceType.TimeOff]: 'Freizeitausgleich' })[type];
    const getStatusChip = (status: AbsenceRequest['status']) => { const classes = { pending: 'text-yellow-800 bg-yellow-200', approved: 'text-green-800 bg-green-200', rejected: 'text-red-800 bg-red-200' }; const text = { pending: 'Ausstehend', approved: 'Genehmigt', rejected: 'Abgelehnt' }; return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${classes[status]}`}>{text[status]}</span>; };
    const handleConfirmDelete = () => { if (requestToDelete) { props.onDeleteAbsenceRequest(requestToDelete.id); setRequestToDelete(null); } };
    const handleListConfirmAction = () => { if (actionTarget) { props.onUpdateRequestStatus(actionTarget.id, actionTarget.status, adminComment.trim() || undefined); setActionTarget(null); setAdminComment(''); } };

    const formatHeaderDate = () => {
        if (viewMode === 'month') {
            return viewStartDate.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
        }
        
        const start = viewStartDate;
        const end = viewEndDate;
        const startYear = start.getFullYear();
        const endYear = end.getFullYear();
        const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
        
        const startStr = start.toLocaleDateString('de-DE', { ...options, year: startYear !== endYear ? 'numeric' : undefined });
        const endStr = end.toLocaleDateString('de-DE', { ...options, year: 'numeric' });
        
        return `${startStr} - ${endStr}`;
    };

    const weeks = useMemo(() => {
        if (!visibleDays.length) return [];
        const weekGroups: { week: number; year: number; days: Date[] }[] = [];
        visibleDays.forEach(day => {
            const { week, year } = getWeekAndYear(day);
            let group = weekGroups.find(g => g.week === week && g.year === year);
            if (!group) {
                group = { week, year, days: [] };
                weekGroups.push(group);
            }
            group.days.push(day);
        });
        return weekGroups;
    }, [visibleDays]);
    
    const tabs = [
        { id: 'planner', label: 'Planer' },
        { id: 'list', label: 'Antragsliste', badge: pendingRequests.length },
    ];

    const renderRequestListForYear = (requests: AbsenceRequest[]) => (
        <div className="space-y-3 pt-4">
            {requests.map(req => {
                const dayPortionText = req.dayPortion === 'am' ? ' (Vormittags)' : req.dayPortion === 'pm' ? ' (Nachmittags)' : '';
                const dateText = req.startDate === req.endDate
                    ? `${new Date(req.startDate).toLocaleDateString('de-DE')}${dayPortionText}`
                    : `${new Date(req.startDate).toLocaleDateString('de-DE')} - ${new Date(req.endDate).toLocaleDateString('de-DE')}`;
                return (
                    <div key={req.id} className="p-3 bg-white rounded-lg border hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start gap-2">
                            <div>
                                <p className="font-semibold">{getAbsenceLabel(req.type)}</p>
                                {selectedEmployeeId === 'all' && <p className="text-sm text-gray-600">{getEmployeeName(req.employeeId)}</p>}
                                <p className="text-sm text-gray-600">{dateText}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setRequestToDelete(req)} className="p-2 text-gray-400 hover:text-red-600 opacity-50 hover:opacity-100 transition-opacity"><TrashIcon className="h-5 w-5"/></button>
                            </div>
                        </div>
                        {req.adminComment && <p className="mt-2 pt-2 border-t text-sm italic">"{req.adminComment}"</p>}
                    </div>
                );
            })}
        </div>
    );

    const renderPlannerTable = (isFullscreenContext = false) => (
        <>
            <div className={`flex justify-center items-center gap-2 sm:gap-4 mb-4 sticky left-0 right-0 ${isFullscreenContext ? 'pt-4' : ''}`}>
                <button onClick={() => changePeriod(-1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Vorheriger Zeitraum">
                    <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                </button>
                <button onClick={() => setIsDateRangeModalOpen(true)} className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors" title="Zeitraum anpassen">
                    <h2 className="text-lg font-bold text-gray-800 text-center">{formatHeaderDate()}</h2>
                    <CalendarDaysIcon className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
                </button>
                <button onClick={() => changePeriod(1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Nächster Zeitraum">
                    <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                </button>
                {!isFullscreenContext && (
                    <button onClick={() => setIsFullscreen(true)} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600" title="Vollbild">
                        <ArrowsPointingOutIcon className="h-5 w-5" />
                    </button>
                )}
            </div>
            <div className="overflow-x-auto min-h-[300px]">
                <table className="min-w-full border-collapse table-fixed">
                    <thead className="sticky top-0 bg-white z-10 shadow-sm">
                            <tr>
                            <th rowSpan={2} className="sticky left-0 bg-white border-b border-r border-gray-200 w-48 z-20 align-middle">
                                <button onClick={() => setIsDisplayOptionsModalOpen(true)} className="w-full flex items-center justify-between text-left text-base font-semibold group py-3 px-2 hover:bg-gray-50 transition-colors">
                                    <span>Mitarbeiter</span>
                                    <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                </button>
                            </th>
                            {weeks.map(week => (
                                <th key={`${week.year}-${week.week}`} colSpan={week.days.length} className="py-2 px-1 border-b border-l border-gray-200 text-center text-sm font-semibold text-gray-700">
                                    KW {week.week}
                                </th>
                            ))}
                        </tr>
                        <tr>
                            {visibleDays.map(day => {
                                const dayStr = formatDateForComparison(day);
                                const holiday = props.holidaysByYear[day.getFullYear()]?.find(h => h.date === dayStr);
                                const dayOfWeek = day.getDay();
                                const isSaturday = dayOfWeek === 6;
                                const isSundayOrHoliday = holiday || dayOfWeek === 0;
                                const isToday = day.toDateString() === today.toDateString();
                                return (
                                    <th key={day.toISOString()} className={`w-16 py-2 px-1 border-b border-l border-gray-200 text-center text-xs relative ${isToday ? 'bg-blue-50' : isSundayOrHoliday ? 'bg-red-50' : isSaturday ? 'bg-gray-100' : 'bg-white'}`} title={holiday?.name}>
                                        <div className={`font-normal ${isToday ? 'text-blue-600' : isSundayOrHoliday ? 'text-red-500' : 'text-gray-500'}`}>{day.toLocaleString('de-DE', { weekday: 'short' }).slice(0, 2)}</div>
                                        <div className={`font-semibold text-base mt-1 ${isToday ? 'text-blue-700' : isSundayOrHoliday ? 'text-red-600' : 'text-gray-600'}`}>{day.getDate()}</div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {displayedEmployees.map(employee => {
                            const absenceSpans: { day: Date, absence: AbsenceRequest, span: number }[] = [];
                            const processedAbsenceDays = new Set<string>();

                            visibleDays.forEach((day, index) => {
                                const dayString = formatDateForComparison(day);
                                if (processedAbsenceDays.has(dayString)) return;

                                const absence = getAbsenceForDay(employee.id, day);
                                if (absence) {
                                    let span = 1;
                                    processedAbsenceDays.add(dayString);
                                    for (let i = index + 1; i < visibleDays.length; i++) {
                                        const nextDay = visibleDays[i];
                                        if (formatDateForComparison(nextDay) > absence.endDate) break;
                                        
                                        const nextDayAbsence = getAbsenceForDay(employee.id, nextDay);
                                        if (nextDayAbsence && nextDayAbsence.id === absence.id) {
                                            span++;
                                            processedAbsenceDays.add(formatDateForComparison(nextDay));
                                        } else {
                                            break;
                                        }
                                    }
                                    absenceSpans.push({ day, absence, span });
                                }
                            });

                            return (
                                <tr key={employee.id} className="border-b border-gray-200 last:border-b-0">
                                    <td className="sticky left-0 bg-white py-2 px-2 border-r border-gray-200 text-base font-normal whitespace-nowrap w-48 z-10">{employee.firstName} {employee.lastName}</td>
                                    {visibleDays.map(day => {
                                        const absenceSpan = absenceSpans.find(s => formatDateForComparison(s.day) === formatDateForComparison(day));
                                        const absence = getAbsenceForDay(employee.id, day);
                                        
                                        const dayOfWeek = day.getDay();
                                        const isSaturday = dayOfWeek === 6;
                                        const isSundayOrHoliday = props.holidaysByYear[day.getFullYear()]?.find(h => h.date === formatDateForComparison(day)) || dayOfWeek === 0;
                                        const isToday = day.toDateString() === today.toDateString();
                                        return (
                                            <td 
                                                key={day.toISOString()} 
                                                className={`border-l border-gray-200 h-16 relative p-0 cursor-pointer ${!absence ? 'hover:bg-blue-50/30 group' : ''} ${isToday ? 'bg-blue-50' : isSundayOrHoliday ? 'bg-red-50' : isSaturday ? 'bg-gray-100' : 'bg-white'}`} 
                                                onClick={() => handleCellClick(employee.id, day)}
                                            >
                                                {absenceSpan && <AbsencePillWithTooltip absence={absenceSpan.absence} day={absenceSpan.day} daySpan={absenceSpan.span} />}
                                                {!absence && (
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                                        <PlusIcon className="h-4 w-4 text-gray-500" />
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {displayedEmployees.length === 0 && <div className="text-center py-10 text-gray-500">Keine Mitarbeiter für die ausgewählten Filter gefunden.</div>}
            </div>
        </>
    );

    const FullscreenPlanner = () => ReactDOM.createPortal(
        <div className="fixed inset-0 z-[200] bg-white flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-2 border-b bg-gray-50 shrink-0 z-50 shadow-sm">
                <h2 className="text-sm font-bold text-gray-700 pl-2">Vollbild-Planer</h2>
                <div className="flex gap-2">
                    <Button onClick={() => setIsLandscape(!isLandscape)} className={`text-xs px-3 py-1 flex items-center gap-1 ${isLandscape ? 'bg-blue-100 text-blue-800' : 'bg-white text-gray-700 border border-gray-300'}`}>
                        <DevicePhoneMobileIcon className={`h-4 w-4 ${isLandscape ? 'rotate-90' : ''}`} />
                        <span>{isLandscape ? 'Zurückdrehen' : 'Drehen'}</span>
                    </Button>
                    <Button onClick={() => { setIsFullscreen(false); setIsLandscape(false); }} className="text-xs px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white flex items-center gap-1">
                        <ArrowsPointingInIcon className="h-4 w-4" />
                        <span>Schließen</span>
                    </Button>
                </div>
            </div>
            
            <div className="relative flex-grow w-full h-full bg-gray-100 overflow-hidden">
                <div className={`
                    bg-white shadow-lg p-2 transition-all duration-300
                    ${isLandscape
                        ? 'absolute top-0 left-0 w-[100vh] h-[100vw] origin-top-left rotate-90 translate-x-[100vw] overflow-auto'
                        : 'w-full h-full overflow-auto'
                    }
                `}>
                    {renderPlannerTable(true)}
                </div>
            </div>
        </div>,
        document.body
    );

    return (
        <div className="space-y-6">
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
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base flex items-center`}
                            aria-current={activeTab === tab.id ? 'page' : undefined}
                        >
                            {tab.label}
                            {tab.badge !== undefined && tab.badge > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'planner' && (
                <div className="animate-fade-in">
                    <Card>
                        {renderPlannerTable(false)}
                    </Card>
                </div>
            )}

            {isFullscreen && <FullscreenPlanner />}

            {activeTab === 'list' && (
                <div className="animate-fade-in">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                        <h3 className="text-xl font-bold">Antragsliste</h3>
                        <div className="w-full sm:w-auto sm:max-w-xs">
                            <SelectorButton label="Mitarbeiter filtern" value={employeeOptions.find(opt => opt.id === selectedEmployeeId)?.name || ''} onClick={() => setIsEmployeeModalOpen(true)} placeholder="Auswählen..." />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* ... (List view content remains same) ... */}
                        <div className="bg-gray-50 rounded-lg p-4 h-full">
                            <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                                Offen
                                {pendingRequests.length > 0 && (
                                    <span className="bg-yellow-200 text-yellow-800 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                        {pendingRequests.length}
                                    </span>
                                )}
                            </h4>
                            <div className="space-y-4">
                                {pendingRequests.length > 0 ? (
                                    pendingRequests.map(req => {
                                        const dayPortionText = req.dayPortion === 'am' ? ' (Vormittags)' : req.dayPortion === 'pm' ? ' (Nachmittags)' : '';
                                        const dateText = req.startDate === req.endDate
                                            ? `${new Date(req.startDate).toLocaleDateString('de-DE')}${dayPortionText}`
                                            : `${new Date(req.startDate).toLocaleDateString('de-DE')} - ${new Date(req.endDate).toLocaleDateString('de-DE')}`;
                                        return (
                                            <div key={req.id} className="p-4 bg-white rounded-lg border shadow-sm">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-bold">{getAbsenceLabel(req.type)}</p>
                                                        {selectedEmployeeId === 'all' && <p className="text-sm">{getEmployeeName(req.employeeId)}</p>}
                                                        <p className="text-sm">{dateText}</p>
                                                    </div>
                                                    {getStatusChip(req.status)}
                                                </div>
                                                <div className="flex gap-4 mt-4 pt-4 border-t">
                                                    <Button onClick={() => setActionTarget({ id: req.id, status: 'rejected' })} className="w-full bg-red-600 hover:bg-red-700">Ablehnen</Button>
                                                    <Button onClick={() => setActionTarget({ id: req.id, status: 'approved' })} className="w-full bg-green-600 hover:bg-green-700">Genehmigen</Button>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-4 bg-white/50 rounded-lg border border-dashed">
                                        <p className="text-center text-gray-500 py-8">Keine offenen Anträge.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Column 2: Approved */}
                        <div className="bg-gray-50 rounded-lg p-4 h-full">
                             <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">Genehmigt</h4>
                             <div className="space-y-3">
                                {sortedApprovedYears.length > 0 ? (
                                    sortedApprovedYears.map(year => (
                                        <div key={year}>
                                            <button 
                                                onClick={() => toggleYear(year)} 
                                                className="w-full flex justify-between items-center p-2 rounded-md hover:bg-gray-200/50"
                                                aria-expanded={openYears.has(year)}
                                                aria-controls={`approved-${year}`}
                                            >
                                                <h5 className="font-bold text-gray-700">{year}</h5>
                                                <ChevronDownIcon className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${openYears.has(year) ? 'rotate-180' : ''}`} />
                                            </button>
                                            <div id={`approved-${year}`} className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${openYears.has(year) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                <div className="overflow-hidden">
                                                    {renderRequestListForYear(groupedApprovedRequests[year])}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 bg-white/50 rounded-lg border border-dashed">
                                        <p className="text-center text-gray-500 py-8">Keine genehmigten Anträge.</p>
                                    </div>
                                )}
                             </div>
                        </div>

                        {/* Column 3: Rejected */}
                        <div className="bg-gray-50 rounded-lg p-4 h-full">
                             <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">Abgelehnt</h4>
                             <div className="space-y-3">
                                {sortedRejectedYears.length > 0 ? (
                                    sortedRejectedYears.map(year => (
                                        <div key={year}>
                                            <button 
                                                onClick={() => toggleYear(year)} 
                                                className="w-full flex justify-between items-center p-2 rounded-md hover:bg-gray-200/50"
                                                aria-expanded={openYears.has(year)}
                                                aria-controls={`rejected-${year}`}
                                            >
                                                <h5 className="font-bold text-gray-700">{year}</h5>
                                                <ChevronDownIcon className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${openYears.has(year) ? 'rotate-180' : ''}`} />
                                            </button>
                                            <div id={`rejected-${year}`} className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${openYears.has(year) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                <div className="overflow-hidden">
                                                    {renderRequestListForYear(groupedRejectedRequests[year])}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 bg-white/50 rounded-lg border border-dashed">
                                        <p className="text-center text-gray-500 py-8">Keine abgelehnten Anträge.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <AbsenceFormModal 
                isOpen={isFormModalOpen} 
                onClose={() => setIsFormModalOpen(false)} 
                onSave={handleSaveAbsence} 
                onDelete={handleDeleteAbsence} 
                employees={props.employees} 
                initialData={initialModalData} 
                allAbsenceRequests={props.absenceRequests}
                allTimeEntries={props.timeEntries}
                companySettings={props.companySettings}
                isRotated={isLandscape}
            />
            
            {approvalTarget && (
                <div className={`fixed z-[250] bg-black bg-opacity-60 flex items-center justify-center p-4 ${
                    isLandscape 
                    ? 'top-0 left-0 w-[100vh] h-[100vw] origin-top-left rotate-90 translate-x-[100vw]' 
                    : 'inset-0'
                }`} onClick={() => setApprovalTarget(null)}>
                    <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Antrag prüfen</h2><button onClick={() => setApprovalTarget(null)}><XIcon className="h-6 w-6" /></button></div>
                        <div className="space-y-2 text-sm border-t pt-4">
                           <p><strong>Mitarbeiter:</strong> {getEmployeeName(approvalTarget.employeeId)}</p>
                           <p><strong>Typ:</strong> {getAbsenceTypeUI(approvalTarget.type).title}</p>
                           <p><strong>Zeitraum:</strong> {approvalTarget.startDate === approvalTarget.endDate ? `${new Date(approvalTarget.startDate).toLocaleDateString('de-DE')}${approvalTarget.dayPortion === 'am' ? ' (Vormittags)' : approvalTarget.dayPortion === 'pm' ? ' (Nachmittags)' : ''}` : `${new Date(approvalTarget.startDate).toLocaleDateString('de-DE')} - ${new Date(approvalTarget.endDate).toLocaleDateString('de-DE')}`}</p>
                        </div>
                        <div className="mt-4 space-y-2"><label className="block text-sm font-medium">Kommentar (optional)</label><textarea rows={3} className="w-full p-2 border rounded-md" value={adminComment} onChange={(e) => setAdminComment(e.target.value)} placeholder="Grund für die Entscheidung..." /></div>
                        <div className="flex gap-4 pt-4 border-t mt-4 justify-end">
                            <Button onClick={() => handleConfirmAction('rejected')} className="bg-red-600 hover:bg-red-700">Ablehnen</Button>
                            <Button onClick={() => handleConfirmAction('approved')} className="bg-green-600 hover:bg-green-700">Genehmigen</Button>
                        </div>
                    </Card>
                </div>
            )}
            
            {actionTarget && (<div className={`fixed z-[250] bg-black bg-opacity-60 flex items-center justify-center p-4 ${
                    isLandscape 
                    ? 'top-0 left-0 w-[100vh] h-[100vw] origin-top-left rotate-90 translate-x-[100vw]' 
                    : 'inset-0'
                }`} onClick={() => { setActionTarget(null); setAdminComment(''); }}><Card className="w-full max-w-md" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Antrag {actionTarget.status === 'approved' ? 'genehmigen' : 'ablehnen'}</h2><button onClick={() => { setActionTarget(null); setAdminComment(''); }}><XIcon className="h-6 w-6" /></button></div><div><textarea rows={3} className="w-full p-2 border rounded-md" value={adminComment} onChange={e => setAdminComment(e.target.value)} placeholder="Kommentar (optional)..." /></div><div className="flex gap-4 pt-4 justify-end"><Button onClick={handleListConfirmAction} className={`${actionTarget.status === 'approved' ? 'bg-green-600' : 'bg-red-600'}`}>{actionTarget.status === 'approved' ? 'Genehmigen' : 'Ablehnen'}</Button></div></Card></div>)}
            <ConfirmModal isOpen={!!requestToDelete} onClose={() => setRequestToDelete(null)} onConfirm={handleConfirmDelete} title="Antrag löschen" message={`Möchten Sie den Antrag von ${getEmployeeName(requestToDelete?.employeeId || 0)} wirklich löschen?`} confirmText="Ja, löschen" isRotated={isLandscape} />
            <SelectionModal isOpen={isEmployeeModalOpen} onClose={() => setIsEmployeeModalOpen(false)} onSelect={item => setSelectedEmployeeId(item.id)} items={employeeOptions} title="Mitarbeiter auswählen" selectedValue={selectedEmployeeId} isRotated={isLandscape} />
            <PlannerDisplayOptionsModal
                isOpen={isDisplayOptionsModalOpen}
                onClose={() => setIsDisplayOptionsModalOpen(false)}
                onApply={setDisplayOptions}
                employees={props.employees}
                currentOptions={displayOptions}
                isRotated={isLandscape}
            />
            <PlannerDateRangeModal
                isOpen={isDateRangeModalOpen}
                onClose={() => setIsDateRangeModalOpen(false)}
                onApply={(start, end, preset) => {
                    setViewStartDate(start); 
                    setViewEndDate(end); 
                    setViewMode(preset === 'month' ? 'month' : 'period');
                }}
                currentStartDate={viewStartDate}
                currentEndDate={viewEndDate}
                isRotated={isLandscape}
            />
        </div>
    );
};