
import React, { useState } from 'react';
import type { Employee, CompanySettings } from '../../types';
import { EmploymentType } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { EmployeeFormModal } from './EmployeeFormModal';
import { PlusIcon } from '../icons/PlusIcon';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { getContractDetailsForDate, formatHoursAndMinutes } from '../utils';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { MinusCircleIcon } from '../icons/MinusCircleIcon';
import { InformationCircleIcon } from '../icons/InformationCircleIcon';

interface EmployeeManagementProps {
  loggedInUser: Employee;
  employees: Employee[];
  onAdd: (employee: Omit<Employee, 'id'>) => void;
  onUpdate: (employee: Employee) => void;
  onDelete: (id: number) => void;
  companySettings: CompanySettings;
}

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ loggedInUser, employees, onAdd, onUpdate, onDelete, companySettings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);

  const timeFormat = companySettings.adminTimeFormat || 'hoursMinutes';

  const handleOpenModal = (employee?: Employee) => {
    setEmployeeToEdit(employee || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEmployeeToEdit(null);
  };

  const handleSave = (employeeData: Omit<Employee, 'id'> | Employee) => {
    if ('id' in employeeData) {
      onUpdate(employeeData);
    } else {
      onAdd(employeeData);
    }
    handleCloseModal();
  };

  const handleDashboardTypeChange = (employee: Employee, dashboardType: 'standard' | 'simplified') => {
    onUpdate({ ...employee, dashboardType, lastModified: new Date().toISOString() });
  };

  const getEmploymentTypeLabel = (type: EmploymentType) => {
    switch (type) {
      case EmploymentType.FullTime: return 'Vollzeit';
      case EmploymentType.PartTime: return 'Teilzeit';
      case EmploymentType.MiniJob: return 'Minijob';
    }
  };

  return (
    <>
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Mitarbeiter verwalten</h2>
          <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            Anlegen
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anstellung</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Soll/Monat</th>
                <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Urlaubstage</th>
                <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stundenkonto</th>
                <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1">
                        <span>Urlaubswarnung</span>
                        <span title="Warnung für Resturlaub aus dem Vorjahr anzeigen">
                            <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                        </span>
                    </div>
                </th>
                <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Autom. Pause</th>
                <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.length > 0 ? (
                employees.map(emp => {
                  const currentContract = getContractDetailsForDate(emp, new Date());
                  const isSuperAdmin = emp.id === 0;
                  return (
                    <tr 
                      key={emp.id}
                      onClick={() => emp.isActive && handleOpenModal(emp)}
                      className={`transition-colors ${!emp.isActive ? 'bg-gray-50 text-gray-500' : 'cursor-pointer hover:bg-gray-50'}`}
                    >
                      <td className="py-4 px-4 whitespace-nowrap font-normal">{emp.firstName} {emp.lastName}</td>
                      <td className="py-4 px-4 whitespace-nowrap">{getEmploymentTypeLabel(currentContract.employmentType)}</td>
                      <td className="py-4 px-4 whitespace-nowrap">{formatHoursAndMinutes(currentContract.monthlyTargetHours, timeFormat)}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-center">{currentContract.vacationDays}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-center">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDashboardTypeChange(emp, emp.dashboardType !== 'simplified' ? 'simplified' : 'standard');
                            }}
                            className="p-1 rounded-full transition-colors"
                            title={emp.dashboardType !== 'simplified' ? 'Stundenkonto aktiv (klicken zum Deaktivieren)' : 'Stundenkonto inaktiv (klicken zum Aktivieren)'}
                            aria-label={emp.dashboardType !== 'simplified' ? 'Stundenkonto deaktivieren' : 'Stundenkonto aktivieren'}
                        >
                            {emp.dashboardType !== 'simplified' ? (
                                <CheckCircleIcon className="h-6 w-6 text-green-500" />
                            ) : (
                                <MinusCircleIcon className="h-6 w-6 text-gray-400" />
                            )}
                        </button>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-center">
                          <ToggleSwitch
                              checked={emp.showVacationWarning ?? true}
                              onChange={(checked) => onUpdate({ ...emp, showVacationWarning: checked, lastModified: new Date().toISOString() })}
                          />
                      </td>
                       <td className="py-4 px-4 whitespace-nowrap text-center">
                          <ToggleSwitch
                              checked={emp.automaticBreakDeduction ?? false}
                              onChange={(checked) => onUpdate({ ...emp, automaticBreakDeduction: checked, lastModified: new Date().toISOString() })}
                          />
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-center">
                          <ToggleSwitch
                              checked={emp.isActive}
                              onChange={(checked) => onUpdate({ ...emp, isActive: checked, lastModified: new Date().toISOString() })}
                              disabled={isSuperAdmin}
                          />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-500">
                    Keine Mitarbeiter angelegt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {isModalOpen && (
        <EmployeeFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          onDelete={onDelete}
          initialData={employeeToEdit}
          loggedInUser={loggedInUser}
          companySettings={companySettings}
        />
      )}
    </>
  );
};
