import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';
import { TrashIcon } from './icons/TrashIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { PlusIcon } from './icons/PlusIcon';

interface FeedbackItem {
  id: number;
  text: string;
  type: 'bug' | 'improvement';
  timestamp: number;
  context: string;
}

interface FeedbackSidebarProps {
  currentContext: string;
}

export const FeedbackSidebar: React.FC<FeedbackSidebarProps> = ({ currentContext }) => {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [text, setText] = useState('');
  const [type, setType] = useState<'bug' | 'improvement'>('bug');

  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('timepro_feedback_data');
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing feedback data", e);
      }
    }
  }, []);

  // Save to LocalStorage whenever items change
  useEffect(() => {
    localStorage.setItem('timepro_feedback_data', JSON.stringify(items));
  }, [items]);

  const handleSave = () => {
    if (!text.trim()) return;

    const newItem: FeedbackItem = {
      id: Date.now(),
      text: text.trim(),
      type,
      timestamp: Date.now(),
      context: currentContext
    };

    setItems(prev => [newItem, ...prev]);
    setText('');
  };

  const handleDelete = (id: number) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // Filter items for the current view
  const currentItems = items.filter(i => i.context === currentContext);

  return (
    <div className="flex flex-col h-full bg-gray-50 border-l border-gray-300 shadow-xl">
      <div className="p-4 bg-gray-800 text-white shadow-sm flex-shrink-0">
        <h2 className="font-bold text-lg flex items-center gap-2">
          📝 Test-Protokoll
        </h2>
        <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">
          Aktuelle Seite:
        </div>
        <div className="text-sm font-mono text-yellow-400 break-words leading-tight mt-0.5">
          {currentContext}
        </div>
      </div>

      <div className="p-4 flex-shrink-0 bg-white border-b border-gray-200">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Typ</label>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setType('bug')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-md transition-all ${type === 'bug' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <ExclamationTriangleIcon className="h-3 w-3" /> Fehler
              </button>
              <button
                onClick={() => setType('improvement')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-md transition-all ${type === 'improvement' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <PlusIcon className="h-3 w-3" /> Verbesserung
              </button>
            </div>
          </div>
          
          <Textarea 
            label="Beschreibung" 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            rows={3} 
            placeholder="Was ist aufgefallen?"
            className="text-sm"
          />
          
          <Button onClick={handleSave} className="w-full bg-gray-800 hover:bg-gray-900 text-xs py-2">
            Eintrag speichern
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Einträge für diese Seite ({currentItems.length})
        </h3>
        
        {currentItems.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm italic">
            Noch keine Einträge für diese Seite.
          </div>
        ) : (
          currentItems.map(item => (
            <div key={item.id} className={`p-3 rounded-lg border shadow-sm relative group bg-white ${item.type === 'bug' ? 'border-red-200' : 'border-blue-200'}`}>
              <div className="flex justify-between items-start gap-2">
                <div className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${item.type === 'bug' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                  {item.type === 'bug' ? 'Fehler' : 'Idee'}
                </div>
                <div className="text-[10px] text-gray-400">
                  {new Date(item.timestamp).toLocaleDateString('de-DE')} {new Date(item.timestamp).toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
              <p className="text-sm text-gray-800 mt-2 whitespace-pre-wrap">{item.text}</p>
              
              <button 
                onClick={() => handleDelete(item.id)}
                className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                title="Löschen"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
      
      <div className="p-3 bg-gray-100 border-t border-gray-200 text-[10px] text-center text-gray-500">
        Daten werden nur lokal im Browser gespeichert.
      </div>
    </div>
  );
};