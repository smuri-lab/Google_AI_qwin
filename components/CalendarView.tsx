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
import { getAbsenceTypeDetails } from './utils';
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

// --- Helper Components & Functions (Moved outside for stability) ---

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
    day: Date;
    isCurrentMonth: boolean;
    isSelected: boolean;
    isToday: boolean;
    entries: TimeEntry[];
    absence: AbsenceRequest | undefined;
    holiday: Holiday | undefined;
    onSelect: (day: Date) => void;
}

const CalendarDay: React.FC<CalendarDayProps> = React.memo(({ day, isCurrentMonth, isSelected, isToday, entries, absence, holiday, onSelect }) => {
    const dayOfWeek = day.getDay();
    const isSunday = dayOfWeek === 0;

    let containerClasses = 'relative h-12 flex items-center justify-center transition-colors duration-200';
    if (isCurrentMonth) containerClasses += ' cursor-pointer';

    let numberClasses = 'flex items-center justify-center w-7 h-7 rounded-full text-center font-medium text-sm transition-all z-10';

    if (isSelected) {
        containerClasses += ' ring-2 ring-blue-400 z-10 rounded-lg';
        numberClasses += ' bg-blue-600 text-white';
    } else {
        if (isCurrentMonth) containerClasses += ' rounded-lg hover:bg-gray-100';
        if (!isCurrentMonth) {
            numberClasses += ' text-gray-400';
        } else if (isToday) {
            if (isCurrentMonth) containerClasses += ' bg-gray-50';
            numberClasses += ' text-blue-600 font-bold';
        } else if (holiday || isSunday) {
            numberClasses += ' text-red-600 font-semibold';
        } else {
            numberClasses += ' text-gray-700';
        }
    }

    if (absence) {
        if (entries.length > 0) { numberClasses += ' bg-white/50 backdrop-blur-sm'; } 
        else if (absence.status === 'approved') { numberClasses += ' text-white'; }
    }

    const handleDayClick = () => {
        if (isCurrentMonth) {
            onSelect(day);
        }
    };

    return (
        <div onClick={handleDayClick} className={containerClasses}>
            {absence && (() => {
                const ui = getAbsenceTypeDetails(absence.type);
                const dayString = day.toLocaleDateString('sv-SE');
                const isStart = absence.startDate === dayString;
                const isEnd = absence.endDate === dayString;
                const isSingle = isStart && isEnd;
                const isPending = absence.status === 'pending';
                const isHalfDay = absence.dayPortion && absence.dayPortion !== 'full';
                
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
                    if (absence.dayPortion === 'am') pillStyle.clipPath = 'polygon(0 0, 100% 0, 0 100%)';
                    else pillStyle.clipPath = 'polygon(100% 0, 100% 100%, 0 100%)';
                }
                return <div style={pillStyle} className={pillClasses}></div>;
            })()}
            <span className={numberClasses}>{day.getDate()}</span>
            <div className="absolute bottom-1 flex items-center justify-center space-x-1 h-1.5">
                {entries.length > 0 && !absence && <div className={`w-1.5 h-1.5 bg-green-500 rounded-full`}></div>}
            </div>
        </div>
    );
}, (prev, next) => {
    // Custom comparison for performance
    return prev.day.getTime() === next.day.getTime() &&
           prev.isCurrentMonth === next.isCurrentMonth &&
           prev.isSelected === next.isSelected &&
           prev.isToday === next.isToday &&
           prev.entries === next.entries && // Reference check is enough because we use a Map in parent
           prev.absence === next.absence &&
           prev.holiday === next.holiday;
});

// -- Optimized Month Grid Component --
interface CalendarMonthGridProps {
    dateForMonth: Date;
    selectedDate: Date | null;
    entriesMap: Map<string, TimeEntry[]>;
    absencesMap: Map<string, AbsenceRequest>;
    holidaysMap: Map<string, Holiday>;
    onSelectDate: (date: Date) => void;
}

const CalendarMonthGrid: React.FC<CalendarMonthGridProps> = React.memo(({ dateForMonth, selectedDate, entriesMap, absencesMap, holidaysMap, onSelectDate }) => {
    const today = useMemo(() => new Date(), []);
    today.setHours(0,0,0,0);

    const daysInMonth = useMemo(() => {
        const year = dateForMonth.getFullYear();
        const month = dateForMonth.getMonth();
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0);
        const days: Date[] = [];
        const startDayOfWeek = (startOfMonth.getDay() + 6) % 7;
        const prevMonthEndDate = new Date(year, month, 0);
        
        for (let i = startDayOfWeek; i > 0; i--) {
            days.push(new Date(year, month - 1, prevMonthEndDate.getDate() - i + 1));
        }
        for (let i = 1; i <= endOfMonth.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        const totalCells = 42;
        let nextDay = 1;
        while (days.length < totalCells) {
            days.push(new Date(year, month + 1, nextDay++));
        }
        return days;
    }, [dateForMonth.getFullYear(), dateForMonth.getMonth()]);

    const currentDisplayMonth = dateForMonth.getMonth();
    const selectedDateString = selectedDate?.toLocaleDateString('sv-SE');

    return (
        <div className="w-1/3 shrink-0 px-1">
            <DayOfWeekHeader />
            <div className="grid grid-cols-7">
                {daysInMonth.map((day, index) => {
                    const dayString = day.toLocaleDateString('sv-SE');
                    const isDifferentMonth = day.getMonth() !== currentDisplayMonth;
                    
                    // Fast lookups from maps
                    const entriesForDay = !isDifferentMonth ? (entriesMap.get(dayString) || []) : [];
                    const absenceForDay = !isDifferentMonth ? absencesMap.get(dayString) : undefined;
                    const holiday = holidaysMap.get(dayString);
                    
                    const isSelected = !isDifferentMonth && selectedDateString === dayString;
                    const isToday = day.getTime() === today.getTime();

                    return (
                        <CalendarDay 
                            key={dayString} // Using date string as key is stable for same dates
                            day={day}
                            isCurrentMonth={!isDifferentMonth}
                            isSelected={isSelected}
                            isToday={isToday}
                            entries={entriesForDay}
                            absence={absenceForDay}
                            holiday={holiday}
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
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
  // We create a fast lookup map for Absences. 
  // Instead of filtering the array for every day cell, we pre-fill a Map.
  const { entriesMap, absencesMap, holidaysMap } = useMemo(() => {
      const eMap = new Map<string, TimeEntry[]>();
      timeEntries.forEach(entry => {
          const dateStr = new Date(entry.start).toLocaleDateString('sv-SE');
          if (!eMap.has(dateStr)) eMap.set(dateStr, []);
          eMap.get(dateStr)!.push(entry);
      });

      const aMap = new Map<string, AbsenceRequest>();
      // We only care about absences in the viewable range (Current Year +/- 1 usually)
      // Iterating all absences is fast enough (<1000 items usually).
      absenceRequests.forEach(req => {
          if (req.status === 'rejected') return;
          
          let loopDate = new Date(req.startDate);
          const endDate = new Date(req.endDate);
          
          while (loopDate <= endDate) {
              const dateStr = loopDate.toLocaleDateString('sv-SE');
              // If there's already an absence for this day, we prioritize 'pending' to show the user they have an action waiting,
              // or just keep the first one found.
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
    setSelectedDate(null);
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
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
                isSwiping.current = true;
            } else if (Math.abs(deltaY) > Math.abs(deltaX)) {
                touchStartX.current = null;
                return;
            }
        }
        
        if (isSwiping.current) {
            e.preventDefault(); 
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = requestAnimationFrame(() => {
                slider.style.transform = `translateX(calc(-33.333333% + ${deltaX}px))`;
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
        const width = node.offsetWidth;
        const touchEndTime = Date.now();
        const timeElapsed = touchEndTime - touchStartTime.current;
        
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
        slider.style.transform = `translateX(${targetPercent}%)`;

        const handleTransitionEnd = (evt: TransitionEvent) => {
            if (evt.target !== slider || evt.propertyName !== 'transform') return;

            if (monthChange !== 0) {
                changeMonth(monthChange);
            } else {
                if (sliderRef.current) {
                    sliderRef.current.style.transition = 'none';
                    sliderRef.current.style.transform = 'translateX(-33.333333%)';
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

  const selectedDateString = selectedDate?.toLocaleDateString('sv-SE');
  const entriesForSelectedDay = useMemo(() => selectedDateString ? (entriesMap.get(selectedDateString) || []).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()) : [], [selectedDateString, entriesMap]);
  // Re-use map for selected day lookup
  const absenceForSelectedDay = useMemo(() => selectedDateString ? absencesMap.get(selectedDateString) : undefined, [selectedDateString, absencesMap]);
  // We need to show all approved absences for the list below the calendar, usually it's just one, but logic remains same
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

  const handleSelectDate = useCallback((date: Date) => setSelectedDate(date), []);

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
                    transform: 'translateX(-33.333333%)',
                    width: '300%',
                    display: 'flex',
                    willChange: 'transform' // Force GPU Layer for smoother animation
                }}
            >
                <CalendarMonthGrid 
                    dateForMonth={prevMonthDate} 
                    selectedDate={selectedDate}
                    entriesMap={entriesMap}
                    absencesMap={absencesMap}
                    holidaysMap={holidaysMap}
                    onSelectDate={handleSelectDate}
                />
                <CalendarMonthGrid 
                    dateForMonth={currentDate} 
                    selectedDate={selectedDate}
                    entriesMap={entriesMap}
                    absencesMap={absencesMap}
                    holidaysMap={holidaysMap}
                    onSelectDate={handleSelectDate}
                />
                <CalendarMonthGrid 
                    dateForMonth={nextMonthDate} 
                    selectedDate={selectedDate}
                    entriesMap={entriesMap}
                    absencesMap={absencesMap}
                    holidaysMap={holidaysMap}
                    onSelectDate={handleSelectDate}
                />
            </div>
        </div>
      </div>

      {selectedDate && (
        <div ref={entriesListRef} className="animate-fade-in"><h3 className="text-lg font-bold mb-3">Einträge für den {selectedDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })}</h3><Card><div className="space-y-3">{holidayForSelectedDay && (<div className="p-3 bg-red-50 rounded-lg border border-red-200 flex items-center"><div className="w-2.5 h-2.5 bg-red-500 rounded-full mr-3"></div><p className="font-semibold text-red-800">{holidayForSelectedDay.name} (Feiertag)</p></div>)}{absencesForSelectedDayList.map(absence => { const d = getAbsenceTypeDetails(absence.type); const dayPortionText = absence.dayPortion === 'am' ? ' (Vormittags)' : absence.dayPortion === 'pm' ? ' (Nachmittags)' : ''; return (<div key={absence.id} className={`p-3 rounded-lg border flex items-center ${d.bgClass} ${d.borderClass}`}><div className={`w-2.5 h-2.5 ${d.dotClass} rounded-full mr-3`}></div><p className={`font-semibold ${d.textClass}`}>{d.label}{dayPortionText}</p></div>);})}{entriesForSelectedDay.map(entry => {const d = (new Date(entry.end).getTime() - new Date(entry.start).getTime())/36e5-(entry.breakDurationMinutes/60); return (<button key={entry.id} onClick={()=>setSelectedEntryId(entry.id)} className="w-full p-3 bg-gray-50 rounded-lg border flex justify-between items-center text-left hover:bg-gray-100"><div><p className="font-semibold">{activities.find(a=>a.id===entry.activityId)?.name||'N/A'}</p><p className="text-sm text-gray-600">{customers.find(c=>c.id===entry.customerId)?.name||'N/A'}</p><p className="text-xs text-gray-500 mt-1">{new Date(entry.start).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} - {new Date(entry.end).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}</p></div><p className="font-bold text-lg text-blue-600">{d.toFixed(2)} h</p></button>);})}{entriesForSelectedDay.length===0 && absencesForSelectedDayList.length===0 && !holidayForSelectedDay && <p className="text-center text-gray-500 py-4">Keine Einträge für diesen Tag.</p>}</div></Card></div>
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
                              <p className="font-semibold">{getAbsenceTypeDetails(req.type).label}</p>
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