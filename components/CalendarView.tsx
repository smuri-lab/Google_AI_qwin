import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  
  // Swipe animation state
  const touchStartX = useRef<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    onEnsureHolidaysForYear(currentDate.getFullYear());
  }, [currentDate, onEnsureHolidaysForYear]);

  const selectedEntry = useMemo(() => {
    return selectedEntryId ? timeEntries.find(e => e.id === selectedEntryId) : null;
  }, [selectedEntryId, timeEntries]);

  const holidaysForCurrentMonth = holidaysByYear[currentDate.getFullYear()] || [];
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysInMonth = [];
  const startDay = (startOfMonth.getDay() + 6) % 7; 

  for (let i = 0; i < startDay; i++) {
    daysInMonth.push(null);
  }
  for (let i = 1; i <= endOfMonth.getDate(); i++) {
    daysInMonth.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  const changeMonth = (offset: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    setSelectedDate(null); // Deselect day when changing month
  };
  
  const handleCloseModal = () => setSelectedEntryId(null);
  const handleConfirmRetract = () => {
    if (requestToRetract) {
      onRetractAbsenceRequest(requestToRetract.id);
      setRequestToRetract(null);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setTouchDeltaX(0);
    setIsTransitioning(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartX.current) return;
    const currentX = e.touches[0].clientX;
    const delta = currentX - touchStartX.current;
    setTouchDeltaX(delta);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartX.current) return;
    
    setIsTransitioning(true);
    const SWIPE_THRESHOLD = 60;
    const calendarWidth = e.currentTarget.offsetWidth;

    if (Math.abs(touchDeltaX) > SWIPE_THRESHOLD) {
      const direction = touchDeltaX > 0 ? 1 : -1;
      setTouchDeltaX(direction * calendarWidth); // Animate fully out

      setTimeout(() => {
        changeMonth(direction === 1 ? -1 : 1);
        setIsTransitioning(false);
        setTouchDeltaX(0);
      }, 300); // Must match transition duration
    } else {
      // Snap back
      setTouchDeltaX(0);
    }
    touchStartX.current = null;
  };

  const selectedDateString = selectedDate?.toLocaleDateString('sv-SE');

  const entriesForSelectedDay = useMemo(() => selectedDateString ? timeEntries.filter(e => new Date(e.start).toLocaleDateString('sv-SE') === selectedDateString).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()) : [], [selectedDateString, timeEntries]);
  const absencesForSelectedDay = useMemo(() => selectedDateString ? absenceRequests.filter(a => selectedDateString >= a.startDate && selectedDateString <= a.endDate && a.status === 'approved') : [], [selectedDateString, absenceRequests]);
  const holidayForSelectedDay = useMemo(() => selectedDateString ? holidaysForCurrentMonth.find(h => h.date === selectedDateString) : null, [selectedDateString, holidaysForCurrentMonth]);

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
      <div 
        className="bg-white p-2 sm:p-4 rounded-lg shadow-lg overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
            style={{ transform: `translateX(${touchDeltaX}px)` }}
            className={isTransitioning ? 'transition-transform duration-300 ease-in-out' : ''}
        >
            <div className="flex justify-between items-center mb-2 px-2">
              <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><ChevronLeftIcon className="h-5 w-5 text-gray-600" /></button>
              <h2 className="text-lg font-bold text-gray-800">{currentDate.toLocaleString('de-DE', { month: 'long', year: 'numeric' })}</h2>
              <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><ChevronRightIcon className="h-5 w-5 text-gray-600" /></button>
            </div>
            <DayOfWeekHeader />
            <div className="grid grid-cols-7">
              {daysInMonth.map((day, index) => {
                if (!day) return <div key={`empty-${index}`} className="h-14 bg-gray-50/50"></div>;
                
                const dayString = day.toLocaleDateString('sv-SE');
                const absencesForDay = absenceRequests.filter(a => dayString >= a.startDate && dayString <= a.endDate && a.status !== 'rejected');
                const absenceForDay = absencesForDay.find(a => a.status === 'pending') || absencesForDay[0];

                const entriesForDay = timeEntries.filter(e => new Date(e.start).toLocaleDateString('sv-SE') === dayString);
                const holiday = holidaysForCurrentMonth.find(h => h.date === dayString);
                const isSelected = selectedDate?.toLocaleDateString('sv-SE') === dayString;
                const isToday = day.toDateString() === today.toDateString();
                const dayOfWeek = day.getDay();
                const isSunday = dayOfWeek === 0;

                let containerClasses = 'relative h-14 flex items-center justify-center cursor-pointer transition-colors duration-200';
                let numberClasses = 'flex items-center justify-center w-7 h-7 rounded-full text-center font-medium text-sm transition-all z-10';

                if (isSelected) {
                    containerClasses += ' ring-2 ring-blue-400 z-10 rounded-lg';
                    numberClasses += ' bg-blue-600 text-white';
                } else {
                    containerClasses += ' rounded-lg hover:bg-gray-100';
                    if (isToday) {
                        containerClasses += ' bg-gray-50';
                        numberClasses += ' text-blue-600 font-bold';
                    } else if (holiday || isSunday) {
                        numberClasses += ' text-red-600 font-semibold';
                    } else {
                        numberClasses += ' text-gray-700';
                    }
                }

                if (absenceForDay) {
                    if (entriesForDay.length > 0) {
                        numberClasses += ' bg-white/50 backdrop-blur-sm';
                    } else if (absenceForDay.status === 'approved') {
                        numberClasses += ' text-white';
                    }
                }

                return (
                    <div key={index} onClick={() => setSelectedDate(day)} className={containerClasses}>
                        {absenceForDay && (() => {
                            const ui = getAbsenceTypeDetails(absenceForDay.type);
                            const isStart = absenceForDay.startDate === dayString;
                            const isEnd = absenceForDay.endDate === dayString;
                            const isSingle = isStart && isEnd;
                            const isPending = absenceForDay.status === 'pending';
                            const isHalfDay = absenceForDay.dayPortion && absenceForDay.dayPortion !== 'full';

                            let pillStyle: React.CSSProperties = {};
                            let pillClasses = `absolute top-1/2 -translate-y-1/2 left-0 right-0 h-10 flex items-center justify-center text-xs font-bold transition-all duration-150 z-0 `;

                            if (isPending) {
                                pillClasses += `${ui.pendingClass} border-dashed ${ui.pendingBorderClass}`;
                                if (isSingle) {
                                    pillClasses += ' border-2 rounded-lg mx-0.5';
                                } else {
                                    pillClasses += ' border-y-2';
                                    if (isStart) {
                                        pillClasses += ' border-l-2 rounded-l-lg justify-start pl-2';
                                    }
                                    if (isEnd) {
                                        pillClasses += ' border-r-2 rounded-r-lg';
                                    }
                                }
                            } else {
                                pillClasses += `${ui.solidClass}`;
                                if (isSingle) {
                                    pillClasses += ' rounded-lg mx-0.5';
                                } else if (isStart) {
                                    pillClasses += ' rounded-l-lg justify-start pl-2';
                                } else if (isEnd) {
                                    pillClasses += ' rounded-r-lg';
                                }
                            }
                            
                            if (isHalfDay && isSingle) {
                                if (absenceForDay.dayPortion === 'am') {
                                    pillStyle.clipPath = 'polygon(0 0, 100% 0, 0 100%)';
                                } else { // pm
                                    pillStyle.clipPath = 'polygon(100% 0, 100% 100%, 0 100%)';
                                }
                            }

                            return (
                                <div style={pillStyle} className={pillClasses}>
                                    {/* Label removed for cleaner look */}
                                </div>
                            );
                        })()}
                        <span className={numberClasses}>{day.getDate()}</span>
                        <div className="absolute bottom-1.5 flex items-center justify-center space-x-1 h-1.5">
                            {entriesForDay.length > 0 && !absenceForDay && <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>}
                        </div>
                    </div>
                );
              })}
            </div>
        </div>
      </div>

      {selectedDate && (
        <div ref={entriesListRef} className="animate-fade-in"><h3 className="text-lg font-bold mb-3">Einträge für den {selectedDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })}</h3><Card><div className="space-y-3">{holidayForSelectedDay && (<div className="p-3 bg-red-50 rounded-lg border border-red-200 flex items-center"><div className="w-2.5 h-2.5 bg-red-500 rounded-full mr-3"></div><p className="font-semibold text-red-800">{holidayForSelectedDay.name} (Feiertag)</p></div>)}{absencesForSelectedDay.map(absence => { const d = getAbsenceTypeDetails(absence.type); const dayPortionText = absence.dayPortion === 'am' ? ' (Vormittags)' : absence.dayPortion === 'pm' ? ' (Nachmittags)' : ''; return (<div key={absence.id} className={`p-3 rounded-lg border flex items-center ${d.bgClass} ${d.borderClass}`}><div className={`w-2.5 h-2.5 ${d.dotClass} rounded-full mr-3`}></div><p className={`font-semibold ${d.textClass}`}>{d.label}{dayPortionText}</p></div>);})}{entriesForSelectedDay.map(entry => {const d = (new Date(entry.end).getTime() - new Date(entry.start).getTime())/36e5-(entry.breakDurationMinutes/60); return (<button key={entry.id} onClick={()=>setSelectedEntryId(entry.id)} className="w-full p-3 bg-gray-50 rounded-lg border flex justify-between items-center text-left hover:bg-gray-100"><div><p className="font-semibold">{activities.find(a=>a.id===entry.activityId)?.name||'N/A'}</p><p className="text-sm text-gray-600">{customers.find(c=>c.id===entry.customerId)?.name||'N/A'}</p><p className="text-xs text-gray-500 mt-1">{new Date(entry.start).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} - {new Date(entry.end).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}</p></div><p className="font-bold text-lg text-blue-600">{d.toFixed(2)} h</p></button>);})}{entriesForSelectedDay.length===0 && absencesForSelectedDay.length===0 && !holidayForSelectedDay && <p className="text-center text-gray-500 py-4">Keine Einträge für diesen Tag.</p>}</div></Card></div>
      )}

      <div className="flex justify-center"><Button onClick={onAddAbsenceClick} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"><PlusIcon className="h-5 w-5"/>Antrag stellen</Button></div>
      
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
