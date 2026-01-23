import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Bestätigen', cancelText = 'Abbrechen' }) => {
  const [isClosing, setIsClosing] = useState(false);

  if (!isOpen) return null;
  
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };
  
  const handleConfirm = () => {
    setIsClosing(true);
    setTimeout(onConfirm, 300);
  };

  return (
    <div className={`fixed inset-0 bg-black flex items-center justify-center z-40 p-4 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`} onClick={handleClose}>
      <Card className={`w-full max-w-sm ${isClosing ? 'animate-modal-slide-down' : 'animate-modal-slide-up'}`} onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-center">{title}</h2>
          <p className="text-center text-gray-600">{message}</p>
          <div className="flex gap-4 pt-2">
            <Button type="button" onClick={handleClose} className="w-full bg-gray-500 hover:bg-gray-600">
              {cancelText}
            </Button>
            <Button type="button" onClick={handleConfirm} className="w-full bg-red-600 hover:bg-red-700">
              {confirmText}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};