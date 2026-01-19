import React, { useState, useEffect } from 'react';
import { AdminViewType, type Customer, type Activity, type CompanySettings } from '../../types';
import { CustomerManagement } from './CustomerManagement';
import { ActivityManagement } from './ActivityManagement';

// Props will be a combination of what both child components need
interface VerwaltungViewProps {
  initialView: AdminViewType;
  setActiveView: (view: AdminViewType) => void;
  customers: Customer[];
  onAddCustomer: (customer: Omit<Customer, 'id'>) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  activities: Activity[];
  onAddActivity: (activity: Omit<Activity, 'id'>) => void;
  onUpdateActivity: (activity: Activity) => void;
  onDeleteActivity: (id: string) => void;
  companySettings: CompanySettings;
}

export const VerwaltungView: React.FC<VerwaltungViewProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'customers' | 'activities'>(
    props.initialView === AdminViewType.Activities ? 'activities' : 'customers'
  );

  useEffect(() => {
    setActiveTab(props.initialView === AdminViewType.Activities ? 'activities' : 'customers');
  }, [props.initialView]);

  const handleTabChange = (tab: 'customers' | 'activities') => {
    setActiveTab(tab);
    props.setActiveView(tab === 'customers' ? AdminViewType.Customers : AdminViewType.Activities);
  };

  const customerLabel = props.companySettings.customerLabel || 'Zeitkategorie 1';
  const activityLabel = props.companySettings.activityLabel || 'Zeitkategorie 2';

  const tabs = [
    { id: 'customers', label: customerLabel },
    { id: 'activities', label: activityLabel },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as 'customers' | 'activities')}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'customers' && (
          <CustomerManagement
            customers={props.customers}
            onAdd={props.onAddCustomer}
            onUpdate={props.onUpdateCustomer}
            onDelete={props.onDeleteCustomer}
            companySettings={props.companySettings}
          />
        )}
        {activeTab === 'activities' && (
          <ActivityManagement
            activities={props.activities}
            onAdd={props.onAddActivity}
            onUpdate={props.onUpdateActivity}
            onDelete={props.onDeleteActivity}
            companySettings={props.companySettings}
          />
        )}
      </div>
    </div>
  );
};