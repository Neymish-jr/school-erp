import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg mx-auto border border-slate-700">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-700">
          <h3 className="text-2xl font-semibold text-cyan-400">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>
        <div className="text-slate-100">
          {children}
        </div>
      </div>
    </div>,
    document.getElementById('modal-root') || document.body
  );
};

export default Modal;
