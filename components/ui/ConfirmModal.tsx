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
  isRotated?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Bestätigen', cancelText = 'Abbrechen', isRotated = false }) => {
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

  const containerClass = isRotated
    ? `fixed top-0 left-0 w-[100vh] h-[100vw] origin-top-left rotate-90 translate-x-[100vw] flex items-center justify-center z-[250] p-4 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`
    : `fixed inset-0 bg-black flex items-center justify-center z-[250] p-4 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade-in'}`;

  return (
    <div className={containerClass} onClick={handleClose}>
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