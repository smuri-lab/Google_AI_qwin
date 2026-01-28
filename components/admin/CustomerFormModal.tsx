
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { Customer, CompanySettings } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { XIcon } from '../icons/XIcon';
import { ConfirmModal } from '../ui/ConfirmModal';
import { TrashIcon } from '../icons/TrashIcon';
import { MapPinIcon } from '../icons/MapPinIcon';
import { ToggleSwitch } from '../ui/ToggleSwitch';

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
  gpsLat: undefined,
  gpsLng: undefined,
  gpsRadius: 200,
  enforceGeofencing: false,
};

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ isOpen, onClose, onSave, onDelete, initialData, companySettings }) => {
  const [formData, setFormData] = useState<Omit<Customer, 'id'>>(defaultState);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const customerLabel = companySettings.customerLabel || 'Kunde';

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            setFormData({ ...defaultState, ...initialData }); // spread default to ensure new fields exist
        } else {
            setFormData(defaultState);
        }
        setShowDeleteConfirm(false);
    }
  }, [initialData, isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      const numVal = parseFloat(value);
      setFormData(prev => ({ ...prev, [name]: isNaN(numVal) ? undefined : numVal }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsClosing(true);
    setTimeout(() => {
        if (initialData) {
            onSave({ ...initialData, ...formData });
        } else {
            onSave(formData);
        }
    }, 300);
  };

  const handleConfirmDelete = () => {
    if (initialData?.id) {
        setIsClosing(true);
        setTimeout(() => {
            onDelete(initialData.id);
        }, 300);
        setShowDeleteConfirm(false);
    }
  };
  
  const handleGetCurrentPosition = () => {
      if (!navigator.geolocation) {
          alert('Geolokalisierung wird von diesem Browser nicht unterstützt.');
          return;
      }
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
          (position) => {
              setFormData(prev => ({
                  ...prev,
                  gpsLat: position.coords.latitude,
                  gpsLng: position.coords.longitude
              }));
              setIsLocating(false);
          },
          (error) => {
              console.error(error);
              alert('Fehler beim Abrufen des Standorts. Bitte prüfen Sie die Berechtigungen.');
              setIsLocating(false);
          },
          { enableHighAccuracy: true }
      );
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <div className={`fixed inset-0 bg-black flex items-center justify-center z-30 p-4 transition-colors duration-300 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
        <Card className={`w-full max-w-2xl relative max-h-[90vh] flex flex-col ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={(e) => e.stopPropagation()}>
          <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
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
                  <div className="flex justify-between items-center">
                      <legend className="text-lg font-semibold px-2 flex items-center gap-2">
                          <MapPinIcon className="h-5 w-5 text-gray-500" />
                          Standort & Geofencing
                      </legend>
                      <Button type="button" onClick={handleGetCurrentPosition} className="bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs py-1 px-3 flex items-center gap-1" disabled={isLocating}>
                          <MapPinIcon className="h-3 w-3" />
                          {isLocating ? 'Suche...' : 'Aktuellen Standort übernehmen'}
                      </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <Input name="gpsLat" label="Breitengrad (Lat)" type="number" step="any" value={formData.gpsLat ?? ''} onChange={handleNumberChange} placeholder="z.B. 52.5200" />
                      <Input name="gpsLng" label="Längengrad (Lng)" type="number" step="any" value={formData.gpsLng ?? ''} onChange={handleNumberChange} placeholder="z.B. 13.4050" />
                  </div>
                  <Input name="gpsRadius" label="Radius (Meter)" type="number" value={formData.gpsRadius ?? ''} onChange={handleNumberChange} placeholder="Standard: 200" />
                  
                  <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                      <div className="mr-4">
                          <label className="text-sm font-medium text-gray-700 block">Geofencing erzwingen</label>
                          <span className="text-xs text-gray-500">Stempeln nur innerhalb des Radius erlauben</span>
                      </div>
                      <ToggleSwitch checked={formData.enforceGeofencing || false} onChange={(checked) => setFormData(prev => ({ ...prev, enforceGeofencing: checked }))} />
                  </div>
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
                <Button type="button" onClick={handleClose} className="bg-gray-500 hover:bg-gray-600">Abbrechen</Button>
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
    </>,
    document.body
  );
};
