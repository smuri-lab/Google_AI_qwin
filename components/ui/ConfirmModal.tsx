
import React from 'react';
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40 p-4" onClick={onClose}>
      <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-center">{title}</h2>
          <p className="text-center text-gray-600">{message}</p>
          <div className="flex gap-4 pt-2">
            <Button type="button" onClick={onClose} className="w-full bg-gray-500 hover:bg-gray-600">
              {cancelText}
            </Button>
            <Button type="button" onClick={onConfirm} className="w-full bg-red-600 hover:bg-red-700">
              {confirmText}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
