import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import type { Employee } from '../types';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => string | null;
  onSwitchToRegister: () => void;
  employees: Employee[];
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onSwitchToRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errorMsg = onLogin(username, password);
    if (errorMsg) setError(errorMsg);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">Login</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Benutzername" value={username} onChange={e => setUsername(e.target.value)} required />
          <Input label="Passwort" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <Button type="submit" className="w-full bg-blue-600">Anmelden</Button>
        </form>
        <div className="mt-6 pt-4 border-t text-center text-sm">
            <button onClick={onSwitchToRegister} className="text-blue-600">Noch kein Account? Jetzt registrieren</button>
        </div>
      </Card>
    </div>
  );
};