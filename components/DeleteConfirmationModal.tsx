
import React from 'react';
import { AlertTriangle, Info, Trash2, X, RefreshCw } from 'lucide-react';

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName?: string;
  description?: string;
  impactList?: string[];
  confirmLabel?: string;
  isDestructive?: boolean; // true for red delete, false for neutral/blue
  icon?: 'trash' | 'refresh';
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  description,
  impactList,
  confirmLabel = "Confirm Delete",
  isDestructive = true,
  icon = 'trash'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border ${isDestructive ? 'border-red-100' : 'border-blue-100'}`}>
        <div className={`${isDestructive ? 'bg-red-50 border-red-100 text-red-900' : 'bg-blue-50 border-blue-100 text-blue-900'} p-4 border-b flex items-center gap-3`}>
          <div className={`p-2 rounded-full ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
             <AlertTriangle size={20} />
          </div>
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-gray-700 leading-relaxed">
            {description || "Are you sure you want to proceed?"} 
            {itemName && <span className="font-bold text-gray-900 ml-1">"{itemName}"?</span>}
          </p>
          
          {impactList && impactList.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm space-y-2">
              <h4 className="font-bold text-gray-700 flex items-center gap-2">
                 <Info size={14} className="text-blue-500" /> Impact Analysis:
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-600 text-xs md:text-sm">
                {impactList.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-gray-50 p-4 flex justify-end gap-3 border-t border-gray-100">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm flex items-center gap-2 transition-colors ${
              isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {icon === 'trash' ? <Trash2 size={16} /> : <RefreshCw size={16} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
