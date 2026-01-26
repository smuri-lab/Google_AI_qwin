import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import type { Employee } from '../types';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => string | null;
  onSwitchToRegister: () => void;
  employees: Employee[];
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onSwitchToRegister, employees }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Reset error on new submission
    if (!username) {
        setError("Bitte geben Sie einen Benutznamen ein.");
        return;
    }
    if (!password) {
        setError("Bitte geben Sie ein Passwort ein.");
        return;
    }
    const errorMsg = onLogin(username, password);
    if (errorMsg) {
      setError(errorMsg);
    }
  };

  const handleForgotPassword = (username: string): string | null => {
    const user = employees.find(e => e.username.toLowerCase() === username.toLowerCase());
    if (user && user.role === 'admin') {
        return user.password || 'Kein Passwort für diesen Admin-Account hinterlegt.';
    }
    return null;
  };

  const hasAdminAccount = employees.some(e => e.role === 'admin');

  return (
    <>
      <div className="min-h-screen bg-gray-100 flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 relative z-50">
        <Card className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Willkommen bei TimePro</h1>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input 
              label="Benutzername"
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
            <Input 
              label="Passwort"
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            
            <div className="pt-2">
              <p className="text-sm text-red-600 text-center h-10 flex items-center justify-center">
                {error || '\u00A0'}
              </p>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                Anmelden
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            <button onClick={() => setIsForgotModalOpen(true)} className="font-medium text-blue-600 hover:text-blue-500">
                Passwort vergessen?
            </button>
          </div>
          {!hasAdminAccount && (
            <div className="mt-6 pt-4 border-t text-center text-sm">
                <p className="text-gray-600">
                    Noch kein Konto?{' '}
                    <button onClick={onSwitchToRegister} className="font-medium text-blue-600 hover:text-blue-500">
                        Jetzt registrieren
                    </button>
                </p>
            </div>
          )}
        </Card>
      </div>
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        onFindPassword={handleForgotPassword}
      />
    </>
  );
};