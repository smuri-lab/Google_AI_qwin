import React, { useState, useEffect, useRef } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { XIcon } from '../icons/XIcon';

interface TimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (time: string) => void;
  title: string;
  initialTime?: string;
  minTime?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

// Exakte Pixelwerte für stabile Berechnung
const ITEM_HEIGHT = 48; 
const VISIBLE_ITEMS = 5; 
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 240px
const SPACER_HEIGHT = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2; // 96px

export const TimePickerModal: React.FC<TimePickerModalProps> = ({ 
  isOpen, onClose, onSelect, title, initialTime, minTime, showBackButton, onBack 
}) => {
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  
  // Initialisierung und Reset des Closing-Status
  useEffect(() => {
    if (isOpen) {
      // Opening animation
      const timer = setTimeout(() => setIsVisible(true), 10);
      
      const [h, m] = (initialTime || '08:00').split(':');
      setSelectedHour(h);
      setSelectedMinute(m);
      
      setTimeout(() => {
        if (hourRef.current) hourRef.current.scrollTop = parseInt(h, 10) * ITEM_HEIGHT;
        if (minuteRef.current) minuteRef.current.scrollTop = parseInt(m, 10) * ITEM_HEIGHT;
      }, 50);
      
      return () => clearTimeout(timer);
    } else {
      // Reset state immediately when closed
      setIsVisible(false);
      setIsClosing(false);
    }
  }, [isOpen, initialTime]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: 'hour' | 'minute') => {
    const scrollTop = e.currentTarget.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    
    if (type === 'hour') {
      const val = HOURS[Math.min(Math.max(0, index), 23)];
      if (val) setSelectedHour(val);
    } else {
      const val = MINUTES[Math.min(Math.max(0, index), 59)];
      if (val) setSelectedMinute(val);
    }
  };

  const handleClose = () => {
      setIsClosing(true);
      setTimeout(onClose, 300); // Animation-Dauer abwarten
  };

  const handleConfirm = () => {
      setIsClosing(true);
      setTimeout(() => {
          onSelect(`${selectedHour}:${selectedMinute}`);
      }, 300);
  };
  
  const handleBack = () => {
      setIsClosing(true);
      setTimeout(() => {
          if (onBack) onBack();
      }, 300);
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black flex items-center justify-center z-[260] p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : (isVisible ? 'animate-modal-fade-in' : 'bg-transparent')}`} 
      onClick={handleClose}
    >
      <Card 
        className={`w-full max-w-xs bg-white rounded-xl shadow-2xl overflow-hidden ${isClosing ? 'animate-modal-slide-down' : (isVisible ? 'animate-modal-slide-up' : 'opacity-0 translate-y-4')}`} 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"><XIcon className="h-5 w-5" /></button>
        </div>

        {/* Picker Container */}
        <div className="relative h-[240px] flex text-center bg-white select-none">
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[48px] bg-gray-100 border-y border-gray-200 pointer-events-none z-0" />
            <div 
                ref={hourRef}
                onScroll={e => handleScroll(e, 'hour')}
                className="flex-1 overflow-y-auto snap-y snap-mandatory no-scrollbar z-10 py-0"
                style={{ height: `${CONTAINER_HEIGHT}px` }}
            >
                <div style={{ height: `${SPACER_HEIGHT}px` }} />
                {HOURS.map(h => (
                    <div key={h} className="h-[48px] flex items-center justify-center snap-center cursor-pointer">
                        <span className={`text-2xl transition-all duration-100 ${h === selectedHour ? 'font-bold text-black scale-110' : 'text-gray-300'}`}>{h}</span>
                    </div>
                ))}
                <div style={{ height: `${SPACER_HEIGHT}px` }} />
            </div>
            <div className="flex items-center justify-center z-10 font-bold text-xl pb-1 w-4">:</div>
            <div 
                ref={minuteRef}
                onScroll={e => handleScroll(e, 'minute')}
                className="flex-1 overflow-y-auto snap-y snap-mandatory no-scrollbar z-10 py-0"
                style={{ height: `${CONTAINER_HEIGHT}px` }}
            >
                <div style={{ height: `${SPACER_HEIGHT}px` }} />
                {MINUTES.map(m => (
                    <div key={m} className="h-[48px] flex items-center justify-center snap-center cursor-pointer">
                        <span className={`text-2xl transition-all duration-100 ${m === selectedMinute ? 'font-bold text-black scale-110' : 'text-gray-300'}`}>{m}</span>
                    </div>
                ))}
                <div style={{ height: `${SPACER_HEIGHT}px` }} />
            </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-100 bg-gray-50">
          <Button onClick={handleClose} className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-2">Abbrechen</Button>
          {showBackButton && <Button onClick={handleBack} className="flex-1 bg-gray-500 text-white hover:bg-gray-600 py-2">Zurück</Button>}
          <Button onClick={handleConfirm} className="flex-1 bg-blue-600 text-white hover:bg-blue-700 py-2 font-semibold shadow-sm">OK</Button>
        </div>
      </Card>
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
};