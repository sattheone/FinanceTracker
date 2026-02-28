import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div style={{ backgroundColor: 'var(--color-bg-primary)' }} className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start mb-6">
            <TrendingUp className="h-12 w-12 mr-3" style={{ color: 'var(--color-highlight)' }} />
            <h1 className="text-4xl font-bold font-serif" style={{ color: 'var(--color-text-primary)' }}>FinanceTracker</h1>
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-bold font-serif mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Take Control of Your Financial Future
          </h2>
          
          <p className="text-lg mb-8" style={{ color: 'var(--color-text-secondary)' }}>
            Track assets, monitor goals, manage insurance, and plan for retirement 
            with our comprehensive personal finance platform.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>1</span>
              </div>
              <div>
                <h4 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Asset Tracking</h4>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Monitor stocks, mutual funds, gold, and more</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>2</span>
              </div>
              <div>
                <h4 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Goal Planning</h4>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Set and track financial goals with precision</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>3</span>
              </div>
              <div>
                <h4 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Insurance Management</h4>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Organize policies and track coverage</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>4</span>
              </div>
              <div>
                <h4 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Smart Forecasting</h4>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Project your financial future with scenarios</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="rounded-2xl shadow-lg p-8" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-primary)' }}>
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