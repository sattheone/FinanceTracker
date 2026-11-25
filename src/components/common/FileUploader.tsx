import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, X, Loader2, AlertCircle, CheckCircle, Lock, Eye, EyeOff, FileText, Image } from 'lucide-react';
import { excelParser, ParsedTransaction, HeaderDetectionError } from '../../services/excelParser';
import bankStatementParser, { StatementSectionInfo } from '../../services/bankStatementParser';
import { backupImporter } from '../../services/backupImporter';
import { aiService } from '../../services/aiService';
import ColumnMappingDialog from './ColumnMappingDialog';

interface FileUploaderProps {
  onTransactionsParsed: (transactions: ParsedTransaction[]) => void;
  title: string;
  description: string;
  importType?: 'bank' | 'backup'; // Default is 'bank'
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onTransactionsParsed,
  title,
  description,
  importType = 'bank'
}) => {
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParsedTransaction[] | null>(null);

  // Manual Mapping State
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [mappingRawData, setMappingRawData] = useState<string[][]>([]);
  const [mappingFileName, setMappingFileName] = useState('');

  // Password handling
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isAIParsing, setIsAIParsing] = useState(false);

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
      // Per-account sections when one PDF covers several accounts
      let statementSections: StatementSectionInfo[] | undefined;

      if (importType === 'backup' && file.name.toLowerCase().endsWith('.csv')) {
        transactions = await backupImporter.parseBackupCSV(file);
      } else if (file.name.toLowerCase().endsWith('.csv')) {
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


          // Parse statement using the robust parser which handles multiple formats
          const statementData = await bankStatementParser.parseStatement(pdfText);

          // Convert to ParsedTransaction format
          transactions = statementData.transactions;
          statementSections = bankStatementParser.toSectionInfos(statementData.sections);
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
      } else if (file.type.startsWith('image/') || file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/)) {
        // Handle image files with AI parsing
        setIsAIParsing(true);
        try {
          console.log('🖼️ Processing image file with AI:', file.name);
          const extractedTransactions = await aiService.extractTransactionsFromImage(file);

          if (extractedTransactions.length === 0) {
            throw new Error('No transactions could be extracted from the image. Please ensure the image clearly shows transaction details.');
          }

          // Convert extracted transactions to ParsedTransaction format
          transactions = extractedTransactions.map(t => {
            // Map AI extracted types to ParsedTransaction types
            let type: 'income' | 'expense' = 'expense';
            if (t.type === 'income') {
              type = 'income';
            } else {
              // Map 'expense', 'investment', 'insurance', 'transfer' all to 'expense'
              type = 'expense';
            }

            return {
              date: t.date,
              description: t.description,
              category: t.category,
              type: type,
              amount: t.amount,
              confidence: t.confidence
            };
          });

          console.log('✅ AI extracted', transactions.length, 'transactions from image');
        } catch (err: any) {
          console.error('Image AI parsing error:', err);
          throw new Error(err.message || 'Failed to extract transactions from image. Please try with a clearer image.');
        } finally {
          setIsAIParsing(false);
        }
      } else {
        throw new Error('Unsupported file format. Please upload Excel (.xlsx, .xls), CSV, PDF, or image files (JPG, PNG, WebP).');
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
      if (statementSections) {
        (transactions as any).statementSections = statementSections;
      }

      setParseResult(transactions);
      onTransactionsParsed(transactions);
    } catch (error) {
      // Check for HeaderDetectionError by instance OR by name (safer for HMR/transpilation issues)
      if (error instanceof HeaderDetectionError || (error as any).name === 'HeaderDetectionError') {
        const rawData = (error as any).rawData || (error as HeaderDetectionError).rawData;

        // If header detection failed, show manual mapping dialog
        console.warn("Header detection failed, requesting manual mapping");
        if (rawData) {
          setMappingRawData(rawData);
          setMappingFileName(file.name);
          setShowMappingDialog(true);
          setIsParsing(false); // Stop loader
          return; // Don't show error yet
        }
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to parse file';

      // Only show as password error if it's actually an incorrect password
      if (errorMessage === 'Incorrect password') {
        setPasswordError('Incorrect password. Please try again.');
      } else {
        // For all other errors (including "No transactions found"), show as general error
        if (isPasswordProtected && errorMessage !== 'Incorrect password') {
          setIsPasswordProtected(false);
        }
        setError(errorMessage);
      }
    } finally {
      // If showing mapping dialog, we keep parsing state "off" but don't reset everything
      if (!showMappingDialog) {
        setIsParsing(false);
      }
    }
  };

  const handleMappingConfirm = (mapping: Record<string, number>, headerRowIndex: number) => {
    setShowMappingDialog(false);
    setIsParsing(true);

    try {
      if (!mappingRawData || mappingRawData.length === 0) {
        throw new Error("No data available to map.");
      }

      const transactions = excelParser.parseWithMapping(mappingRawData, mapping, headerRowIndex);

      if (transactions.length === 0) {
        throw new Error('No valid transactions found with provided mapping.');
      }

      // Add file info
      if (uploadedFile) {
        (transactions as any).fileInfo = {
          name: uploadedFile.name,
          size: uploadedFile.size,
          lastModified: uploadedFile.lastModified
        };
      }

      setParseResult(transactions);
      onTransactionsParsed(transactions);
      setIsParsing(false);
    } catch (err: any) {
      setError(err.message || "Failed to parse with given mapping.");
      setIsParsing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    console.log('📂 File Drop Detected:', {
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      type: file.type
    });

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
    onDropRejected: (fileRejections) => {
      console.log('🚫 File Drop Rejected:', fileRejections);
      fileRejections.forEach(rejection => {
        rejection.errors.forEach(error => {
          console.error(`File rejected: ${error.code} - ${error.message}`);
          setError(`File rejected: ${error.message}`);
        });
      });
    },
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const clearFile = () => {
    setUploadedFile(null);
    setError(null);
    setParseResult(null);
    setIsPasswordProtected(false);
    setShowMappingDialog(false); // Reset mapping dialog
    setPassword('');
    setPasswordError(null);
  };

  const getFileIcon = (fileName: string) => {
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.csv')) {
      return <FileSpreadsheet className="w-8 h-8 text-green-600 dark:text-green-400" />;
    } else if (lowerName.endsWith('.pdf')) {
      return <FileText className="w-8 h-8 text-red-600 dark:text-red-400" />;
    } else if (lowerName.match(/\.(jpg|jpeg|png|webp|gif)$/)) {
      return <Image className="w-8 h-8 text-purple-600 dark:text-purple-400" />;
    }
    return <FileSpreadsheet className="w-8 h-8 text-blue-600 dark:text-blue-400" />;
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold theme-text-primary mb-0.5">{title}</h3>
        <p className="text-sm theme-text-secondary">{description}</p>
      </div>

      {!uploadedFile ? (
        <div
          {...getRootProps()}
          className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
          style={{
            borderColor: isDragActive ? 'var(--color-accent-primary)' : 'var(--color-border-primary)',
            backgroundColor: isDragActive ? 'var(--color-bg-secondary)' : 'transparent',
          }}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-sm font-medium theme-text-primary mb-1">
            {isDragActive ? 'Drop the file here…' : 'Drag & drop or click to select'}
          </p>
          <p className="text-xs theme-text-muted">PDF, Excel (.xlsx, .xls), CSV, JPG, PNG — max 50MB</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* File pill */}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }}>
            <div className="flex items-center gap-2 min-w-0">
              {getFileIcon(uploadedFile.name)}
              <div className="min-w-0">
                <p className="text-sm font-medium theme-text-primary truncate">{uploadedFile.name}</p>
                <p className="text-xs theme-text-muted">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button onClick={clearFile} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Password prompt */}
          {isPasswordProtected && (
            <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }}>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-accent-primary)' }} />
                <p className="text-sm font-medium theme-text-primary">Password protected PDF</p>
              </div>
              <form onSubmit={handlePasswordSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter PDF password"
                    className="input-field theme-input w-full pr-9"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button type="submit" disabled={!password || isParsing} className="btn-primary flex items-center gap-1.5">
                  {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unlock'}
                </button>
              </form>
              {passwordError && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{passwordError}</p>}
            </div>
          )}

          {/* Parsing indicator */}
          {isParsing && !isPasswordProtected && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }}>
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: 'var(--color-accent-primary)' }} />
              <span className="text-sm theme-text-secondary">
                {isAIParsing ? 'Extracting transactions with AI…' : 'Parsing bank statement…'}
              </span>
            </div>
          )}

          {/* Error */}
          {error && !isPasswordProtected && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-error)' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-error)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>Parsing failed</p>
                <p className="text-xs theme-text-secondary mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Success */}
          {parseResult && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-success)' }}>
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-success)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>Parsed successfully</p>
                <p className="text-xs theme-text-secondary mt-0.5">{parseResult.length} transactions found — review and confirm to save.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compact format hint */}
      <p className="text-xs theme-text-muted">
        Supports PDF (password-protected OK), Excel/CSV, and image screenshots (AI extraction).
      </p>

      <ColumnMappingDialog
        isOpen={showMappingDialog}
        onClose={() => {
          setShowMappingDialog(false);
          setUploadedFile(null);
        }}
        onConfirm={handleMappingConfirm}
        rawData={mappingRawData}
        fileName={mappingFileName}
      />
    </div>
  );
};

export default FileUploader;