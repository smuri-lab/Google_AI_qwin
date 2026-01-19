
import React from 'react';
import { Card } from '../ui/Card';

interface PlaceholderViewProps {
  title: string;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({ title }) => {
  return (
    <Card>
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-500">Dieser Bereich befindet sich noch in der Entwicklung.</p>
      </div>
    </Card>
  );
};
