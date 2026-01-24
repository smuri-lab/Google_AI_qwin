import React from 'react';
import { View } from '../types';
import { HomeIcon } from './icons/HomeIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { PlusIcon } from './icons/PlusIcon';

interface BottomNavProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  onAddClick: () => void;
  timeTrackingMethod: 'all' | 'manual';
}

interface NavItemProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ label, isActive, onClick, children }) => {
  const activeClasses = 'text-blue-600';
  const inactiveClasses = 'text-gray-500 hover:text-blue-600';

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full transition-colors duration-200 ${isActive ? activeClasses : inactiveClasses}`}
    >
      {children}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, setCurrentView, onAddClick, timeTrackingMethod }) => {
  return (
     <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 shadow-lg z-20">
      <div className="flex justify-around items-center h-full max-w-4xl mx-auto px-2">
        <NavItem 
          label="Start" 
          isActive={currentView === View.Dashboard} 
          onClick={() => setCurrentView(View.Dashboard)}
        >
          <HomeIcon className="h-6 w-6 mb-1" />
        </NavItem>

        <button
            onClick={onAddClick}
            className="flex flex-col items-center justify-center w-full transition-colors duration-200 text-gray-500 hover:text-blue-600"
            aria-label="Aktion ausführen"
        >
            <PlusIcon className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Aktion</span>
        </button>
        
        <NavItem 
          label="Kalender" 
          isActive={currentView === View.Calendar} 
          onClick={() => setCurrentView(View.Calendar)}
        >
          <CalendarIcon className="h-6 w-6 mb-1" />
        </NavItem>
        
        <NavItem
          label="Übersicht"
          isActive={currentView === View.Overview}
          onClick={() => setCurrentView(View.Overview)}
        >
            <DocumentTextIcon className="h-6 w-6 mb-1" />
        </NavItem>

      </div>
    </div>
  );
};