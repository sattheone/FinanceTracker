import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id
}) => {
  const toggleId = id || `toggle-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 dark:border-gray-600 rounded-lg">
      <div className="flex-1">
        <label htmlFor={toggleId} className="block">
          <h4 className="font-medium text-gray-900 dark:text-white dark:text-gray-100 cursor-pointer">
            {label}
          </h4>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300 mt-1" id={`${toggleId}-description`}>
              {description}
            </p>
          )}
        </label>
      </div>
      
      <div className="ml-4">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            id={toggleId}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="sr-only peer"
            aria-describedby={description ? `${toggleId}-description` : undefined}
          />
          <div className={`
            w-11 h-6 rounded-full peer transition-colors duration-200 ease-in-out
            ${disabled 
              ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed' 
              : 'bg-gray-200 dark:bg-gray-600'
            }
            peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800
            peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500
            peer-checked:after:translate-x-full peer-checked:after:border-white 
            after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
            after:bg-white after:border-gray-300 dark:after:border-gray-600 
            after:border after:rounded-full after:h-5 after:w-5 after:transition-all
            ${disabled ? 'after:bg-gray-100 dark:after:bg-gray-500' : ''}
          `} />
          <span className="sr-only">
            {checked ? 'Disable' : 'Enable'} {label}
          </span>
        </label>
      </div>
    </div>
  );
};

export default Toggle;