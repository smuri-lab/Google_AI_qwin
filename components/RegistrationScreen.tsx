import React, { useState } from 'react';
import type { Employee, CompanySettings } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface RegistrationScreenProps {
  onRegister: (
      employeeData: Omit<Employee, 'id' | 'lastModified' | 'contractHistory' | 'role' | 'isActive'>,
      companyData: Omit<CompanySettings, 'adminTimeFormat' | 'employeeTimeFormat'>
  ) => void;
  onSwitchToLogin: () => void;
  hasAdminAccount?: boolean;
}

export const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ onRegister, onSwitchToLogin, hasAdminAccount }) => {
    const [formData, setFormData] = useState({
        // Admin user
        firstName: '',
        lastName: '',
        username: '',
        password: '',
        confirmPassword: '',
        // Company
        companyName: '',
        street: '',
        houseNumber: '',
        postalCode: '',
        city: '',
        email: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const { 
            firstName, lastName, username, password, confirmPassword,
            companyName, street, houseNumber, postalCode, city, email
        } = formData;
        
        if (password !== confirmPassword) {
            alert("Die Passwörter stimmen nicht überein.");
            return;
        }

        const employeeData = { 
            firstName, 
            lastName, 
            dateOfBirth: '', // Set to empty as it's removed from form
            username, 
            password, 
            firstWorkDay: new Date().toLocaleDateString('sv-SE') 
        };
        const companyData = { companyName, street, houseNumber, postalCode, city, email };

        onRegister(employeeData, companyData);
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 relative z-50">
            <Card className="w-full max-w-2xl">
                <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Neues Unternehmen registrieren</h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <fieldset className="space-y-4 p-4 border rounded-lg">
                        <legend className="text-lg font-semibold px-2">Firmendaten</legend>
                        <Input name="companyName" label="Firmenname" value={formData.companyName} onChange={handleChange} required />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input name="firstName" label="Ihr Vorname" value={formData.firstName} onChange={handleChange} required />
                            <Input name="lastName" label="Ihr Nachname" value={formData.lastName} onChange={handleChange} required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-4">
                            <Input name="street" label="Straße" value={formData.street} onChange={handleChange} required />
                            <Input name="houseNumber" label="Nr." value={formData.houseNumber} onChange={handleChange} required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr,2fr] gap-4">
                            <Input name="postalCode" label="PLZ" value={formData.postalCode} onChange={handleChange} required />
                            <Input name="city" label="Stadt" value={formData.city} onChange={handleChange} required />
                        </div>
                        <Input name="email" label="Firmen-E-Mail" type="email" value={formData.email} onChange={handleChange} required />
                    </fieldset>

                    <fieldset className="space-y-4 p-4 border rounded-lg">
                        <legend className="text-lg font-semibold px-2">Ihr Administrator-Account</legend>
                        <Input name="username" label="Benutzername" value={formData.username} onChange={handleChange} required />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input name="password" label="Passwort" type="password" value={formData.password} onChange={handleChange} required minLength={6} placeholder="Mind. 6 Zeichen" />
                            <Input name="confirmPassword" label="Passwort wiederholen" type="password" value={formData.confirmPassword} onChange={handleChange} required minLength={6} />
                        </div>
                    </fieldset>
                    
                    <div className="pt-2">
                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                            Registrierung abschließen
                        </Button>
                    </div>
                </form>
                 {hasAdminAccount && (
                    <div className="mt-6 pt-4 border-t text-center text-sm">
                        <p className="text-gray-600">
                            Bereits registriert?{' '}
                            <button onClick={onSwitchToLogin} className="font-medium text-blue-600 hover:text-blue-500">
                                Zum Login
                            </button>
                        </p>
                    </div>
                 )}
            </Card>
        </div>
    );
};