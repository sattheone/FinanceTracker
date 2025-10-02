import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start mb-6">
            <TrendingUp className="h-12 w-12 text-primary-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">FinanceTracker</h1>
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Take Control of Your Financial Future
          </h2>
          
          <p className="text-lg text-gray-600 mb-8">
            Track assets, monitor goals, manage insurance, and plan for retirement 
            with our comprehensive personal finance platform.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-primary-600 font-semibold">1</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Asset Tracking</h4>
                <p className="text-sm text-gray-600">Monitor stocks, mutual funds, gold, and more</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-primary-600 font-semibold">2</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Goal Planning</h4>
                <p className="text-sm text-gray-600">Set and track financial goals with precision</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-primary-600 font-semibold">3</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Insurance Management</h4>
                <p className="text-sm text-gray-600">Organize policies and track coverage</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-primary-600 font-semibold">4</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Smart Forecasting</h4>
                <p className="text-sm text-gray-600">Project your financial future with scenarios</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {isLogin ? (
            <LoginForm onToggleMode={() => setIsLogin(false)} />
          ) : (
            <RegisterForm onToggleMode={() => setIsLogin(true)} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;