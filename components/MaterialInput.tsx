
import React from 'react';
// FIX: The Material and MaterialUsage types are not exported from the types module.
// Since this component appears to be unused, dummy types are defined here to resolve the compilation error.
// import type { Material, MaterialUsage } from '../types';
import { Select } from './ui/Select';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';

type Material = {
  id: string;
  name: string;
};

type MaterialUsage = {
  materialId: string;
  quantity: number;
};

interface MaterialInputProps {
  label: string;
  materials: Material[];
  value: MaterialUsage[];
  onChange: (newValue: MaterialUsage[]) => void;
  disabled?: boolean;
}

export const MaterialInput: React.FC<MaterialInputProps> = ({ label, materials, value, onChange, disabled }) => {

  const handleAddMaterial = () => {
    onChange([...value, { materialId: '', quantity: 1 }]);
  };

  const handleMaterialChange = (index: number, materialId: string) => {
    const newValue = [...value];
    newValue[index].materialId = materialId;
    onChange(newValue);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const newValue = [...value];
    newValue[index].quantity = Math.max(0, quantity); // Ensure quantity is not negative
    onChange(newValue);
  };

  const handleRemoveMaterial = (index: number) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(newValue);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="grid grid-cols-[1fr,auto,auto] gap-2 items-end">
            <Select
              label=""
              value={item.materialId}
              onChange={(e) => handleMaterialChange(index, e.target.value)}
              disabled={disabled}
            >
              <option value="">Material auswählen...</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
            <div className="w-24">
              <Input
                label=""
                type="number"
                value={item.quantity}
                min="1"
                onChange={(e) => handleQuantityChange(index, parseInt(e.target.value, 10) || 0)}
                disabled={disabled}
                placeholder="Stück"
              />
            </div>
            <Button
              type="button"
              onClick={() => handleRemoveMaterial(index)}
              disabled={disabled}
              className="bg-red-500 hover:bg-red-600 p-2 h-10 w-10 flex items-center justify-center"
              aria-label="Remove Material"
            >
                <TrashIcon className="h-5 w-5"/>
            </Button>
          </div>
        ))}
        <Button
          type="button"
          onClick={handleAddMaterial}
          disabled={disabled}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 flex items-center justify-center gap-2"
        >
          <PlusIcon className="h-5 w-5"/>
          Material hinzufügen
        </Button>
      </div>
    </div>
  );
};
