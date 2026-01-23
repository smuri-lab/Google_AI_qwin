import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { XIcon } from './icons/XIcon';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFindPassword: (username: string) => string | null;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose, onFindPassword }) => {
  const [username, setUsername] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const foundPassword = onFindPassword(username);
    if (foundPassword) {
      setResult(`Das Passwort für den Admin "${username}" lautet: ${foundPassword}`);
    } else {
      setResult(`Kein Admin-Account mit dem Benutzernamen "${username}" gefunden.`);
    }
  };
  
  const handleClose = () => {
      setIsClosing(true);
      setTimeout(() => {
          setUsername('');
          setResult(null);
          onClose();
      }, 300);
  }

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black flex items-center justify-center z-30 p-4 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
      <Card className={`w-full max-w-sm relative ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={(e) => e.stopPropagation()}>
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
          <XIcon className="h-6 w-6" />
        </button>
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-xl font-bold text-center">Passwort wiederherstellen</h2>
          <p className="text-sm text-center text-gray-600">Geben Sie den Benutzernamen des Admins ein, um das Passwort anzuzeigen (Demo).</p>
          <Input 
            label="Admin-Benutzername" 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required
            autoFocus 
          />
          {result && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-md text-sm">
                  {result}
              </div>
          )}
          <div className="flex gap-4 pt-2">
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Passwort anzeigen
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};