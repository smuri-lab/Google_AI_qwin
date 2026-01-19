
import React, { useState, useEffect } from 'react';
import type { Customer, CompanySettings } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { XIcon } from '../icons/XIcon';
import { ConfirmModal } from '../ui/ConfirmModal';
import { TrashIcon } from '../icons/TrashIcon';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Omit<Customer, 'id'> | Customer) => void;
  onDelete: (id: string) => void;
  initialData: Customer | null;
  companySettings: CompanySettings;
}

const defaultState: Omit<Customer, 'id'> = {
  name: '',
  companyName: '',
  contactPerson: '',
  street: '',
  houseNumber: '',
  postalCode: '',
  city: '',
  email: '',
  phone: '',
};

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ isOpen, onClose, onSave, onDelete, initialData, companySettings }) => {
  const [formData, setFormData] = useState<Omit<Customer, 'id'>>(defaultState);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const customerLabel = companySettings.customerLabel || 'Kunde';

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData(defaultState);
    }
    setShowDeleteConfirm(false);
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initialData) {
        onSave({ ...initialData, ...formData });
    } else {
        onSave(formData);
    }
  };

  const handleConfirmDelete = () => {
    if (initialData?.id) {
        onDelete(initialData.id);
        setShowDeleteConfirm(false);
        onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-30 p-4">
        <Card className="w-full max-w-2xl relative max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
            <XIcon className="h-6 w-6" />
          </button>

          <form onSubmit={handleSubmit} className="flex flex-col flex-grow min-h-0">
            <h2 className="text-xl font-bold pr-8 my-4">{initialData ? `${customerLabel} bearbeiten` : `Neuen ${customerLabel} anlegen`}</h2>
            
            <div className="space-y-4 flex-grow overflow-y-auto pr-2 pb-4 border-t pt-4">
              <fieldset className="space-y-4 p-4 border rounded-lg">
                  <legend className="text-lg font-semibold px-2">Stammdaten</legend>
                  <Input name="name" label="Beschreibung (für Zeiterfassung)" value={formData.name} onChange={handleChange} required placeholder="z.B. Projekt A - Baustelle 1" />
                  <Input name="companyName" label="Firma" value={formData.companyName} onChange={handleChange} />
                  <Input name="contactPerson" label="Ansprechpartner" value={formData.contactPerson || ''} onChange={handleChange} />
                  <Input name="nfcTagId" label="NFC-Tag ID (Optional)" value={formData.nfcTagId || ''} onChange={handleChange} placeholder="z.B. kunde-001-standort-a" />
              </fieldset>

              <fieldset className="space-y-4 p-4 border rounded-lg">
                  <legend className="text-lg font-semibold px-2">Adresse</legend>
                  <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-4">
                      <Input name="street" label="Straße" value={formData.street || ''} onChange={handleChange} />
                      <Input name="houseNumber" label="Nr." value={formData.houseNumber || ''} onChange={handleChange} />
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-[1fr,2fr] gap-4">
                      <Input name="postalCode" label="PLZ" value={formData.postalCode || ''} onChange={handleChange} />
                      <Input name="city" label="Stadt" value={formData.city || ''} onChange={handleChange} />
                  </div>
              </fieldset>
              
              <fieldset className="space-y-4 p-4 border rounded-lg">
                  <legend className="text-lg font-semibold px-2">Kontakt</legend>
                  <Input name="email" label="E-Mail" type="email" value={formData.email || ''} onChange={handleChange} />
                  <Input name="phone" label="Telefon" type="tel" value={formData.phone || ''} onChange={handleChange} />
              </fieldset>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div>
                {initialData && (
                  <Button type="button" onClick={() => setShowDeleteConfirm(true)} className="bg-red-600 hover:bg-red-700 flex items-center gap-2">
                    <TrashIcon className="h-5 w-5" />
                    Löschen
                  </Button>
                )}
              </div>
              <div className="flex gap-4">
                <Button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600">Abbrechen</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Speichern</Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
      {initialData && (
        <ConfirmModal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleConfirmDelete}
            title={`${customerLabel} löschen`}
            message={`Möchten Sie "${initialData.name}" wirklich löschen?`}
            confirmText="Ja, löschen"
        />
      )}
    </>
  );
};