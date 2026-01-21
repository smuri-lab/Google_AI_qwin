import React, { useState, useEffect } from 'react';
import type { AbsenceRequest, TimeEntry, Employee, Customer, Activity, Holiday, CompanySettings, TimeBalanceAdjustment, HolidaysByYear } from '../types';
import { AdminViewType } from '../types';
import { AdminNav } from './admin/AdminNav';
import { SettingsView } from './admin/SettingsView';
import { TimeTrackingManagement } from './admin/TimeTrackingManagement';
import { ProfileSettings } from './admin/ProfileSettings';
import { ReportsView } from './admin/ReportsView';
import { PlannerView } from './admin/PlannerView';
import { EmployeeSection } from './admin/EmployeeSection';
import { VerwaltungView } from './admin/VerwaltungView';
import { AdminBottomNav } from './admin/AdminBottomNav';

interface AdminViewProps {
  loggedInUser: Employee;
  activeView: AdminViewType;
  setActiveView: (view: AdminViewType) => void;
  absenceRequests: AbsenceRequest[];
  timeEntries: TimeEntry[];
  employees: Employee[];
  customers: Customer[];
  activities: Activity[];
  selectedState: string;
  timeTrackingMethod: 'all' | 'manual';
  holidaysByYear: HolidaysByYear;
  companySettings: CompanySettings;
  timeBalanceAdjustments: TimeBalanceAdjustment[];
  onEnsureHolidaysForYear: (year: number) => void;
  addAbsenceRequest: (request: Omit<AbsenceRequest, 'id' | 'status'>, status: AbsenceRequest['status']) => void;
  addTimeBalanceAdjustment: (adjustment: Omit<TimeBalanceAdjustment, 'id'>) => void;
  onUpdateRequestStatus: (id: number, status: 'approved' | 'rejected', comment?: string) => void;
  onUpdateAbsenceRequest: (request: AbsenceRequest) => void;
  onDeleteAbsenceRequest: (id: number) => void;
  onAddTimeEntry: (entry: Omit<TimeEntry, 'id' | 'employeeId'>, employeeId: number) => void;
  onUpdateTimeEntry: (entry: TimeEntry) => void;
  onDeleteTimeEntry: (id: number) => void;
  onAddEmployee: (employee: Omit<Employee, 'id'>) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: number) => void;
  onAddCustomer: (customer: Omit<Customer, 'id'>) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onAddActivity: (activity: Omit<Activity, 'id'>) => void;
  onUpdateActivity: (activity: Activity) => void;
  onDeleteActivity: (id: string) => void;
  onStateChange: (state: string) => void;
  onTimeTrackingMethodChange: (method: 'all' | 'manual') => void;
  onUpdateCompanySettings: (settings: CompanySettings) => void;
  onUpdateTimeBalanceAdjustment: (adjustment: TimeBalanceAdjustment) => void;
  onDeleteTimeBalanceAdjustment: (id: number) => void;
}

export const AdminView: React.FC<AdminViewProps> = (props) => {
  const { activeView, setActiveView } = props;

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [activeView]);

  const renderActiveView = () => {
    switch (activeView) {
      case AdminViewType.Planner:
        return <PlannerView {...props} />;
      case AdminViewType.TimeTracking:
        return <TimeTrackingManagement {...props} />;
      case AdminViewType.Reports:
        return <ReportsView
                  timeEntries={props.timeEntries}
                  customers={props.customers}
                  activities={props.activities}
                  companySettings={props.companySettings}
                  employees={props.employees}
               />;
      case AdminViewType.Employees:
        return <EmployeeSection
                  loggedInUser={props.loggedInUser}
                  employees={props.employees}
                  onAddEmployee={props.onAddEmployee}
                  onUpdateEmployee={props.onUpdateEmployee}
                  onDeleteEmployee={props.onDeleteEmployee}
                  companySettings={props.companySettings}
                />;
      case AdminViewType.Customers:
      case AdminViewType.Activities:
        return <VerwaltungView 
                  {...props}
                  initialView={activeView}
                  setActiveView={setActiveView}
               />;
      case AdminViewType.Profile:
        return <ProfileSettings
                  currentUser={props.loggedInUser}
                  onUpdate={props.onUpdateEmployee}
                  companySettings={props.companySettings}
                  onUpdateCompanySettings={props.onUpdateCompanySettings}
                />;
      case AdminViewType.Settings:
        return <SettingsView 
                  selectedState={props.selectedState}
                  onStateChange={props.onStateChange}
                  timeTrackingMethod={props.timeTrackingMethod}
                  onTimeTrackingMethodChange={props.onTimeTrackingMethodChange}
                  companySettings={props.companySettings}
                  onUpdateCompanySettings={props.onUpdateCompanySettings}
                />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-8xl mx-auto w-full">
        <div className="flex flex-col md:flex-row gap-6 items-start pt-6">
            <AdminNav 
                activeView={activeView} 
                setActiveView={setActiveView} 
                companySettings={props.companySettings} 
                absenceRequests={props.absenceRequests}
            />
            <main className="flex-grow w-full overflow-x-auto pb-16 md:pb-0">
                {renderActiveView()}
            </main>
        </div>
        <AdminBottomNav
            activeView={activeView}
            setActiveView={setActiveView}
            absenceRequests={props.absenceRequests}
        />
    </div>
  );
};