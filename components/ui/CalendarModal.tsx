import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { XIcon } from '../icons/XIcon';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  selectionMode?: 'single' | 'range';
  onSelectDate?: (date: Date) => void;
  onSelectRange?: (range: { start: string; end: string }) => void;
  initialStartDate?: string;
  initialEndDate?: string;
  minDate?: Date;
  isRotated?: boolean;
}

const DayOfWeekHeader: React.FC = () => {
    const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    return (
        <div className="grid grid-cols-7 text-center font-semibold text-gray-500 text-xs">
            {days.map(day => <div key={day} className="py-2">{day}</div>)}
        </div>
    );
};

export const CalendarModal: React.FC<CalendarModalProps> = ({ 
    isOpen, 
    onClose, 
    onSelectDate,
    onSelectRange,
    title, 
    selectionMode = 'single',
    initialStartDate,
    initialEndDate, 
    minDate,
    isRotated = false
}) => {
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [range, setRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Opening animation
      const timer = setTimeout(() => setIsVisible(true), 10);
      
      const start = initialStartDate ? new Date(initialStartDate) : null;
      let end = initialEndDate ? new Date(initialEndDate) : null;
      if (selectionMode === 'single' && start) {
        end = start;
      }
      if (start) start.setHours(12, 0, 0, 0);
      if (end) end.setHours(12, 0, 0, 0);
      setRange({ start, end });
      setCurrentMonthDate(start || new Date());
      
      return () => clearTimeout(timer);
    } else {
      // Reset state immediately when closed
      setIsVisible(false);
      setIsClosing(false);
    }
  }, [isOpen, initialStartDate, initialEndDate, selectionMode]);

  if (!isOpen) return null;

  const startOfMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1);
  const endOfMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if(minDate) minDate.setHours(0,0,0,0);

  const daysInMonth = [];
  const startDayOfWeek = (startOfMonth.getDay() + 6) % 7;

  for (let i = 0; i < startDayOfWeek; i++) {
    daysInMonth.push(null);
  }
  for (let i = 1; i <= endOfMonth.getDate(); i++) {
    const dayDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), i);
    dayDate.setHours(12, 0, 0, 0);
    daysInMonth.push(dayDate);
  }

  const changeMonth = (offset: number) => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };
  
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleDayClick = (day: Date) => {
    if (selectionMode === 'single') {
        setRange({ start: day, end: day });
        return;
    }

    if (!range.start || range.end) {
      setRange({ start: day, end: null });
      setHoverDate(null);
    } else if (day < range.start) {
      setRange({ start: day, end: null });
    } else {
      setRange({ ...range, end: day });
      setHoverDate(null);
    }
  };
  
  const handleConfirm = () => {
      if (selectionMode === 'range' && range.start && range.end && onSelectRange) {
        onSelectRange({
            start: range.start.toLocaleDateString('sv-SE'),
            end: range.end.toLocaleDateString('sv-SE'),
        });
      } else if (selectionMode === 'single' && range.start && onSelectDate) {
          onSelectDate(range.start);
      }
      handleClose();
  }

  const containerClass = isRotated
    ? `fixed top-0 left-0 w-[100vh] h-[100vw] origin-top-left rotate-90 translate-x-[100vw] flex items-center justify-center z-[260] p-1 sm:p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : (isVisible ? 'animate-modal-fade-in' : 'bg-transparent')}`
    : `fixed inset-0 bg-black flex items-center justify-center z-[260] p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : (isVisible ? 'animate-modal-fade-in' : 'bg-transparent')}`;

  const cardClasses = `w-full max-w-sm ${isRotated ? '!p-3' : ''} ${isClosing ? 'animate-modal-slide-down' : (isVisible ? 'animate-modal-slide-up' : 'opacity-0 translate-y-4')}`;

  return (
    <div className={containerClass} onClick={handleClose}>
      <Card className={cardClasses} onClick={(e) => e.stopPropagation()}>
        <div className={`flex justify-between items-center ${isRotated ? 'pb-2' : 'pb-4'} border-b`}>
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600"><XIcon className="h-6 w-6" /></button>
        </div>

        <div className={isRotated ? 'mt-2' : 'mt-4'}>
          <div className="flex justify-between items-center mb-2 px-2">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeftIcon className="h-5 w-5" /></button>
            <h3 className="font-bold">{currentMonthDate.toLocaleString('de-DE', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronRightIcon className="h-5 w-5" /></button>
          </div>
          <DayOfWeekHeader />
          <div className="grid grid-cols-7">
            {daysInMonth.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} />;
              
              const dayTime = day.getTime();
              const isToday = day.toDateString() === today.toDateString();
              const isDisabled = minDate ? day < minDate : false;

              const rangeStart = range.start?.getTime();
              const rangeEnd = range.end?.getTime();
              const hoverTime = hoverDate?.getTime();
              
              const effectiveEnd = rangeEnd || (rangeStart && hoverTime && hoverTime > rangeStart ? hoverTime : null);

              const isStartDate = rangeStart && dayTime === rangeStart;
              const isEndDate = effectiveEnd && dayTime === effectiveEnd;
              const isInRange = rangeStart && effectiveEnd && dayTime > rangeStart && dayTime < effectiveEnd;
              const isHovered = !rangeEnd && isInRange;
              
              let dayClasses = `h-10 w-10 flex items-center justify-center rounded-full text-sm transition-colors z-10 relative `;
              let containerClasses = `flex justify-center items-center h-10`;
              
              if (!isDisabled) dayClasses += 'cursor-pointer ';
              
              // Range background
              if (isStartDate && isEndDate) {
                 // single day selection
              } else if (isStartDate) {
                  containerClasses += ` bg-blue-100 rounded-l-full ${isHovered ? 'bg-opacity-75' : ''}`;
              } else if (isEndDate) {
                  containerClasses += ` bg-blue-100 rounded-r-full ${isHovered ? 'bg-opacity-75' : ''}`;
              } else if (isInRange) {
                  containerClasses += ` bg-blue-100 w-full ${isHovered ? 'bg-opacity-75' : ''}`;
              }
              
              // Day number circle
              if (isStartDate || isEndDate) {
                  dayClasses += `bg-blue-600 text-white font-bold`;
              } else if (isInRange) {
                   dayClasses += 'bg-transparent text-blue-800 font-bold';
              } else if (isDisabled) {
                  dayClasses += 'text-gray-300 cursor-not-allowed';
              } else {
                  dayClasses += 'hover:bg-gray-100 ';
                  if (isToday) dayClasses += 'text-blue-600 font-bold';
                  else dayClasses += 'text-gray-700';
              }

              return (
                <div 
                  key={index} 
                  className={containerClasses}
                  onMouseEnter={() => !isDisabled && selectionMode === 'range' && setHoverDate(day)}
                  onMouseLeave={() => setHoverDate(null)}
                >
                  <button type="button" onClick={() => !isDisabled && handleDayClick(day)} className={dayClasses} disabled={isDisabled}>
                    {day.getDate()}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`flex justify-end gap-4 ${isRotated ? 'pt-3 mt-2' : 'pt-6 mt-4'} border-t`}>
          <Button onClick={handleClose} className="bg-gray-500 hover:bg-gray-600">Abbrechen</Button>
          <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700" disabled={selectionMode === 'range' ? !(range.start && range.end) : !range.start}>OK</Button>
        </div>
      </Card>
    </div>
  );
};