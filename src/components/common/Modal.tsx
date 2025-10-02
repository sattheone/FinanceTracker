import React from 'react';
import { X } from 'lucide-react';
import { useThemeClasses, cn } from '../../hooks/useThemeClasses';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const theme = useThemeClasses();
  
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div className={cn(theme.overlay, 'flex items-center justify-center z-50 p-4')}>
      <div className={cn(
        theme.bgElevated,
        theme.border,
        'rounded-lg w-full max-h-[90vh] overflow-hidden border',
        sizeClasses[size]
      )}>
        <div className={cn(theme.border, 'p-6 border-b')}>
          <div className="flex items-center justify-between">
            <h2 className={cn(theme.textPrimary, 'text-xl font-semibold')}>{title}</h2>
            <button
              onClick={onClose}
              className={cn(
                theme.interactive,
                'p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'
              )}
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className={cn(theme.bgElevated, 'p-6 overflow-y-auto max-h-[calc(90vh-120px)]')}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;