import React from 'react';
import type { Employee, CompanySettings } from '../../types';
import { EmployeeManagement } from './EmployeeManagement';

interface EmployeeSectionProps {
  loggedInUser: Employee;
  employees: Employee[];
  onAddEmployee: (employee: Omit<Employee, 'id'>) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: number) => void;
  companySettings: CompanySettings;
}

export const EmployeeSection: React.FC<EmployeeSectionProps> = (props) => {
  return (
    <div className="space-y-6">
      <EmployeeManagement
        loggedInUser={props.loggedInUser}
        employees={props.employees}
        onAdd={props.onAddEmployee}
        onUpdate={props.onUpdateEmployee}
        onDelete={props.onDeleteEmployee}
        companySettings={props.companySettings}
      />
    </div>
  );
};