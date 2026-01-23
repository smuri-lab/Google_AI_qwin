import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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

const DayOfWeekHeader: React.FC = () => {
    const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    return (
        <div className="grid grid-cols-7 text-center font-semibold text-gray-500 text-xs">
            {days.map(day => (
                <div key={day} className="py-2">{day}</div>
            ))}
        </div>
    );
};


const getStatusChip = (status: AbsenceRequest['status']) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-200 rounded-full">Ausstehend</span>;
      case 'approved': return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">Genehmigt</span>;
      case 'rejected': return <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 rounded-full">Abgelehnt</span>;
    }
};

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
  
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isSwiping = useRef(false);
  const isLocked = useRef(false); // Lock interaction during animation
  const [touchDeltaX, setTouchDeltaX] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const swipeContainerRef = useRef<HTMLDivElement>(null);

  // Animation duration constant
  const SWIPE_ANIMATION_DURATION = 500;

  useEffect(() => {
    const yearsToEnsure = new Set([currentDate.getFullYear()]);
    if (currentDate.getMonth() === 0) yearsToEnsure.add(currentDate.getFullYear() - 1);
    if (currentDate.getMonth() === 11) yearsToEnsure.add(currentDate.getFullYear() + 1);
    yearsToEnsure.forEach(year => onEnsureHolidaysForYear(year));
  }, [currentDate, onEnsureHolidaysForYear]);

  const selectedEntry = useMemo(() => {
    return selectedEntryId ? timeEntries.find(e => e.id === selectedEntryId) : null;
  }, [selectedEntryId, timeEntries]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const generateMonthDays = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
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
  };

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

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isLocked.current) return; // Prevent interaction during animation
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
    setTouchDeltaX(0);
    setIsTransitioning(false);
  };

  useEffect(() => {
    const node = swipeContainerRef.current;
    if (!node) return;

    const handleTouchMove = (e: TouchEvent) => {
        if (isLocked.current) return;
        if (!touchStartX.current || !touchStartY.current) return;
        const deltaX = e.touches[0].clientX - touchStartX.current;
        const deltaY = e.touches[0].clientY - touchStartY.current;

        if (!isSwiping.current) {
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
                isSwiping.current = true;
            } else if (Math.abs(deltaY) > Math.abs(deltaX)) {
                touchStartX.current = null;
                touchStartY.current = null;
                return;
            }
        }
        
        if (isSwiping.current) {
            e.preventDefault();
            setTouchDeltaX(deltaX);
        }
    };

    const handleTouchEnd = (e: TouchEvent) => {
        if (isLocked.current) return;
        if (!touchStartX.current || !isSwiping.current) {
            touchStartX.current = null;
            touchStartY.current = null;
            isSwiping.current = false;
            return;
        }
        
        const finalDeltaX = e.changedTouches[0].clientX - touchStartX.current;
        const SWIPE_THRESHOLD = 60;
        const calendarWidth = node.offsetWidth;
        
        setIsTransitioning(true);
        isLocked.current = true; // Lock interactions

        let targetDelta = 0;
        let action: (() => void) | null = null;

        if (finalDeltaX > SWIPE_THRESHOLD) {
          targetDelta = calendarWidth;
          action = () => changeMonth(-1);
        } else if (finalDeltaX < -SWIPE_THRESHOLD) {
          targetDelta = -calendarWidth;
          action = () => changeMonth(1);
        } else {
          targetDelta = 0;
        }
        
        setTouchDeltaX(targetDelta);

        setTimeout(() => { 
            if (action) action(); 
            setIsTransitioning(false); 
            setTouchDeltaX(0); 
            isLocked.current = false; // Unlock interactions
        }, SWIPE_ANIMATION_DURATION);
        
        touchStartX.current = null;
        touchStartY.current = null;
        isSwiping.current = false;
    };

    node.addEventListener('touchmove', handleTouchMove, { passive: false });
    node.addEventListener('touchend', handleTouchEnd);
    node.addEventListener('touchcancel', handleTouchEnd);

    return () => {
        node.removeEventListener('touchmove', handleTouchMove);
        node.removeEventListener('touchend', handleTouchEnd);
        node.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [changeMonth]);
  
  const renderMonthGrid = (dateForMonth: Date, isInteractive: boolean) => {
    const daysInMonth = generateMonthDays(dateForMonth);
    const currentDisplayMonth = dateForMonth.getMonth();

    return (
        <>
            <DayOfWeekHeader />
            <div className="grid grid-cols-7">
              {daysInMonth.map((day, index) => {
                const isDifferentMonth = day.getMonth() !== currentDisplayMonth;
                
                const dayString = day.toLocaleDateString('sv-SE');
                const absencesForDay = isDifferentMonth ? [] : absenceRequests.filter(a => dayString >= a.startDate && dayString <= a.endDate && a.status !== 'rejected');
                const absenceForDay = absencesForDay.find(a => a.status === 'pending') || absencesForDay[0];
                const entriesForDay = isDifferentMonth ? [] : timeEntries.filter(e => new Date(e.start).toLocaleDateString('sv-SE') === dayString);
                
                const holidaysForThisDay = holidaysByYear[day.getFullYear()] || [];
                const holiday = holidaysForThisDay.find(h => h.date === dayString);

                const isSelected = isInteractive && !isDifferentMonth && selectedDate?.toLocaleDateString('sv-SE') === dayString;
                const isToday = day.toDateString() === today.toDateString();
                const dayOfWeek = day.getDay();
                const isSunday = dayOfWeek === 0;

                // Increased height from h-10 to h-12 for more spacing
                let containerClasses = 'relative h-12 flex items-center justify-center transition-colors duration-200';
                if (isInteractive && !isDifferentMonth) containerClasses += ' cursor-pointer';

                let numberClasses = 'flex items-center justify-center w-7 h-7 rounded-full text-center font-medium text-sm transition-all z-10';

                if (isSelected) {
                    containerClasses += ' ring-2 ring-blue-400 z-10 rounded-lg';
                    numberClasses += ' bg-blue-600 text-white';
                } else {
                    if (isInteractive && !isDifferentMonth) containerClasses += ' rounded-lg hover:bg-gray-100';
                    
                    if (isDifferentMonth) {
                        numberClasses += ' text-gray-400';
                    } else if (isToday) {
                        if (isInteractive) containerClasses += ' bg-gray-50';
                        numberClasses += ' text-blue-600 font-bold';
                    } else if (holiday || isSunday) {
                        numberClasses += isInteractive ? ' text-red-600 font-semibold' : ' text-red-300';
                    } else {
                        numberClasses += isInteractive ? ' text-gray-700' : ' text-gray-400';
                    }
                }

                if (absenceForDay) {
                    if (entriesForDay.length > 0) { numberClasses += ' bg-white/50 backdrop-blur-sm'; } 
                    else if (absenceForDay.status === 'approved') { numberClasses += ' text-white'; }
                }
                
                return (
                    <div key={index} onClick={() => isInteractive && !isDifferentMonth && setSelectedDate(day)} className={containerClasses}>
                        {absenceForDay && (() => {
                            const ui = getAbsenceTypeDetails(absenceForDay.type);
                            const isStart = absenceForDay.startDate === dayString;
                            const isEnd = absenceForDay.endDate === dayString;
                            const isSingle = isStart && isEnd;
                            const isPending = absenceForDay.status === 'pending';
                            const isHalfDay = absenceForDay.dayPortion && absenceForDay.dayPortion !== 'full';
                            
                            let pillStyle: React.CSSProperties = {};
                            let pillClasses = `absolute top-1/2 -translate-y-1/2 left-0 right-0 h-8 flex items-center justify-center text-xs font-bold z-0 `;
                            if (!isInteractive) pillClasses += ' opacity-50';

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
                                if (absenceForDay.dayPortion === 'am') pillStyle.clipPath = 'polygon(0 0, 100% 0, 0 100%)';
                                else pillStyle.clipPath = 'polygon(100% 0, 100% 100%, 0 100%)';
                            }
                            return <div style={pillStyle} className={pillClasses}></div>;
                        })()}
                        <span className={numberClasses}>{day.getDate()}</span>
                        {/* Adjusted bottom position to bottom-1 for more spacing */}
                        <div className="absolute bottom-1 flex items-center justify-center space-x-1 h-1.5">
                            {entriesForDay.length > 0 && !absenceForDay && <div className={`w-1.5 h-1.5 bg-green-500 rounded-full ${!isInteractive ? 'opacity-50' : ''}`}></div>}
                        </div>
                    </div>
                );
              })}
            </div>
        </>
    );
  }

  const prevMonthDate = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1), [currentDate]);
  const nextMonthDate = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1), [currentDate]);

  const selectedDateString = selectedDate?.toLocaleDateString('sv-SE');
  const holidaysForSelectedDayMonth = holidaysByYear[selectedDate?.getFullYear() || currentDate.getFullYear()] || [];
  const entriesForSelectedDay = useMemo(() => selectedDateString ? timeEntries.filter(e => new Date(e.start).toLocaleDateString('sv-SE') === selectedDateString).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()) : [], [selectedDateString, timeEntries]);
  const absencesForSelectedDay = useMemo(() => selectedDateString ? absenceRequests.filter(a => selectedDateString >= a.startDate && selectedDateString <= a.endDate && a.status === 'approved') : [], [selectedDateString, absenceRequests]);
  const holidayForSelectedDay = useMemo(() => selectedDateString ? holidaysForSelectedDayMonth.find(h => h.date === selectedDateString) : null, [selectedDateString, holidaysForSelectedDayMonth]);

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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-white p-2 sm:p-4 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-2 px-2">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><ChevronLeftIcon className="h-5 w-5 text-gray-600" /></button>
            <h2 className="text-lg font-bold text-gray-800">{currentDate.toLocaleString('de-DE', { month: 'long', year: 'numeric' })}</h2>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><ChevronRightIcon className="h-5 w-5 text-gray-600" /></button>
        </div>
        <div 
          ref={swipeContainerRef}
          className="overflow-hidden relative"
          onTouchStart={handleTouchStart}
        >
            <div
                style={{
                    transform: `translateX(calc(-33.333% + ${touchDeltaX}px))`,
                    transition: isTransitioning ? `transform ${SWIPE_ANIMATION_DURATION}ms ease-in-out` : 'none'
                }}
                className="flex w-[300%]"
            >
                <div className="w-1/3 shrink-0 px-1">{renderMonthGrid(prevMonthDate, false)}</div>
                <div className="w-1/3 shrink-0 px-1">{renderMonthGrid(currentDate, true)}</div>
                <div className="w-1/3 shrink-0 px-1">{renderMonthGrid(nextMonthDate, false)}</div>
            </div>
        </div>
      </div>

      {selectedDate && (
        <div ref={entriesListRef} className="animate-fade-in"><h3 className="text-lg font-bold mb-3">Einträge für den {selectedDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })}</h3><Card><div className="space-y-3">{holidayForSelectedDay && (<div className="p-3 bg-red-50 rounded-lg border border-red-200 flex items-center"><div className="w-2.5 h-2.5 bg-red-500 rounded-full mr-3"></div><p className="font-semibold text-red-800">{holidayForSelectedDay.name} (Feiertag)</p></div>)}{absencesForSelectedDay.map(absence => { const d = getAbsenceTypeDetails(absence.type); const dayPortionText = absence.dayPortion === 'am' ? ' (Vormittags)' : absence.dayPortion === 'pm' ? ' (Nachmittags)' : ''; return (<div key={absence.id} className={`p-3 rounded-lg border flex items-center ${d.bgClass} ${d.borderClass}`}><div className={`w-2.5 h-2.5 ${d.dotClass} rounded-full mr-3`}></div><p className={`font-semibold ${d.textClass}`}>{d.label}{dayPortionText}</p></div>);})}{entriesForSelectedDay.map(entry => {const d = (new Date(entry.end).getTime() - new Date(entry.start).getTime())/36e5-(entry.breakDurationMinutes/60); return (<button key={entry.id} onClick={()=>setSelectedEntryId(entry.id)} className="w-full p-3 bg-gray-50 rounded-lg border flex justify-between items-center text-left hover:bg-gray-100"><div><p className="font-semibold">{activities.find(a=>a.id===entry.activityId)?.name||'N/A'}</p><p className="text-sm text-gray-600">{customers.find(c=>c.id===entry.customerId)?.name||'N/A'}</p><p className="text-xs text-gray-500 mt-1">{new Date(entry.start).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} - {new Date(entry.end).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}</p></div><p className="font-bold text-lg text-blue-600">{d.toFixed(2)} h</p></button>);})}{entriesForSelectedDay.length===0 && absencesForSelectedDay.length===0 && !holidayForSelectedDay && <p className="text-center text-gray-500 py-4">Keine Einträge für diesen Tag.</p>}</div></Card></div>
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