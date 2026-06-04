import { useState } from 'react';
import { identifyInsect, InsectAnalysisResult } from './lib/api';
import { UploadSection } from './components/UploadSection';
import { ScanningOverlay } from './components/ScanningOverlay';
import { ResultCard } from './components/ResultCard';
import { HeroSection } from './components/HeroSection';
import { FeaturesSection } from './components/FeaturesSection';
import { Bug, Sparkles, Leaf } from 'lucide-react';
import { motion } from 'motion/react';

type AppState = 'idle' | 'scanning' | 'result' | 'error';

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<InsectAnalysisResult | null>(null);

  const handleImageSelect = async (file: File) => {
    // 1. Create a preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
    setAppState('scanning');

    try {
      // 2. Call the backend API (currently mock)
      const result = await identifyInsect(file);
      setAnalysisResult(result);
      setAppState('result');
    } catch (error) {
      console.error("Identification failed:", error);
      setAppState('error');
    }
  };

  const handleReset = () => {
    setAppState('idle');
    setAnalysisResult(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-stone-800">
      {/* Aesthetic Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-stone-50">
        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-forest-50 to-transparent" />
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-forest-200/20 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] rounded-full bg-leaf-400/10 blur-[100px]" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[40%] rounded-full bg-emerald-200/20 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full px-6 py-8 flex items-center justify-between max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="group flex items-center gap-3 cursor-pointer"
          onClick={handleReset}
        >
          <div className="relative flex items-center justify-center w-12 h-12 bg-gradient-to-br from-forest-50 to-white rounded-2xl border border-forest-100 shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:-translate-y-0.5">
            <Leaf className="w-5 h-5 text-forest-600 drop-shadow-sm" strokeWidth={1.5} />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-leaf-100 rounded-full border-[1.5px] border-white flex items-center justify-center shadow-sm">
              <Bug className="w-2.5 h-2.5 text-forest-700" strokeWidth={2} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-xl tracking-tight text-stone-800">
              自然图鉴
            </span>
            <span className="text-[10px] uppercase font-mono tracking-[0.2em] text-forest-500/70 font-semibold -mt-0.5">
              Nature Identifier
            </span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden sm:flex items-center gap-6 text-sm font-medium text-stone-500"
        >
          <button className="hover:text-forest-600 transition-colors">最新精选</button>
          <button className="px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-700 transition-colors">登录探索</button>
        </motion.div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start p-6 sm:px-12 w-full max-w-7xl mx-auto">
        
        {appState === 'idle' && (
          <div className="w-full flex-col items-center animate-in fade-in zoom-in-95 duration-500">
            <HeroSection />
            <FeaturesSection />
            <div id="upload" className="w-full mt-4">
              <UploadSection onImageSelect={handleImageSelect} />
            </div>
          </div>
        )}

        {appState === 'scanning' && imagePreviewUrl && (
          <div className="w-full py-12">
            <ScanningOverlay imagePreview={imagePreviewUrl} />
          </div>
        )}

        {appState === 'result' && analysisResult && imagePreviewUrl && (
          <div className="w-full py-12">
            <ResultCard 
              result={analysisResult} 
              imagePreview={imagePreviewUrl} 
              onReset={handleReset} 
            />
          </div>
        )}

        {appState === 'error' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center text-center p-8 bg-red-50/80 backdrop-blur rounded-3xl border border-red-100 max-w-lg mx-auto py-16"
          >
             <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
               X
             </div>
             <h3 className="text-xl font-bold text-red-800 mb-2">图片解析失败</h3>
             <p className="text-red-600 mb-6">可能网络开小差了，或者图片不够清晰导致特征提取失败。</p>
             <button onClick={handleReset} className="px-8 py-3 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition">
               重新尝试
             </button>
          </motion.div>
        )}

      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center text-stone-400 text-sm font-medium">
         <p className="flex items-center justify-center gap-1.5">
           Powered by AI Vision <Sparkles className="w-3.5 h-3.5 text-leaf-500" /> Connecting You with Nature
         </p>
      </footer>
    </div>
  );
}
