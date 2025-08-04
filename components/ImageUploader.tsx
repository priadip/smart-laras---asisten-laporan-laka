
import React, { useState, useRef, useCallback } from 'react';
import { CameraIcon, DocumentArrowUpIcon, XCircleIcon, NoSymbolIcon } from '@heroicons/react/24/outline';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  label?: string;
  disabled?: boolean;
  disabledMessage?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onImageSelect, 
  label = "Unggah Foto Identitas (KTP/SIM/STNK)",
  disabled = false,
  disabledMessage = "Fitur unggah tidak tersedia."
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const file = event.target.files?.[0];
    if (file) {
      onImageSelect(file);
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageSelect, disabled]);

  const handleRemoveImage = useCallback(() => {
    if (disabled) return;
    setPreview(null);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
  }, [disabled]);

  const triggerFileInput = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div className={`w-full p-4 border-2 border-dashed rounded-lg text-center ${disabled ? 'border-slate-200 bg-slate-100' : 'border-slate-300 hover:border-blue-500'} transition-colors`}>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden"
        id={`file-upload-input-${label.replace(/\s+/g, '-')}`} // Ensure unique id if multiple uploaders
        disabled={disabled}
      />
      {preview && !disabled ? (
        <div className="relative group">
          <img src={preview} alt="Preview" className="max-h-60 w-auto mx-auto rounded-md shadow-md" />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
            aria-label="Hapus gambar"
            disabled={disabled}
          >
            <XCircleIcon className="w-6 h-6" />
          </button>
          {fileName && <p className="text-sm text-slate-600 mt-2 truncate">{fileName}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {disabled ? (
            <NoSymbolIcon className="w-12 h-12 mx-auto text-slate-400" />
          ) : (
            <DocumentArrowUpIcon className="w-12 h-12 mx-auto text-slate-400" />
          )}
          <label 
            htmlFor={`file-upload-input-${label.replace(/\s+/g, '-')}`} 
            className={`block text-sm font-medium ${disabled ? 'text-slate-500' : 'text-slate-700'}`}
          >
            {label}
          </label>
          {disabled ? (
            <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded-md">{disabledMessage}</p>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={triggerFileInput}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
                  disabled={disabled}
                >
                  <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
                  Pilih File
                </button>
                 <label
                    htmlFor={`camera-upload-input-${label.replace(/\s+/g, '-')}`} // Ensure unique id
                    className={`cursor-pointer px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium flex items-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <CameraIcon className="w-5 h-5 mr-2" />
                    Gunakan Kamera
                  </label>
                  <input
                    id={`camera-upload-input-${label.replace(/\s+/g, '-')}`} // Ensure unique id
                    type="file"
                    accept="image/*"
                    capture="environment" 
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={disabled}
                  />
              </div>
              <p className="text-xs text-slate-500">Format yang didukung: JPG, PNG, WEBP</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;