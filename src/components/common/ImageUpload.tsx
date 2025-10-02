import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, UploadCloud } from 'lucide-react';

interface ImageUploadProps {
  onUpload: (file: File) => void;
  title: string;
  description: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onUpload, title, description }) => {
  const [isLoading, setIsLoading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setIsLoading(true);
      await onUpload(acceptedFiles[0]);
      setIsLoading(false);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'image/*': [] },
    multiple: false
  });

  return (
    <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary-600 bg-primary-50' : 'border-gray-300 hover:border-primary-500'}`}>
      <input {...getInputProps()} />
      {isLoading ? (
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mb-4" />
          <p className="text-gray-600">Analyzing image...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center">
          <UploadCloud className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 mb-4">{description}</p>
          <p className="text-xs text-gray-500">Drag & drop an image here, or click to select one</p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
