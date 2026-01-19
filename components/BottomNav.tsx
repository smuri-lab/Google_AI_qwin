import React from 'react';
import { View } from '../types';
import { ClockIcon } from './icons/ClockIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { PlusIcon } from './icons/PlusIcon';

interface BottomNavProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  onAddClick: () => void;
  timeTrackingMethod: 'all' | 'manual';
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, setCurrentView, onAddClick }) => {
  return (
     <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 shadow-lg z-20">
      <div className="flex justify-around items-center h-full max-w-4xl mx-auto px-2">
        <button 
          onClick={() => setCurrentView(View.Dashboard)} 
          className={`flex flex-col items-center justify-center w-full ${currentView === View.Dashboard ? 'text-blue-600' : 'text-gray-500'}`}
        >
          <ClockIcon className="h-6 w-6" />
          <span className="text-xs font-medium">Home</span>
        </button>
        <button 
          onClick={onAddClick} 
          className="flex flex-col items-center justify-center w-full text-gray-500 hover:text-blue-600"
        >
            <PlusIcon className="h-6 w-6" />
            <span className="text-xs font-medium">Aktion</span>
        </button>
        <button 
          onClick={() => setCurrentView(View.Calendar)} 
          className={`flex flex-col items-center justify-center w-full ${currentView === View.Calendar ? 'text-blue-600' : 'text-gray-500'}`}
        >
          <CalendarIcon className="h-6 w-6" />
          <span className="text-xs font-medium">Kalender</span>
        </button>
      </div>
    </div>
  );
};