
import React, { useRef } from 'react';

interface ImageUploadProps {
  onImageSelected: (base64: string) => void;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelected, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        onImageSelected(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 bg-white rounded-2xl border-2 border-dashed border-emerald-200 hover:border-emerald-400 transition-colors cursor-pointer group relative overflow-hidden shadow-sm">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="absolute inset-0 opacity-0 cursor-pointer z-10"
        disabled={disabled}
      />
      <div className="flex flex-col items-center justify-center space-y-4 py-8">
        <div className="p-4 bg-emerald-50 rounded-full group-hover:bg-emerald-100 transition-colors">
          <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-slate-700">Upload a photo of the leaf</p>
          <p className="text-sm text-slate-500">Take a clear picture of the infected area</p>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
