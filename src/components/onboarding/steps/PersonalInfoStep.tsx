import React from 'react';
import { User, Mail, Calendar, Users } from 'lucide-react';
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

  const handleChildChange = (index: number, field: string, value: string) => {
    if (!userProfile) return;
    const children = [...(userProfile.personalInfo.children || [])];
    children[index] = { ...children[index], [field]: value };
    
    updateUserProfile({
      personalInfo: {
        ...userProfile.personalInfo,
        children,
      },
    });
  };

  const addChild = () => {
    if (!userProfile) return;
    const children = [...(userProfile.personalInfo.children || [])];
    children.push({ name: '', dateOfBirth: '' });
    
    updateUserProfile({
      personalInfo: {
        ...userProfile.personalInfo,
        children,
      },
    });
  };

  const removeChild = (index: number) => {
    if (!userProfile) return;
    const children = [...(userProfile.personalInfo.children || [])];
    children.splice(index, 1);
    
    updateUserProfile({
      personalInfo: {
        ...userProfile.personalInfo,
        children,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
        <p className="text-gray-600">
          Let's start with some basic information about you and your family.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Your Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Your Information
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={userProfile?.personalInfo?.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className="input-field"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="email"
                value={userProfile?.personalInfo?.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="input-field pl-10"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date of Birth
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="date"
                value={userProfile?.personalInfo?.dateOfBirth || ''}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>

        {/* Spouse Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Spouse Information (Optional)
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Spouse Name
            </label>
            <input
              type="text"
              value={userProfile?.personalInfo?.spouseName || ''}
              onChange={(e) => handleChange('spouseName', e.target.value)}
              className="input-field"
              placeholder="Enter spouse name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Spouse Date of Birth
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="date"
                value={userProfile?.personalInfo?.spouseDateOfBirth || ''}
                onChange={(e) => handleChange('spouseDateOfBirth', e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Children Information */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Children (Optional)</h3>
          <button
            onClick={addChild}
            className="btn-primary text-sm"
          >
            Add Child
          </button>
        </div>

        {userProfile?.personalInfo?.children?.map((child, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-gray-200 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Child Name
              </label>
              <input
                type="text"
                value={child.name}
                onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                className="input-field"
                placeholder="Enter child name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="date"
                    value={child.dateOfBirth}
                    onChange={(e) => handleChildChange(index, 'dateOfBirth', e.target.value)}
                    className="input-field pl-10"
                  />
                </div>
                <button
                  onClick={() => removeChild(index)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}

        {(!userProfile?.personalInfo?.children || userProfile.personalInfo.children.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No children added yet. Click "Add Child" to include family members.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalInfoStep;