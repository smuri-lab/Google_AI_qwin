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
}

export const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ onRegister, onSwitchToLogin }) => {
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', username: '', password: '', confirmPassword: '',
        companyName: '', street: '', houseNumber: '', postalCode: '', city: '', email: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) { alert("Die Passwörter stimmen nicht überein."); return; }
        onRegister({ firstName: formData.firstName, lastName: formData.lastName, dateOfBirth: '', username: formData.username, password: formData.password, firstWorkDay: new Date().toLocaleDateString('sv-SE') }, { companyName: formData.companyName, street: formData.street, houseNumber: formData.houseNumber, postalCode: formData.postalCode, city: formData.city, email: formData.email });
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <h1 className="text-2xl font-bold text-center mb-6">Firma registrieren</h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <fieldset className="space-y-4 p-4 border rounded-lg">
                        <legend className="font-semibold px-2">Firmendaten</legend>
                        <Input name="companyName" label="Firmenname" value={formData.companyName} onChange={handleChange} required />
                        <Input name="email" label="Firmen-E-Mail" type="email" value={formData.email} onChange={handleChange} required />
                    </fieldset>
                    <fieldset className="space-y-4 p-4 border rounded-lg">
                        <legend className="font-semibold px-2">Administrator-Account</legend>
                        <Input name="username" label="Benutzername" value={formData.username} onChange={handleChange} required />
                        <Input name="password" label="Passwort" type="password" value={formData.password} onChange={handleChange} required minLength={6} />
                        <Input name="confirmPassword" label="Passwort wiederholen" type="password" value={formData.confirmPassword} onChange={handleChange} required />
                    </fieldset>
                    <Button type="submit" className="w-full bg-blue-600">Registrierung abschließen</Button>
                </form>
                <div className="mt-4 text-center">
                    <button onClick={onSwitchToLogin} className="text-blue-600 hover:underline text-sm">Bereits registriert? Zum Login</button>
                </div>
            </Card>
        </div>
    );
};