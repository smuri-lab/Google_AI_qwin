
import React, { useState } from 'react';
import type { Customer, CompanySettings } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CustomerFormModal } from './CustomerFormModal';
import { PlusIcon } from '../icons/PlusIcon';

interface CustomerManagementProps {
  customers: Customer[];
  onAdd: (customer: Omit<Customer, 'id'>) => void;
  onUpdate: (customer: Customer) => void;
  onDelete: (id: string) => void;
  companySettings: CompanySettings;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({ customers, onAdd, onUpdate, onDelete, companySettings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const customerLabel = companySettings.customerLabel || 'Kunde';

  const handleOpenModal = (customer?: Customer) => {
    setCustomerToEdit(customer || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCustomerToEdit(null);
  };

  const handleSave = (customerData: Omit<Customer, 'id'> | Customer) => {
    if ('id' in customerData) {
      onUpdate(customerData);
    } else {
      onAdd(customerData);
    }
    handleCloseModal();
  };

  return (
    <>
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{customerLabel}</h2>
          <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            Anlegen
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NFC-Tag ID</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beschreibung (Zeiterfassung)</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firma</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ansprechpartner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.length > 0 ? (
                customers.map(c => (
                  <tr key={c.id} onClick={() => handleOpenModal(c)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4 whitespace-nowrap font-mono text-xs">{c.nfcTagId || '-'}</td>
                    <td 
                      className="py-4 px-4 whitespace-nowrap font-normal"
                      title={`Bearbeiten: ${c.name}`}
                    >
                      {c.name}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">{c.companyName}</td>
                    <td className="py-4 px-4 whitespace-nowrap">{c.contactPerson || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-500">
                    Keine Einträge angelegt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {isModalOpen && (
        <CustomerFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          initialData={customerToEdit}
          companySettings={companySettings}
          onDelete={onDelete}
        />
      )}
    </>
  );
};
