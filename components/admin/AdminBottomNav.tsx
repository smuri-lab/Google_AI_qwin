import React from 'react';
import { AdminViewType, type AbsenceRequest } from '../../types';
import { SunIcon } from '../icons/SunIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { BriefcaseIcon } from '../icons/BriefcaseIcon';

interface AdminBottomNavProps {
  activeView: AdminViewType;
  setActiveView: (view: AdminViewType) => void;
  absenceRequests: AbsenceRequest[];
}

interface NavItemProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  Icon: React.ElementType;
  badge?: number;
}

const NavItem: React.FC<NavItemProps> = ({ label, isActive, onClick, Icon, badge }) => {
  const activeClasses = 'text-blue-600';
  const inactiveClasses = 'text-gray-500 hover:text-blue-600';

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full transition-colors duration-200 relative pt-1 ${isActive ? activeClasses : inactiveClasses}`}
    >
      <div className="relative">
        <Icon className="h-6 w-6 mb-1" />
        {badge !== undefined && badge > 0 && (
            <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {badge}
            </span>
        )}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};

export const AdminBottomNav: React.FC<AdminBottomNavProps> = ({ activeView, setActiveView, absenceRequests }) => {
  const pendingRequestsCount = absenceRequests.filter(r => r.status === 'pending').length;
  
  const isVerwaltungActive = activeView === AdminViewType.Customers || activeView === AdminViewType.Activities;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 shadow-[0_-2px_5px_rgba(0,0,0,0.05)] z-30">
      <div className="flex justify-around items-center h-full max-w-4xl mx-auto px-2">
        <NavItem 
          label="Planer" 
          isActive={activeView === AdminViewType.Planner} 
          onClick={() => setActiveView(AdminViewType.Planner)}
          Icon={SunIcon}
          badge={pendingRequestsCount}
        />
        <NavItem 
          label="Zeiten" 
          isActive={activeView === AdminViewType.TimeTracking} 
          onClick={() => setActiveView(AdminViewType.TimeTracking)}
          Icon={ClockIcon}
        />
        <NavItem 
          label="Berichte" 
          isActive={activeView === AdminViewType.Reports} 
          onClick={() => setActiveView(AdminViewType.Reports)}
          Icon={ChartBarIcon}
        />
        <NavItem 
          label="Mitarbeiter" 
          isActive={activeView === AdminViewType.Employees} 
          onClick={() => setActiveView(AdminViewType.Employees)}
          Icon={UsersIcon}
        />
        <NavItem 
          label="Verwaltung" 
          isActive={isVerwaltungActive}
          onClick={() => setActiveView(AdminViewType.Customers)}
          Icon={BriefcaseIcon}
        />
      </div>
    </div>
  );
};