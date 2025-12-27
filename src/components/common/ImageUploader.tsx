import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Loader2, AlertCircle, Info } from 'lucide-react';

interface ImageUploaderProps {
  onImageAnalyzed: (data: any[]) => void;
  analyzeFunction: (file: File) => Promise<any[]>;
  title: string;
  description: string;
  acceptedFormats?: string[];
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageAnalyzed,
  analyzeFunction,
  title,
  description,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp']
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const hasApiKey = !!import.meta.env.VITE_GEMINI_API_KEY;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);
    setIsAnalyzing(true);

    // Show preview
    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);

    try {
      const extractedData = await analyzeFunction(file);
      onImageAnalyzed(extractedData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze image';
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzeFunction, onImageAnalyzed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFormats.reduce((acc, format) => ({ ...acc, [format]: [] }), {}),
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const clearImage = () => {
    setUploadedImage(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
      </div>

      {!uploadedImage ? (
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
            <p className="text-primary-600 font-medium">Drop the image here...</p>
          ) : (
            <div>
              <p className="text-gray-600 dark:text-gray-300 font-medium mb-2">
                Drag & drop an image here, or click to select
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Supports JPG, PNG, WebP (max 10MB)
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={uploadedImage}
              alt="Uploaded screenshot"
              className="w-full max-h-64 object-contain rounded-lg border border-gray-200 dark:border-gray-600"
            />
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isAnalyzing && (
            <div className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin mr-3" />
              <span className="text-blue-700 dark:text-blue-300">Analyzing image with AI...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3" />
              <div>
                <p className="text-red-700 dark:text-red-300 font-medium">Analysis Failed</p>
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {!hasApiKey && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">🔑 API Key Required</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                To use AI-powered screenshot analysis, you need a free Google Gemini API key.
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>Quick Setup:</strong> Get your free key from{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-yellow-800 dark:text-yellow-200"
                >
                  Google AI Studio
                </a>{' '}
                and add it to your .env file as VITE_GEMINI_API_KEY
              </p>
            </div>
          </div>
        </div>
      )}

      {hasApiKey && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-green-600 dark:text-green-400 mr-3 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">✅ AI Analysis Ready</h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Google Gemini API is configured and ready to analyze your portfolio screenshots.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">💡 Tips for better results:</h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Ensure the image is clear and well-lit</li>
          <li>• Include all relevant financial data in the screenshot</li>
          <li>• Avoid blurry or low-resolution images</li>
          <li>• Make sure text is readable and not cut off</li>
          {!hasApiKey && (
            <li>• <strong>Demo mode:</strong> Upload any image to see sample extracted data</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ImageUploader;