import { Upload, Camera, Bug } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';

interface UploadSectionProps {
  onImageSelect: (file: File) => void;
}

export function UploadSection({ onImageSelect }: UploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
      className="w-full max-w-3xl mx-auto pb-10"
    >
      <div 
        className={`relative overflow-hidden rounded-[2.5rem] border-2 border-dashed transition-all duration-300 ${
          isDragOver ? 'border-forest-500 bg-forest-50/80 scale-[1.02]' : 'border-forest-200 bg-white/70 backdrop-blur-md hover:border-forest-300 hover:shadow-2xl hover:shadow-forest-100/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="px-8 py-14 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-forest-100/80 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-forest-200/50">
             <Bug className="w-8 h-8 text-forest-600" strokeWidth={1.5} />
          </div>
          
          <h2 className="text-2xl font-display font-semibold text-stone-800 mb-2">
            准备好开始鉴定了么？
          </h2>
          <p className="text-stone-500 mb-10 max-w-sm">
            将图片文件拖拽至此框内，或者点击下方按钮从设备中选择图片
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-forest-600 text-white font-medium rounded-full overflow-hidden transition-all hover:bg-forest-700 hover:shadow-xl hover:shadow-forest-600/20 active:scale-95"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <Upload className="w-5 h-5 relative z-10" />
              <span className="relative z-10">选择图片上传</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/80 backdrop-blur-sm text-forest-700 font-medium rounded-full border border-forest-200 transition-all hover:bg-forest-50 hover:border-forest-300 active:scale-95 shadow-sm"
            >
              <Camera className="w-5 h-5" />
              <span>调用相机拍摄</span>
            </button>
          </div>
          
          {/* Hidden file input */}
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>
      </div>
      
      <p className="text-center text-xs text-stone-400 mt-6 font-medium">
        支持 JPG, PNG, HEIC 格式 • 文件大小限制 10MB
      </p>
    </motion.div>
  );
}
