import React from 'react';
import { Info, CheckCircle, AlertTriangle, XCircle, HelpCircle, X } from 'lucide-react';

export type ModalType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

export interface ModalOptions {
  title?: string;
  message: string;
  type?: ModalType;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface CustomModalProps {
  options: ModalOptions;
  onClose: () => void;
}

const CustomModal: React.FC<CustomModalProps> = ({ options, onClose }) => {
  const { title, message, type = 'info', onConfirm, onCancel, confirmText, cancelText } = options;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  const icons = {
    info: <Info className="text-blue-500" size={32} />,
    success: <CheckCircle className="text-green-500" size={32} />,
    warning: <AlertTriangle className="text-amber-500" size={32} />,
    error: <XCircle className="text-red-500" size={32} />,
    confirm: <HelpCircle className="text-indigo-500" size={32} />,
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-gray-50 p-3 rounded-xl">
              {icons[type]}
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>

          {title && <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>}
          <p className="text-gray-600 leading-relaxed">{message}</p>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row-reverse gap-3">
          <button
            onClick={handleConfirm}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95 ${
              type === 'error' ? 'bg-red-600 text-white hover:bg-red-700' :
              type === 'warning' ? 'bg-amber-500 text-white hover:bg-amber-600' :
              'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {confirmText || (type === 'confirm' ? 'Confirmar' : 'Entendido')}
          </button>

          {type === 'confirm' && (
            <button
              onClick={handleCancel}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-200 transition-all active:scale-95"
            >
              {cancelText || 'Cancelar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomModal;
