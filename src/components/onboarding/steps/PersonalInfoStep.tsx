import React from 'react';
import { User, Mail, Calendar } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';

const PersonalInfoStep: React.FC = () => {
  const { userProfile, updateUserProfile } = useData();

  const handleChange = (field: string, value: string) => {
    if (!userProfile) return;
    updateUserProfile({
      personalInfo: {
        ...userProfile.personalInfo,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Personal Information</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Let's start with some basic information about you and your family.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Your Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <User className="w-5 h-5 mr-2" />
            Your Information
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={userProfile?.personalInfo?.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className="input-field theme-input"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="email"
                value={userProfile?.personalInfo?.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="input-field pl-10 theme-input"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Date of Birth
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="date"
                value={userProfile?.personalInfo?.dateOfBirth || ''}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                className="input-field pl-10 theme-input"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoStep;