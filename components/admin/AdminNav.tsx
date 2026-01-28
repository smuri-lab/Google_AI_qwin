
import React, { useState, useRef, useEffect } from 'react';
import { AdminViewType, type CompanySettings, type AbsenceRequest } from '../../types';
import { ClockIcon } from '../icons/ClockIcon';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { SunIcon } from '../icons/SunIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { BriefcaseIcon } from '../icons/BriefcaseIcon';
import { ChevronDoubleLeftIcon } from '../icons/ChevronDoubleLeftIcon';
import { ChevronDoubleRightIcon } from '../icons/ChevronDoubleRightIcon';
import { UserCircleIcon } from '../icons/UserCircleIcon';
import { CogIcon } from '../icons/CogIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';

interface AdminNavProps {
  activeView: AdminViewType;
  setActiveView: (view: AdminViewType) => void;
  companySettings: CompanySettings;
  absenceRequests: AbsenceRequest[];
}

interface NavItemData {
  label: string;
  view: AdminViewType;
  icon: React.ElementType;
  badge?: number;
}

const NavItem: React.FC<{
  label: string;
  view: AdminViewType;
  isActive: boolean;
  Icon: React.ElementType;
  onItemClick: (view: AdminViewType) => void;
  badge?: number;
  isCollapsed: boolean;
}> = ({ label, view, isActive, Icon, onItemClick, badge, isCollapsed }) => {
  const baseClasses = 'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-base font-semibold transition-colors duration-200';
  const activeClasses = 'bg-blue-100 text-blue-700';
  const inactiveClasses = 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';
  
  return (
    <div className="relative">
        <button
          onClick={() => onItemClick(view)}
          className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses} ${isCollapsed ? 'justify-center' : ''}`}
        >
          <div className="relative flex-shrink-0">
              <Icon className="h-5 w-5" />
              {isCollapsed && badge !== undefined && badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 rounded-full h-2 w-2 animate-pulse-dot"></span>
              )}
          </div>
          {!isCollapsed && <span className="flex-grow text-left truncate">{label}</span>}
          {!isCollapsed && badge !== undefined && badge > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
              {badge}
            </span>
          )}
        </button>
    </div>
  );
};


export const AdminNav: React.FC<AdminNavProps> = ({ activeView, setActiveView, companySettings, absenceRequests }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const pendingRequestsCount = absenceRequests.filter(r => r.status === 'pending').length;

  const mainNavItems: NavItemData[] = [
      { label: "Planer", view: AdminViewType.Planner, icon: SunIcon, badge: pendingRequestsCount },
      { label: "Schichtplan", view: AdminViewType.ShiftPlanner, icon: CalendarDaysIcon },
      { label: "Zeiterfassung", view: AdminViewType.TimeTracking, icon: ClockIcon },
      { label: "Zeitauswertung", view: AdminViewType.Reports, icon: ChartBarIcon },
      { label: "Mitarbeiter", view: AdminViewType.Employees, icon: UsersIcon },
      { label: "Verwaltung", view: AdminViewType.Customers, icon: BriefcaseIcon },
  ];

  const bottomNavItems: NavItemData[] = [
    { label: "Profil", view: AdminViewType.Profile, icon: UserCircleIcon },
    { label: "Einstellungen", view: AdminViewType.Settings, icon: CogIcon },
  ];

  const handleItemClick = (view: AdminViewType) => {
    setActiveView(view);
  };

  return (
    <aside 
      className={`
        hidden md:flex md:flex-col md:bg-white md:p-4 md:rounded-xl md:shadow-md md:flex-shrink-0 
        md:sticky md:top-24 md:self-start transition-all duration-300 ease-in-out
        ${isCollapsed ? 'md:w-20' : 'md:w-60'}
      `}
    >
      <nav className="flex-grow flex flex-col">
        <div className="space-y-1">
            {mainNavItems.map((item) => {
              const isVerwaltungItem = item.label === 'Verwaltung';
              const isActive = isVerwaltungItem
                ? activeView === AdminViewType.Customers || activeView === AdminViewType.Activities
                : activeView === item.view;

              return (
                <NavItem
                  key={item.view}
                  label={item.label}
                  view={item.view}
                  isActive={isActive}
                  onItemClick={handleItemClick}
                  Icon={item.icon}
                  badge={item.badge}
                  isCollapsed={isCollapsed}
                />
              );
            })}
        </div>
        
        <div className="mt-auto space-y-1 pt-4 border-t border-gray-200">
            {bottomNavItems.map((item) => (
                <NavItem
                    key={item.view}
                    label={item.label}
                    view={item.view}
                    isActive={activeView === item.view}
                    onItemClick={handleItemClick}
                    Icon={item.icon}
                    isCollapsed={isCollapsed}
                />
            ))}
        </div>
      </nav>
      
      <div className="hidden md:block pt-2 mt-2 border-t">
          <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center justify-center w-full px-3 py-2.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              title={isCollapsed ? "Navigation ausklappen" : "Navigation einklappen"}
          >
              {isCollapsed ? <ChevronDoubleRightIcon className="h-5 w-5" /> : <ChevronDoubleLeftIcon className="h-5 w-5" />}
          </button>
      </div>
    </aside>
  );
};
