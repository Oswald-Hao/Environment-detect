import { Scan } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface ScanningOverlayProps {
  imagePreview: string;
}

export function ScanningOverlay({ imagePreview }: ScanningOverlayProps) {
  const [scanText, setScanText] = useState("正在提取特征向量...");

  useEffect(() => {
    const states = [
      "正在提取特征向量...",
      "对比生物学图谱...",
      "分析翅膀纹理...",
      "即将得出结论..."
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % states.length;
      setScanText(states[i]);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-lg mx-auto flex flex-col items-center"
    >
      <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-stone-100 shadow-2xl shadow-forest-900/10 border-4 border-white">
        <img 
          src={imagePreview} 
          alt="Scanning target" 
          className="w-full h-full object-cover"
        />
        
        {/* Scanning Line Animation */}
        <motion.div 
          className="absolute left-0 right-0 h-1 bg-leaf-400 shadow-[0_0_15px_rgba(163,230,53,0.8)] z-10"
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 3, ease: "linear", repeat: Infinity }}
        />
        
        {/* Scanning Overlay Grid/Tint */}
        <div className="absolute inset-0 bg-forest-900/20 mix-blend-overlay backdrop-brightness-110" />
        <div className="absolute inset-0" style={{ 
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }} />
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-forest-100 text-forest-600">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 4, ease: "linear", repeat: Infinity }}
            className="absolute inset-0 rounded-full border-2 border-forest-300 border-t-forest-600"
          />
          <Scan className="w-5 h-5 animate-pulse" />
        </div>
        <div className="text-forest-700 font-display font-medium tracking-wide">AI 识别中</div>
        <motion.div 
          key={scanText}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="text-sm text-stone-500 font-mono"
        >
          {scanText}
        </motion.div>
      </div>
    </motion.div>
  );
}
