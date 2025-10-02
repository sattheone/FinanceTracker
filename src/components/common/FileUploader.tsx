import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { excelParser, ParsedTransaction } from '../../services/excelParser';

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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);
    setIsParsing(true);
    setUploadedFile(file);
    setParseResult(null);

    try {
      let transactions: ParsedTransaction[] = [];
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        transactions = await excelParser.parseCSVFile(file);
      } else if (file.name.toLowerCase().match(/\.(xlsx?|xls)$/)) {
        transactions = await excelParser.parseExcelFile(file);
      } else {
        throw new Error('Unsupported file format. Please upload Excel (.xlsx, .xls) or CSV files.');
      }

      setParseResult(transactions);
      onTransactionsParsed(transactions);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse file';
      setError(errorMessage);
    } finally {
      setIsParsing(false);
    }
  }, [onTransactionsParsed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const clearFile = () => {
    setUploadedFile(null);
    setError(null);
    setParseResult(null);
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.toLowerCase().endsWith('.csv')) {
      return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
    }
    return <FileSpreadsheet className="w-8 h-8 text-blue-600" />;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      {!uploadedFile ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
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
              <p className="text-gray-600 font-medium mb-2">
                Drag & drop a bank statement file here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Supports Excel (.xlsx, .xls) and CSV files (max 10MB)
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center">
              {getFileIcon(uploadedFile.name)}
              <div className="ml-3">
                <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                <p className="text-sm text-gray-600">
                  {(uploadedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isParsing && (
            <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin mr-3" />
              <span className="text-blue-700">Parsing bank statement...</span>
            </div>
          )}

          {error && (
            <div className="flex items-start p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
              <div>
                <p className="text-red-700 font-medium">Parsing Failed</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {parseResult && (
            <div className="flex items-start p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
              <div>
                <p className="text-green-700 font-medium">Successfully Parsed!</p>
                <p className="text-green-600 text-sm">
                  Found {parseResult.length} transactions. Review and confirm to add them.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">📄 Supported Bank Statement Formats:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>HDFC Bank:</strong> Excel/CSV statements with Date, Narration, Withdrawal, Deposit columns</li>
          <li>• <strong>SBI, ICICI, Axis:</strong> Standard bank statement formats</li>
          <li>• <strong>CSV Files:</strong> Comma-separated values with transaction data</li>
          <li>• <strong>Excel Files:</strong> .xlsx and .xls formats</li>
        </ul>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">💡 Tips for better parsing:</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
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