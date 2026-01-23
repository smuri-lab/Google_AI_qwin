import React, { useState, useMemo, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import type { TimeEntry, AbsenceRequest, Customer, Activity, Holiday, CompanySettings, HolidaysByYear, Employee } from '../types';
import { AbsenceType } from '../types';
import { EntryDetailModal } from './EntryDetailModal';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ConfirmModal } from './ui/ConfirmModal';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { PlusIcon } from './icons/PlusIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface CalendarViewProps {
  currentUser: Employee;
  timeEntries: TimeEntry[];
  absenceRequests: AbsenceRequest[];
  customers: Customer[];
  activities: Activity[];
  holidaysByYear: HolidaysByYear;
  onUpdateTimeEntry: (entry: TimeEntry) => void;
  onDeleteTimeEntry: (id: number) => void;
  companySettings: CompanySettings;
  onEnsureHolidaysForYear: (year: number) => void;
  onRetractAbsenceRequest: (id: number) => void;
  onAddAbsenceClick: () => void;
}

// --- Static Constants & Helpers (Zero Allocation) ---

const ABSENCE_STYLES = {
    [AbsenceType.Vacation]: {
        label: 'Urlaub',
        solidClass: 'bg-blue-500 text-white',
        pendingClass: 'bg-blue-100 text-blue-700',
        pendingBorderClass: 'border-blue-400',
        dotClass: 'bg-blue-500',
        bgClass: 'bg-blue-50',
        borderClass: 'border-blue-200',
        textClass: 'text-blue-800'
    },
    [AbsenceType.SickLeave]: {
        label: 'Krank',
        solidClass: 'bg-orange-500 text-white',
        pendingClass: 'bg-orange-100 text-orange-700',
        pendingBorderClass: 'border-orange-400',
        dotClass: 'bg-orange-500',
        bgClass: 'bg-orange-50',
        borderClass: 'border-orange-200',
        textClass: 'text-orange-800'
    },
    [AbsenceType.TimeOff]: {
        label: 'Frei',
        solidClass: 'bg-green-500 text-white',
        pendingClass: 'bg-green-100 text-green-700',
        pendingBorderClass: 'border-green-400',
        dotClass: 'bg-green-500',
        bgClass: 'bg-green-50',
        borderClass: 'border-green-200',
        textClass: 'text-green-800'
    }
};

const DEFAULT_ABSENCE_STYLE = {
    label: 'Abwesenheit',
    solidClass: 'bg-gray-500 text-white',
    pendingClass: 'bg-gray-100',
    pendingBorderClass: 'border-gray-400',
    dotClass: 'bg-gray-500',
    bgClass: 'bg-gray-50',
    borderClass: 'border-gray-200',
    textClass: 'text-gray-800'
};

const getAbsenceStyle = (type: AbsenceType) => ABSENCE_STYLES[type] || DEFAULT_ABSENCE_STYLE;

// Faster than toLocaleDateString in loops
const toISODate = (d: Date): string => {
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${year}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`;
};

const DayOfWeekHeader: React.FC = React.memo(() => {
    const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    return (
        <div className="grid grid-cols-7 text-center font-semibold text-gray-500 text-xs">
            {days.map(day => (
                <div key={day} className="py-2">{day}</div>
            ))}
        </div>
    );
});

const getStatusChip = (status: AbsenceRequest['status']) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-200 rounded-full">Ausstehend</span>;
      case 'approved': return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">Genehmigt</span>;
      case 'rejected': return <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 rounded-full">Abgelehnt</span>;
    }
};

// -- Optimized Day Component --
interface CalendarDayProps {
    dayNum: number;
    dateString: string;
    isCurrentMonth: boolean;
    isSelected: boolean;
    isToday: boolean;
    hasEntry: boolean;
    absenceType?: AbsenceType;
    absenceStatus?: 'pending' | 'approved' | 'rejected';
    absenceStart?: string;
    absenceEnd?: string;
    absenceDayPortion?: 'full' | 'am' | 'pm';
    isHoliday: boolean;
    isSunday: boolean;
    onSelect: (dateString: string) => void;
}

const CalendarDay: React.FC<CalendarDayProps> = React.memo(({ 
    dayNum, dateString, isCurrentMonth, isSelected, isToday, 
    hasEntry, absenceType, absenceStatus, absenceStart, absenceEnd, absenceDayPortion,
    isHoliday, isSunday, onSelect 
}) => {
    
    // Compute container classes
    let containerClasses = 'relative h-12 flex items-center justify-center transition-colors duration-200';
    if (isCurrentMonth) containerClasses += ' cursor-pointer';
    if (isCurrentMonth && !isSelected) containerClasses += ' rounded-lg hover:bg-gray-100';
    if (isCurrentMonth && isToday && !isSelected) containerClasses += ' bg-gray-50';
    if (isSelected) containerClasses += ' ring-2 ring-blue-400 z-10 rounded-lg';

    // Compute number classes
    let numberClasses = 'flex items-center justify-center w-7 h-7 rounded-full text-center font-medium text-sm transition-all z-10';
    
    if (isSelected) {
        numberClasses += ' bg-blue-600 text-white';
    } else if (!isCurrentMonth) {
        numberClasses += ' text-gray-400';
    } else if (isToday) {
        numberClasses += ' text-blue-600 font-bold';
    } else if (isHoliday || isSunday) {
        numberClasses += ' text-red-600 font-semibold';
    } else {
        numberClasses += ' text-gray-700';
    }

    // REMOVED backdrop-blur-sm -> HUGE Performance killer on mobile
    if (absenceType) {
        if (hasEntry) { numberClasses += ' bg-white/90 border border-gray-200 shadow-sm'; } 
        else if (absenceStatus === 'approved') { numberClasses += ' text-white'; }
    }

    const handleDayClick = () => {
        if (isCurrentMonth) {
            onSelect(dateString);
        }
    };

    return (
        <div onClick={handleDayClick} className={containerClasses}>
            {absenceType && (() => {
                const ui = getAbsenceStyle(absenceType);
                const isStart = absenceStart === dateString;
                const isEnd = absenceEnd === dateString;
                const isSingle = isStart && isEnd;
                const isPending = absenceStatus === 'pending';
                const isHalfDay = absenceDayPortion && absenceDayPortion !== 'full';
                
                let pillStyle: React.CSSProperties = {};
                let pillClasses = `absolute top-1/2 -translate-y-1/2 left-0 right-0 h-8 flex items-center justify-center text-xs font-bold z-0 `;
                
                if (isPending) {
                    pillClasses += `${ui.pendingClass} border-dashed ${ui.pendingBorderClass}`;
                    if (isSingle) { pillClasses += ' border-2 rounded-lg mx-0.5'; } 
                    else { pillClasses += ' border-y-2'; if (isStart) pillClasses += ' border-l-2 rounded-l-lg justify-start pl-2'; if (isEnd) pillClasses += ' border-r-2 rounded-r-lg'; }
                } else {
                    pillClasses += `${ui.solidClass}`;
                    if (isSingle) { pillClasses += ' rounded-lg mx-0.5'; } 
                    else if (isStart) { pillClasses += ' rounded-l-lg justify-start pl-2'; } 
                    else if (isEnd) { pillClasses += ' rounded-r-lg'; }
                }
                if (isHalfDay && isSingle) {
                    if (absenceDayPortion === 'am') pillStyle.clipPath = 'polygon(0 0, 100% 0, 0 100%)';
                    else pillStyle.clipPath = 'polygon(100% 0, 100% 100%, 0 100%)';
                }
                return <div style={pillStyle} className={pillClasses}></div>;
            })()}
            <span className={numberClasses}>{dayNum}</span>
            <div className="absolute bottom-1 flex items-center justify-center space-x-1 h-1.5">
                {hasEntry && !absenceType && <div className={`w-1.5 h-1.5 bg-green-500 rounded-full`}></div>}
            </div>
        </div>
    );
}, (prev, next) => {
    return prev.dateString === next.dateString &&
           prev.isCurrentMonth === next.isCurrentMonth &&
           prev.isSelected === next.isSelected &&
           prev.isToday === next.isToday &&
           prev.hasEntry === next.hasEntry &&
           prev.absenceType === next.absenceType &&
           prev.absenceStatus === next.absenceStatus &&
           prev.absenceStart === next.absenceStart &&
           prev.absenceEnd === next.absenceEnd &&
           prev.isHoliday === next.isHoliday;
});

// -- Optimized Month Grid Component --
interface CalendarMonthGridProps {
    dateForMonth: Date;
    selectedDateString: string | null;
    entriesMap: Map<string, TimeEntry[]>;
    absencesMap: Map<string, AbsenceRequest>;
    holidaysMap: Map<string, Holiday>;
    onSelectDate: (dateString: string) => void;
    todayString: string;
}

const CalendarMonthGrid: React.FC<CalendarMonthGridProps> = React.memo(({ dateForMonth, selectedDateString, entriesMap, absencesMap, holidaysMap, onSelectDate, todayString }) => {
    
    // Generate dates in a stable way
    const daysData = useMemo(() => {
        const year = dateForMonth.getFullYear();
        const month = dateForMonth.getMonth();
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0);
        const days = [];
        const startDayOfWeek = (startOfMonth.getDay() + 6) % 7;
        const prevMonthEndDate = new Date(year, month, 0);
        
        // Prev Month filler
        for (let i = startDayOfWeek; i > 0; i--) {
            const d = new Date(year, month - 1, prevMonthEndDate.getDate() - i + 1);
            days.push({ date: d, isCurrent: false });
        }
        // Current Month
        for (let i = 1; i <= endOfMonth.getDate(); i++) {
            const d = new Date(year, month, i);
            days.push({ date: d, isCurrent: true });
        }
        // Next Month filler
        const totalCells = 42;
        let nextDay = 1;
        while (days.length < totalCells) {
            const d = new Date(year, month + 1, nextDay++);
            days.push({ date: d, isCurrent: false });
        }
        return days;
    }, [dateForMonth.getFullYear(), dateForMonth.getMonth()]);

    return (
        <div className="w-1/3 shrink-0 px-1" style={{ contain: 'content' }}>
            <DayOfWeekHeader />
            <div className="grid grid-cols-7">
                {daysData.map((dayItem, index) => {
                    const dateStr = toISODate(dayItem.date);
                    
                    const hasEntry = !dayItem.isCurrent ? false : entriesMap.has(dateStr);
                    const absence = !dayItem.isCurrent ? undefined : absencesMap.get(dateStr);
                    const isHoliday = !!holidaysMap.get(dateStr);
                    
                    const isSelected = !dayItem.isCurrent ? false : selectedDateString === dateStr;
                    const isToday = dateStr === todayString;
                    const isSunday = dayItem.date.getDay() === 0;

                    return (
                        <CalendarDay 
                            key={index}
                            dayNum={dayItem.date.getDate()}
                            dateString={dateStr}
                            isCurrentMonth={dayItem.isCurrent}
                            isSelected={isSelected}
                            isToday={isToday}
                            hasEntry={hasEntry}
                            absenceType={absence?.type}
                            absenceStatus={absence?.status}
                            absenceStart={absence?.startDate}
                            absenceEnd={absence?.endDate}
                            absenceDayPortion={absence?.dayPortion}
                            isHoliday={isHoliday}
                            isSunday={isSunday}
                            onSelect={onSelectDate}
                        />
                    );
                })}
            </div>
        </div>
    );
});


export const CalendarView: React.FC<CalendarViewProps> = (props) => {
  const { 
    currentUser, timeEntries, absenceRequests, customers, activities,
    holidaysByYear, onUpdateTimeEntry, onDeleteTimeEntry, companySettings,
    onEnsureHolidaysForYear, onRetractAbsenceRequest, onAddAbsenceClick
  } = props;
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [selectedDateString, setSelectedDateString] = useState<string | null>(null);
  const [requestToRetract, setRequestToRetract] = useState<AbsenceRequest | null>(null);
  const [isRequestsExpanded, setIsRequestsExpanded] = useState(false);
  const entriesListRef = useRef<HTMLDivElement>(null);
  
  const swipeContainerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null); 
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0); 
  const isSwiping = useRef(false);
  const animationFrameId = useRef<number | null>(null);
  const isLocked = useRef(false);
  
  const VELOCITY_THRESHOLD = 0.3; 
  const todayString = useMemo(() => toISODate(new Date()), []);

  useEffect(() => {
    const yearsToEnsure = new Set([currentDate.getFullYear()]);
    if (currentDate.getMonth() === 0) yearsToEnsure.add(currentDate.getFullYear() - 1);
    if (currentDate.getMonth() === 11) yearsToEnsure.add(currentDate.getFullYear() + 1);
    yearsToEnsure.forEach(year => onEnsureHolidaysForYear(year));
  }, [currentDate, onEnsureHolidaysForYear]);

  // Visual Reset Layout Effect
  useLayoutEffect(() => {
      if (sliderRef.current) {
          sliderRef.current.style.transition = 'none';
          sliderRef.current.style.transform = 'translateX(-33.333333%)';
          isLocked.current = false;
      }
  }, [currentDate]);

  const selectedEntry = useMemo(() => {
    return selectedEntryId ? timeEntries.find(e => e.id === selectedEntryId) : null;
  }, [selectedEntryId, timeEntries]);

  // --- OPTIMIZED MAP GENERATION ---
  const { entriesMap, absencesMap, holidaysMap } = useMemo(() => {
      const eMap = new Map<string, TimeEntry[]>();
      timeEntries.forEach(entry => {
          const dateStr = toISODate(new Date(entry.start));
          if (!eMap.has(dateStr)) eMap.set(dateStr, []);
          eMap.get(dateStr)!.push(entry);
      });

      const aMap = new Map<string, AbsenceRequest>();
      absenceRequests.forEach(req => {
          if (req.status === 'rejected') return;
          
          let loopDate = new Date(req.startDate);
          const endDate = new Date(req.endDate);
          
          while (loopDate <= endDate) {
              const dateStr = toISODate(loopDate);
              const existing = aMap.get(dateStr);
              if (!existing || (existing.status === 'approved' && req.status === 'pending')) {
                  aMap.set(dateStr, req);
              }
              loopDate.setDate(loopDate.getDate() + 1);
          }
      });

      const hMap = new Map<string, Holiday>();
      (Object.values(holidaysByYear).flat() as Holiday[]).forEach(h => {
          hMap.set(h.date, h);
      });

      return { entriesMap: eMap, absencesMap: aMap, holidaysMap: hMap };
  }, [timeEntries, absenceRequests, holidaysByYear]);

  const changeMonth = useCallback((offset: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    setSelectedDateString(null);
  }, []);
  
  const handleCloseModal = () => setSelectedEntryId(null);
  const handleConfirmRetract = () => {
    if (requestToRetract) {
      onRetractAbsenceRequest(requestToRetract.id);
      setRequestToRetract(null);
    }
  };

  // --- TOUCH HANDLERS ---
  useEffect(() => {
    const node = swipeContainerRef.current;
    const slider = sliderRef.current;
    if (!node || !slider) return;

    const handleTouchStart = (e: TouchEvent) => {
        if (isLocked.current) return;
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        touchStartTime.current = Date.now();
        isSwiping.current = false;
        slider.style.transition = 'none';
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (isLocked.current || touchStartX.current === null || touchStartY.current === null) return;
        
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const deltaX = currentX - touchStartX.current;
        const deltaY = currentY - touchStartY.current;

        if (!isSwiping.current) {
            // More aggressive vertical scroll detection
            if (Math.abs(deltaY) > Math.abs(deltaX)) {
                touchStartX.current = null;
                return;
            }
            if (Math.abs(deltaX) > 10) {
                isSwiping.current = true;
            }
        }
        
        if (isSwiping.current) {
            if (e.cancelable) e.preventDefault(); 
            
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = requestAnimationFrame(() => {
                slider.style.transform = `translateX(calc(-33.333333% + ${deltaX}px)) translateZ(0)`;
            });
        }
    };

    const handleTouchEnd = (e: TouchEvent) => {
        if (!isSwiping.current || touchStartX.current === null) {
            touchStartX.current = null;
            return;
        }

        const currentX = e.changedTouches[0].clientX;
        const deltaX = currentX - touchStartX.current;
        
        const touchEndTime = Date.now();
        const timeElapsed = touchEndTime - touchStartTime.current;
        const width = node.offsetWidth;
        
        const velocity = Math.abs(deltaX) / timeElapsed;
        const isFastSwipe = velocity > VELOCITY_THRESHOLD && Math.abs(deltaX) > 20;
        const isLongSwipe = Math.abs(deltaX) > (width * 0.25);

        isLocked.current = true;

        let targetPercent = -33.333333; 
        let monthChange = 0;

        if ((isFastSwipe || isLongSwipe) && deltaX > 0) {
            targetPercent = 0; 
            monthChange = -1;
        } else if ((isFastSwipe || isLongSwipe) && deltaX < 0) {
            targetPercent = -66.666666; 
            monthChange = 1;
        }

        slider.style.transition = 'transform 250ms cubic-bezier(0.1, 0.9, 0.2, 1)';
        slider.style.transform = `translateX(${targetPercent}%) translateZ(0)`;

        // Safety unlock incase transitionend misses
        const safetyUnlock = setTimeout(() => {
             if (isLocked.current) {
                 isLocked.current = false;
                 if (monthChange === 0 && slider) {
                     slider.style.transition = 'none';
                     slider.style.transform = 'translateX(-33.333333%) translateZ(0)';
                 }
             }
        }, 350);

        const handleTransitionEnd = (evt: TransitionEvent) => {
            if (evt.target !== slider || evt.propertyName !== 'transform') return;
            clearTimeout(safetyUnlock);

            if (monthChange !== 0) {
                // CRITICAL FIX: setTimeout(..., 10)
                // Detach the heavy React state update (Rendering 126 components) from the 
                // visual animation finish event. This allows the browser to 'rest' for a frame,
                // finish the composite, and prevents the 'stutter' where the animation freezes 
                // at the very end.
                setTimeout(() => {
                    changeMonth(monthChange);
                }, 10);
            } else {
                if (sliderRef.current) {
                    sliderRef.current.style.transition = 'none';
                    sliderRef.current.style.transform = 'translateX(-33.333333%) translateZ(0)';
                    isLocked.current = false;
                }
            }
            slider.removeEventListener('transitionend', handleTransitionEnd as EventListener);
        };
        
        slider.addEventListener('transitionend', handleTransitionEnd as EventListener);

        touchStartX.current = null;
        isSwiping.current = false;
    };

    node.addEventListener('touchstart', handleTouchStart, { passive: true });
    node.addEventListener('touchmove', handleTouchMove, { passive: false });
    node.addEventListener('touchend', handleTouchEnd);
    node.addEventListener('touchcancel', handleTouchEnd);

    return () => {
        node.removeEventListener('touchstart', handleTouchStart);
        node.removeEventListener('touchmove', handleTouchMove);
        node.removeEventListener('touchend', handleTouchEnd);
        node.removeEventListener('touchcancel', handleTouchEnd);
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [changeMonth]);

  const prevMonthDate = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1), [currentDate]);
  const nextMonthDate = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1), [currentDate]);

  const entriesForSelectedDay = useMemo(() => selectedDateString ? (entriesMap.get(selectedDateString) || []).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()) : [], [selectedDateString, entriesMap]);
  const absenceForSelectedDay = useMemo(() => selectedDateString ? absencesMap.get(selectedDateString) : undefined, [selectedDateString, absencesMap]);
  
  const absencesForSelectedDayList = useMemo(() => {
      if (!absenceForSelectedDay || absenceForSelectedDay.status !== 'approved') return [];
      return [absenceForSelectedDay];
  }, [absenceForSelectedDay]);
  
  const holidayForSelectedDay = useMemo(() => selectedDateString ? holidaysMap.get(selectedDateString) : null, [selectedDateString, holidaysMap]);

  const groupedRequests = useMemo(() => {
    const groups: { [year: string]: AbsenceRequest[] } = {};
    const sortedRequests = [...absenceRequests].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    for (const req of sortedRequests) {
        const year = new Date(req.startDate).getFullYear().toString();
        if (!groups[year]) groups[year] = [];
        groups[year].push(req);
    }
    return groups;
  }, [absenceRequests]);
  const sortedYears = Object.keys(groupedRequests).sort((a, b) => Number(b) - Number(a));

  const handleSelectDate = useCallback((dateStr: string) => setSelectedDateString(dateStr), []);

  const selectedDateObject = useMemo(() => selectedDateString ? new Date(selectedDateString) : null, [selectedDateString]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-white p-2 sm:p-4 rounded-lg shadow-lg overflow-hidden">
        <div className="flex justify-between items-center mb-2 px-2 relative z-20">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><ChevronLeftIcon className="h-5 w-5 text-gray-600" /></button>
            <h2 className="text-lg font-bold text-gray-800">{currentDate.toLocaleString('de-DE', { month: 'long', year: 'numeric' })}</h2>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><ChevronRightIcon className="h-5 w-5 text-gray-600" /></button>
        </div>
        
        {/* Infinite Scroll Container */}
        <div 
          ref={swipeContainerRef}
          className="overflow-hidden relative touch-pan-y" 
          style={{ touchAction: 'pan-y' }}
        >
            <div
                ref={sliderRef}
                style={{
                    transform: 'translateX(-33.333333%) translateZ(0)',
                    width: '300%',
                    display: 'flex',
                    willChange: 'transform',
                    backfaceVisibility: 'hidden'
                }}
            >
                <CalendarMonthGrid 
                    dateForMonth={prevMonthDate} 
                    selectedDateString={selectedDateString}
                    entriesMap={entriesMap}
                    absencesMap={absencesMap}
                    holidaysMap={holidaysMap}
                    onSelectDate={handleSelectDate}
                    todayString={todayString}
                />
                <CalendarMonthGrid 
                    dateForMonth={currentDate} 
                    selectedDateString={selectedDateString}
                    entriesMap={entriesMap}
                    absencesMap={absencesMap}
                    holidaysMap={holidaysMap}
                    onSelectDate={handleSelectDate}
                    todayString={todayString}
                />
                <CalendarMonthGrid 
                    dateForMonth={nextMonthDate} 
                    selectedDateString={selectedDateString}
                    entriesMap={entriesMap}
                    absencesMap={absencesMap}
                    holidaysMap={holidaysMap}
                    onSelectDate={handleSelectDate}
                    todayString={todayString}
                />
            </div>
        </div>
      </div>

      {selectedDateObject && (
        <div ref={entriesListRef} className="animate-fade-in"><h3 className="text-lg font-bold mb-3">Einträge für den {selectedDateObject.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })}</h3><Card><div className="space-y-3">{holidayForSelectedDay && (<div className="p-3 bg-red-50 rounded-lg border border-red-200 flex items-center"><div className="w-2.5 h-2.5 bg-red-500 rounded-full mr-3"></div><p className="font-semibold text-red-800">{holidayForSelectedDay.name} (Feiertag)</p></div>)}{absencesForSelectedDayList.map(absence => { const d = getAbsenceStyle(absence.type); const dayPortionText = absence.dayPortion === 'am' ? ' (Vormittags)' : absence.dayPortion === 'pm' ? ' (Nachmittags)' : ''; return (<div key={absence.id} className={`p-3 rounded-lg border flex items-center ${d.bgClass} ${d.borderClass}`}><div className={`w-2.5 h-2.5 ${d.dotClass} rounded-full mr-3`}></div><p className={`font-semibold ${d.textClass}`}>{d.label}{dayPortionText}</p></div>);})}{entriesForSelectedDay.map(entry => {const d = (new Date(entry.end).getTime() - new Date(entry.start).getTime())/36e5-(entry.breakDurationMinutes/60); return (<button key={entry.id} onClick={()=>setSelectedEntryId(entry.id)} className="w-full p-3 bg-gray-50 rounded-lg border flex justify-between items-center text-left hover:bg-gray-100"><div><p className="font-semibold">{activities.find(a=>a.id===entry.activityId)?.name||'N/A'}</p><p className="text-sm text-gray-600">{customers.find(c=>c.id===entry.customerId)?.name||'N/A'}</p><p className="text-xs text-gray-500 mt-1">{new Date(entry.start).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} - {new Date(entry.end).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}</p></div><p className="font-bold text-lg text-blue-600">{d.toFixed(2)} h</p></button>);})}{entriesForSelectedDay.length===0 && absencesForSelectedDayList.length===0 && !holidayForSelectedDay && <p className="text-center text-gray-500 py-4">Keine Einträge für diesen Tag.</p>}</div></Card></div>
      )}

      <Card>
        <button
          onClick={() => setIsRequestsExpanded(prev => !prev)}
          className="w-full flex items-center justify-center relative py-1"
          aria-expanded={isRequestsExpanded}
          aria-controls="my-requests-list"
        >
          <h2 className="text-xl font-bold text-gray-800">Meine Anträge</h2>
          <ChevronDownIcon 
            className={`h-6 w-6 text-gray-400 transition-transform duration-300 absolute right-0 ${isRequestsExpanded ? 'rotate-180' : ''}`} 
          />
        </button>

        <div
          id="my-requests-list"
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isRequestsExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        >
          <div className="overflow-hidden">
            <div className="space-y-6 pt-4 mt-4 border-t">
              {sortedYears.length > 0 ? sortedYears.map(year => (
                <div key={year} className="space-y-4 pt-4 border-t first:border-t-0 first:pt-0">
                  <h3 className="text-lg font-bold text-gray-800">{year}</h3>
                  <div className="space-y-3">
                    {groupedRequests[year].map(req => {
                      const dayPortionText = req.dayPortion === 'am' ? ' (Vormittags)' : req.dayPortion === 'pm' ? ' (Nachmittags)' : '';
                      const dateText = req.startDate === req.endDate
                          ? `${new Date(req.startDate).toLocaleDateString('de-DE')}${dayPortionText}`
                          : `${new Date(req.startDate).toLocaleDateString('de-DE')} - ${new Date(req.endDate).toLocaleDateString('de-DE')}`;
                      return (
                        <div key={req.id} className="p-3 bg-gray-50 rounded-lg border">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="font-semibold">{getAbsenceStyle(req.type).label}</p>
                              <p className="text-sm text-gray-600">{dateText}</p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {getStatusChip(req.status)}
                              {req.status==='pending' && (<Button onClick={()=>setRequestToRetract(req)} className="text-xs bg-gray-500 hover:bg-gray-600 px-2 py-1">Zurückziehen</Button>)}
                            </div>
                          </div>
                          {req.adminComment && req.status!=='pending' && (<p className="mt-2 pt-2 border-t text-sm italic"><span className="font-medium not-italic text-gray-700">Kommentar:</span> "{req.adminComment}"</p>)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )) : (
                <p className="text-center text-gray-500 py-4">Keine Anträge vorhanden.</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {selectedEntry && (<EntryDetailModal entry={selectedEntry} customers={customers} activities={activities} timeEntries={timeEntries} onClose={handleCloseModal} onUpdate={onUpdateTimeEntry} onDelete={onDeleteTimeEntry} companySettings={companySettings}/>)}
      <ConfirmModal isOpen={!!requestToRetract} onClose={() => setRequestToRetract(null)} onConfirm={handleConfirmRetract} title="Antrag zurückziehen" message="Möchten Sie diesen Antrag wirklich zurückziehen?" confirmText="Ja, zurückziehen" />
    </div>
  );
};