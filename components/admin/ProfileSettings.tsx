import React, { useState, useEffect } from 'react';
import type { Employee, CompanySettings } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface ProfileSettingsProps {
  currentUser: Employee;
  onUpdate: (employee: Employee) => void;
  companySettings: CompanySettings;
  onUpdateCompanySettings: (settings: CompanySettings) => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ currentUser, onUpdate, companySettings, onUpdateCompanySettings }) => {
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    companyName: '', 
    street: '', 
    houseNumber: '', 
    postalCode: '', 
    city: '', 
    email: ''
  });

  const [accountData, setAccountData] = useState({
    username: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser && companySettings) {
      setProfileData({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        companyName: companySettings.companyName,
        street: companySettings.street,
        houseNumber: companySettings.houseNumber,
        postalCode: companySettings.postalCode,
        city: companySettings.city,
        email: companySettings.email,
      });
      setAccountData({
          username: currentUser.username,
          newPassword: '',
          confirmPassword: '',
      });
    }
  }, [currentUser, companySettings]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAccountData(prev => ({ ...prev, [name]: value }));
  };
  
  const flashSuccessMessage = (message: string) => {
      setSuccessMessage(message);
      window.scrollTo(0, 0);
      setTimeout(() => {
          setSuccessMessage(null);
      }, 3000);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Account validation
    if (accountData.newPassword && accountData.newPassword !== accountData.confirmPassword) {
      alert('Die Passwörter stimmen nicht überein.');
      return;
    }
    if (accountData.newPassword && accountData.newPassword.length < 6) {
        alert('Das Passwort muss mindestens 6 Zeichen lang sein.');
        return;
    }

    // User update
    const { firstName, lastName } = profileData;
    const { username, newPassword } = accountData;
    const updatedUser: Employee = {
      ...currentUser,
      firstName,
      lastName,
      username,
      lastModified: new Date().toISOString(),
    };
    if (newPassword) {
        updatedUser.password = newPassword;
    }
    onUpdate(updatedUser);

    // Company update
    const { companyName, street, houseNumber, postalCode, city, email } = profileData;
    onUpdateCompanySettings({
      ...companySettings,
      companyName,
      street,
      houseNumber,
      postalCode,
      city,
      email,
    });
    
    setAccountData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
    flashSuccessMessage('Änderungen erfolgreich gespeichert.');
  };


  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-bold mb-4">Profil & Account</h2>
        {successMessage && (
            <div className="mb-4 p-3 bg-green-100 text-green-800 border border-green-200 rounded-lg animate-fade-in">
                {successMessage}
            </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mt-4 flex flex-col md:flex-row md:gap-8">
            {/* Left Column for Profile and Company data */}
            <div className="flex-1 md:border-r md:pr-8">
              {/* Profile Section */}
              <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Profil</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input name="firstName" label="Vorname" value={profileData.firstName} onChange={handleProfileChange} required />
                      <Input name="lastName" label="Nachname" value={profileData.lastName} onChange={handleProfileChange} required />
                  </div>
              </div>

              {/* Company Section */}
              <div className="space-y-4 mt-6 pt-6 border-t">
                  <h3 className="text-lg font-semibold">Firmendaten</h3>
                  <Input name="companyName" label="Firmenname" value={profileData.companyName} onChange={handleProfileChange} required />
                  <div className="grid grid-cols-1 sm:grid-cols-[2fr,1fr] gap-4">
                      <Input name="street" label="Straße" value={profileData.street} onChange={handleProfileChange} />
                      <Input name="houseNumber" label="Nr." value={profileData.houseNumber} onChange={handleProfileChange} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr,2fr] gap-4">
                      <Input name="postalCode" label="PLZ" value={profileData.postalCode} onChange={handleProfileChange} />
                      <Input name="city" label="Stadt" value={profileData.city} onChange={handleProfileChange} />
                  </div>
              </div>
            </div>

            {/* Right Column for Account data */}
            <div className="flex-1 mt-6 md:mt-0 pt-6 md:pt-0 border-t md:border-t-0">
              <h3 className="text-lg font-semibold">Account</h3>
              <div className="space-y-4 mt-4">
                <Input name="username" label="Benutzername" value={accountData.username} onChange={handleAccountChange} required />
                <Input name="email" label="Firmen-E-Mail (für Passwort-Reset)" type="email" value={profileData.email} onChange={handleProfileChange} required />
                <Input name="newPassword" label="Neues Passwort" type="password" value={accountData.newPassword} onChange={handleAccountChange} placeholder="Leer lassen, um nicht zu ändern" />
                <Input name="confirmPassword" label="Neues Passwort bestätigen" type="password" value={accountData.confirmPassword} onChange={handleAccountChange} />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-6 mt-6 border-t">
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Änderungen speichern
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};