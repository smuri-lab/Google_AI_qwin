import React, { useState } from 'react';
import type { Activity, CompanySettings } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ActivityFormModal } from './ActivityFormModal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { PlusIcon } from '../icons/PlusIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';

interface ActivityManagementProps {
  activities: Activity[];
  onAdd: (activity: Omit<Activity, 'id'>) => void;
  onUpdate: (activity: Activity) => void;
  onDelete: (id: string) => void;
  companySettings: CompanySettings;
}

export const ActivityManagement: React.FC<ActivityManagementProps> = ({ activities, onAdd, onUpdate, onDelete, companySettings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState<Activity | null>(null);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);

  const activityLabel = companySettings.activityLabel || 'Tätigkeit';

  const handleOpenModal = (activity?: Activity) => {
    setActivityToEdit(activity || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActivityToEdit(null);
  };

  const handleSave = (activityData: Omit<Activity, 'id'> | Activity) => {
    if ('id' in activityData) {
      onUpdate(activityData);
    } else {
      onAdd(activityData);
    }
    handleCloseModal();
  };

  const handleDeleteClick = (activity: Activity) => {
    setActivityToDelete(activity);
  };

  const handleConfirmDelete = () => {
    if (activityToDelete) {
      onDelete(activityToDelete.id);
      setActivityToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{activityLabel}</h2>
          <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            Anlegen
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activities.length > 0 ? (
                activities.map(a => (
                  <tr key={a.id} onClick={() => handleOpenModal(a)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <td 
                      className="py-4 px-4 whitespace-nowrap font-normal"
                      title={`Bearbeiten: ${a.name}`}
                    >
                      {a.name}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex gap-2 justify-end">
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(a); }} className="p-2 text-gray-500 hover:text-red-600"><TrashIcon className="h-5 w-5"/></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="text-center py-10 text-gray-500">
                    Keine Einträge angelegt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {isModalOpen && (
        <ActivityFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          initialData={activityToEdit}
          companySettings={companySettings}
        />
      )}
      
      <ConfirmModal
        isOpen={!!activityToDelete}
        onClose={() => setActivityToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={`${activityLabel} löschen`}
        message={`Möchten Sie "${activityToDelete?.name}" wirklich löschen?`}
        confirmText="Ja, löschen"
      />
    </>
  );
};