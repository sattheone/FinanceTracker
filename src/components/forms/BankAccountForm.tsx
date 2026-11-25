import React, { useState } from 'react';
import { BankAccount, AccountType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import statementPasswordStore from '../../services/statementPasswordStore';
import { Building2, Wallet, CreditCard, Lock, Eye, EyeOff } from 'lucide-react';

interface BankAccountFormProps {
  account?: BankAccount;
  currentBalance?: number;
  onSubmit: (accountData: Omit<BankAccount, 'id'>) => void;
  onCancel: () => void;
  // Prefill for a new account (e.g. from an imported statement); ignored when editing
  defaults?: {
    bank?: string;
    accountNumber?: string;
    initialBalance?: number;
    balanceHint?: string;
  };
}

const accountTypes: { type: AccountType; name: string; icon: any }[] = [
  { type: 'bank', name: 'Bank Account', icon: Building2 },
  { type: 'cash', name: 'Cash / Wallet', icon: Wallet },
  { type: 'credit_card', name: 'Credit Card', icon: CreditCard },
];

const bankOptions = [
  { name: 'HDFC Bank', logo: '🏦' },
  { name: 'State Bank of India', logo: '🏛️' },
  { name: 'ICICI Bank', logo: '🏢' },
  { name: 'Axis Bank', logo: '🏪' },
  { name: 'Kotak Mahindra Bank', logo: '🏬' },
  { name: 'Punjab National Bank', logo: '🏭' },
  { name: 'Bank of Baroda', logo: '🏯' },
  { name: 'Canara Bank', logo: '🏰' },
  { name: 'Union Bank', logo: '🏛️' },
  { name: 'Other', logo: '💳' },
];

const BankAccountForm: React.FC<BankAccountFormProps> = ({
  account,
  currentBalance,
  onSubmit,
  onCancel,
  defaults,
}) => {
  const prefill = account ? undefined : defaults;
  const { user } = useAuth();

  // Account type state
  const [accountType, setAccountType] = useState<AccountType>(account?.accountType || 'bank');

  // Determine if initial bank is custom (not in the predefined list, ignoring 'Other')
  const initialBank = account?.bank || prefill?.bank || '';
  const isInitiallyCustom = initialBank && !bankOptions.some(b => b.name === initialBank && b.name !== 'Other');
  const [isCustomBank, setIsCustomBank] = useState(isInitiallyCustom || false);

  const [showStatementPassword, setShowStatementPassword] = useState(false);

  const [formData, setFormData] = useState({
    bank: initialBank,
    accountNumber: account?.number ? account.number.replace('xx', '') : (prefill?.accountNumber || ''),
    initialBalance: account?.initialBalance || prefill?.initialBalance || 0,
    currentBalance: currentBalance ?? (account?.initialBalance || 0),
    logo: account?.logo || bankOptions.find(b => b.name === initialBank)?.logo || '🏦',
    // Prefer the device-local copy; fall back to a legacy value loaded from Firestore
    statementPassword: (account?.id && statementPasswordStore.get(account.id)) || account?.statementPassword || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.bank.trim()) {
      newErrors.bank = accountType === 'bank' ? 'Bank name is required' :
        accountType === 'credit_card' ? 'Card name is required' :
          'Account name is required';
    }

    // Account number not required for cash
    if (accountType !== 'cash') {
      if (!formData.accountNumber.trim()) {
        newErrors.accountNumber = accountType === 'credit_card' ? 'Card number is required' : 'Account number is required';
      } else if (formData.accountNumber.length < 4) {
        newErrors.accountNumber = 'Must be at least 4 characters';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Mask account number for display (show last 4 digits)
    const maskedNumber = accountType === 'cash' ? '' : `xx${formData.accountNumber.slice(-4)}`;

    // Outstanding balance on credit card is debt (negative)
    const finalInitialBalance = accountType === 'credit_card'
      ? -Math.abs(formData.initialBalance)
      : formData.initialBalance;

    onSubmit({
      accountType,
      bank: formData.bank,
      number: maskedNumber,
      initialBalance: finalInitialBalance,
      logo: formData.logo,
      userId: user?.id || '',
      statementPassword: formData.statementPassword.trim() || undefined,
    });
  };

  const handleAccountTypeChange = (type: AccountType) => {
    setAccountType(type);
    setIsCustomBank(false);
    if (type === 'cash') {
      setFormData(prev => ({ ...prev, bank: 'Cash Wallet', logo: '💵', accountNumber: '' }));
    } else if (type === 'credit_card') {
      setFormData(prev => ({ ...prev, bank: '', logo: '💳' }));
    } else {
      setFormData(prev => ({ ...prev, bank: '', logo: '🏦' }));
    }
  };

  const handleCurrentBalanceChange = (newBalance: number) => {
    const normalizedNewBalance = accountType === 'credit_card' ? -Math.abs(newBalance) : newBalance;
    const originalCurrentBalance = currentBalance ?? (account?.initialBalance || 0);
    const originalInitialBalance = account?.initialBalance || 0;
    const transactionsSum = originalCurrentBalance - originalInitialBalance;
    setFormData(prev => ({
      ...prev,
      currentBalance: normalizedNewBalance,
      initialBalance: normalizedNewBalance - transactionsSum,
    }));
  };

  const handleBankSelectChange = (value: string) => {
    if (value === 'Other') {
      setIsCustomBank(true);
      setFormData(prev => ({ ...prev, bank: '', logo: '💳' }));
    } else {
      const found = bankOptions.find(b => b.name === value);
      setIsCustomBank(false);
      setFormData(prev => ({ ...prev, bank: value, logo: found?.logo || '🏦' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Account Type — segmented control */}
      <div>
        <label className="form-label">Account Type</label>
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border-primary)' }}>
          {accountTypes.map((type, i) => {
            const Icon = type.icon;
            const active = accountType === type.type;
            return (
              <button
                key={type.type}
                type="button"
                onClick={() => handleAccountTypeChange(type.type)}
                className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-1 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                  i > 0 ? 'border-l' : ''
                }`}
                style={{
                  borderColor: 'var(--color-border-primary)',
                  backgroundColor: active ? 'var(--color-accent-primary)' : 'var(--color-bg-secondary)',
                  color: active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                }}
              >
                <Icon className="hidden sm:block w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{type.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bank — dropdown for bank type */}
      {accountType === 'bank' && (
        <div>
          <label className="form-label">Bank</label>
          <select
            value={isCustomBank ? 'Other' : (formData.bank || '')}
            onChange={(e) => handleBankSelectChange(e.target.value)}
            className="input-field theme-input w-full"
          >
            <option value="" disabled>Select a bank…</option>
            {bankOptions.map(b => (
              <option key={b.name} value={b.name}>{b.logo} {b.name}</option>
            ))}
          </select>
          {isCustomBank && (
            <input
              type="text"
              value={formData.bank}
              onChange={(e) => setFormData(prev => ({ ...prev, bank: e.target.value }))}
              className="input-field theme-input w-full mt-2"
              placeholder="Enter bank name"
              autoFocus
            />
          )}
          {errors.bank && <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>{errors.bank}</p>}
        </div>
      )}

      {/* Card name */}
      {accountType === 'credit_card' && (
        <div>
          <label className="form-label">Card Name</label>
          <input
            type="text"
            value={formData.bank}
            onChange={(e) => setFormData(prev => ({ ...prev, bank: e.target.value }))}
            className="input-field theme-input w-full"
            placeholder="e.g., HDFC Regalia, SBI SimplyCLICK"
          />
          {errors.bank && <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>{errors.bank}</p>}
        </div>
      )}

      {/* Wallet name */}
      {accountType === 'cash' && (
        <div>
          <label className="form-label">Wallet Name</label>
          <input
            type="text"
            value={formData.bank}
            onChange={(e) => setFormData(prev => ({ ...prev, bank: e.target.value }))}
            className="input-field theme-input w-full"
            placeholder="e.g., Cash Wallet, Petty Cash"
          />
          {errors.bank && <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>{errors.bank}</p>}
        </div>
      )}

      {/* Account / Card number */}
      {accountType !== 'cash' && (
        <div>
          <label className="form-label">
            {accountType === 'credit_card' ? 'Last 4 digits of card' : 'Account Number'}
          </label>
          <input
            type="text"
            value={formData.accountNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
            className="input-field theme-input w-full"
            placeholder={accountType === 'credit_card' ? '•••• •••• •••• 1234' : 'Enter account number'}
            maxLength={accountType === 'credit_card' ? 4 : undefined}
          />
          {errors.accountNumber && <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>{errors.accountNumber}</p>}
        </div>
      )}

      {/* Balance row */}
      {account && currentBalance !== undefined ? (
        /* Editing existing account — only show Current Balance */
        <div>
          <label className="form-label">
            {accountType === 'credit_card' ? 'Outstanding Balance' : 'Current Balance'}
          </label>
          <input
            type="number"
            step="0.01"
            value={accountType === 'credit_card' ? (formData.currentBalance === 0 ? '' : Math.abs(formData.currentBalance)) : formData.currentBalance}
            onChange={(e) => handleCurrentBalanceChange(parseFloat(e.target.value) || 0)}
            className="input-field theme-input w-full font-semibold"
            style={{ color: 'var(--color-accent-primary)' }}
            placeholder="0.00"
          />
        </div>
      ) : (
        /* New account — show Starting Balance */
        <div>
          <label className="form-label">
            {accountType === 'credit_card' ? 'Outstanding Balance' : 'Starting Balance'}
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.initialBalance === 0 ? '' : Math.abs(formData.initialBalance)}
            onChange={(e) => setFormData(prev => ({ ...prev, initialBalance: parseFloat(e.target.value) || 0 }))}
            className="input-field theme-input w-full"
            placeholder="0.00"
          />
          {prefill?.balanceHint && (
            <p className="mt-1 text-xs theme-text-muted">{prefill.balanceHint}</p>
          )}
        </div>
      )}

      {/* Statement PDF Password */}
      {accountType !== 'cash' && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 mb-1">
            <label className="form-label !mb-0 !flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-gray-500" />
              Statement PDF Password (Optional)
            </label>
            <span className="text-xs text-gray-400">For auto email crawls</span>
          </div>
          <div className="relative">
            <input
              type={showStatementPassword ? 'text' : 'password'}
              value={formData.statementPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, statementPassword: e.target.value }))}
              className="input-field theme-input w-full pr-10"
              placeholder="e.g. Customer ID or PAN / DOB format"
            />
            <button
              type="button"
              onClick={() => setShowStatementPassword(!showStatementPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              {showStatementPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Used to automatically unlock and import bank statement PDFs emailed from this bank. Stored only on this device.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">{account ? 'Update Account' : 'Add Account'}</button>
      </div>
    </form>
  );
};

export default BankAccountForm;