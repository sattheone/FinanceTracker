import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, X, Loader2, AlertCircle, CheckCircle, Lock, Eye, EyeOff, FileText } from 'lucide-react';
import { excelParser, ParsedTransaction } from '../../services/excelParser';
import bankStatementParser from '../../services/bankStatementParser';

interface FileUploaderProps {
  onTransactionsParsed: (transactions: ParsedTransaction[]) => void;
  title: string;
  description: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onTransactionsParsed,
  title,
  description
}) => {
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParsedTransaction[] | null>(null);

  // Password handling
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const processFile = async (file: File, filePassword?: string) => {
    setError(null);
    setPasswordError(null);
    setIsParsing(true);
    setParseResult(null);

    try {
      // Check user's duplicate detection preferences
      const duplicateSettings = JSON.parse(localStorage.getItem('duplicateDetectionSettings') || '{"enabled": true, "showFileWarnings": true}');

      // Check if this file has been imported before (only if user wants file warnings)
      if (duplicateSettings.enabled && duplicateSettings.showFileWarnings) {
        const { default: duplicateDetectionService } = await import('../../services/duplicateDetectionService');

        const isFileImported = duplicateDetectionService.checkFileImported(
          file.name,
          file.size,
          file.lastModified
        );

        if (isFileImported) {
          throw new Error(`This file "${file.name}" has already been imported. Please select a different file or check your transaction history.`);
        }
      }

      let transactions: ParsedTransaction[] = [];

      if (file.name.toLowerCase().endsWith('.csv')) {
        transactions = await excelParser.parseCSVFile(file);
      } else if (file.name.toLowerCase().match(/\.(xlsx?|xls)$/)) {
        transactions = await excelParser.parseExcelFile(file);
      } else if (file.name.toLowerCase().endsWith('.pdf')) {
        // Handle PDF parsing
        try {
          // Convert file to base64
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              // Remove data URL prefix
              const base64 = result.split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          // Extract text from PDF
          console.log('Attempting to extract text from PDF with password:', filePassword ? 'YES' : 'NO');
          const pdfText = await bankStatementParser.extractTextFromPDF(base64Data, filePassword);
          console.log('PDF text extracted successfully, length:', pdfText.length);

          // Parse HDFC statement (currently only HDFC supported via PDF)
          // TODO: Add detection for other banks
          const statementData = await bankStatementParser.parseHDFCStatement(pdfText);

          // Convert to ParsedTransaction format
          transactions = statementData.transactions;
          console.log('Transactions found:', transactions.length);

          // If we reached here, password was correct
          setIsPasswordProtected(false);

          // Explicitly handle empty transactions here to avoid the catch block masking it as a password error
          if (transactions.length === 0) {
            // If we have text but no transactions, it's a parsing issue, not a password issue
            // We want to show this as a general error, not a password error
            // So we ensure isPasswordProtected is false (which we just did)
            // AND we throw an error that will be caught below
            throw new Error('No transactions found in the file. Please check if the file format matches supported bank statements.');
          }

        } catch (err: any) {
          console.error('PDF Parsing Error:', err);
          console.error('Error Name:', err.name);
          console.error('Error Message:', err.message);
          console.error('Error Code:', err.code);

          if (err.message === 'PASSWORD_REQUIRED') {
            console.log('Caught PASSWORD_REQUIRED');
            // If we already provided a password and it's still required, it means the password was wrong
            if (filePassword) {
              console.log('Password was provided but still failed -> Incorrect password');
              throw new Error('Incorrect password');
            }
            setIsPasswordProtected(true);
            setIsParsing(false);
            return; // Stop here and wait for password
          }
          throw err;
        }
      } else {
        throw new Error('Unsupported file format. Please upload Excel (.xlsx, .xls), CSV, or PDF files.');
      }

      if (transactions.length === 0) {
        throw new Error('No transactions found in the file. Please check the file format and content.');
      }

      // Mark file as imported (we'll do this after successful import in the parent component)
      // For now, just store the file info for later use
      (transactions as any).fileInfo = {
        name: file.name,
        size: file.size,
        lastModified: file.lastModified
      };

      setParseResult(transactions);
      onTransactionsParsed(transactions);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse file';

      // Only show as password error if it's actually an incorrect password
      if (errorMessage === 'Incorrect password') {
        setPasswordError('Incorrect password. Please try again.');
      } else {
        // For all other errors (including "No transactions found"), show as general error
        // We need to make sure we're not in password mode anymore if we successfully unlocked but failed parsing
        // However, we can't easily change state here and have it reflect immediately in render
        // So we'll use the error message to decide where to show it

        // If we are in password protected mode, but the error is NOT "Incorrect password",
        // it means we unlocked it but found no data. We should probably hide the password field
        // and show the error.
        if (isPasswordProtected && errorMessage !== 'Incorrect password') {
          setIsPasswordProtected(false);
        }
        setError(errorMessage);
      }
    } finally {
      setIsParsing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile(file);
    setIsPasswordProtected(false);
    setPassword('');
    processFile(file);
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadedFile && password) {
      processFile(uploadedFile, password);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const clearFile = () => {
    setUploadedFile(null);
    setError(null);
    setParseResult(null);
    setIsPasswordProtected(false);
    setPassword('');
    setPasswordError(null);
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.toLowerCase().endsWith('.csv')) {
      return <FileSpreadsheet className="w-8 h-8 text-green-600 dark:text-green-400" />;
    } else if (fileName.toLowerCase().endsWith('.pdf')) {
      return <FileText className="w-8 h-8 text-red-600 dark:text-red-400" />;
    }
    return <FileSpreadsheet className="w-8 h-8 text-blue-600 dark:text-blue-400" />;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
      </div>

      {!uploadedFile ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          {isDragActive ? (
            <p className="text-primary-600 font-medium">Drop the file here...</p>
          ) : (
            <div>
              <p className="text-gray-600 dark:text-gray-300 font-medium mb-2">
                Drag & drop a bank statement file here, or click to select
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Supports PDF, Excel (.xlsx, .xls) and CSV files (max 10MB)
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border">
            <div className="flex items-center">
              {getFileIcon(uploadedFile.name)}
              <div className="ml-3">
                <p className="font-medium text-gray-900 dark:text-white">{uploadedFile.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {(uploadedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isPasswordProtected && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <div className="flex items-start mb-4">
                <Lock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-yellow-800 dark:text-yellow-200 font-medium">Password Protected PDF</p>
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                    This file is password protected. Please enter the password to unlock it.
                  </p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter PDF password"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!password || isParsing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Unlock'}
                </button>
              </form>
              {passwordError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{passwordError}</p>
              )}
            </div>
          )}

          {isParsing && !isPasswordProtected && (
            <div className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin mr-3" />
              <span className="text-blue-700 dark:text-blue-300">Parsing bank statement...</span>
            </div>
          )}

          {error && !isPasswordProtected && (
            <div className="flex items-start p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 mt-0.5" />
              <div>
                <p className="text-red-700 dark:text-red-300 font-medium">Parsing Failed</p>
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          {parseResult && (
            <div className="flex items-start p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-3 mt-0.5" />
              <div>
                <p className="text-green-700 dark:text-green-300 font-medium">Successfully Parsed!</p>
                <p className="text-green-600 dark:text-green-400 text-sm">
                  Found {parseResult.length} transactions. Review and confirm to add them.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">📄 Supported Bank Statement Formats:</h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• <strong>HDFC Bank:</strong> PDF statements (password protected supported)</li>
          <li>• <strong>Excel/CSV:</strong> Standard bank statement formats</li>
        </ul>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">💡 Tips for better parsing:</h4>
        <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
          <li>• Ensure the file contains standard bank statement columns</li>
          <li>• Remove any summary rows or extra headers before uploading</li>
          <li>• The parser will automatically categorize transactions</li>
          <li>• You can edit any transaction details before saving</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUploader;