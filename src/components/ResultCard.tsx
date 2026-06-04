import { InsectAnalysisResult } from '../lib/api';
import { motion } from 'motion/react';
import { Leaf, Info, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

interface ResultCardProps {
  result: InsectAnalysisResult;
  imagePreview: string;
  onReset: () => void;
}

export function ResultCard({ result, imagePreview, onReset }: ResultCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
      className="w-full max-w-2xl mx-auto bg-white rounded-3xl overflow-hidden shadow-xl shadow-forest-900/5"
    >
      <div className="relative h-64 sm:h-80 w-full overflow-hidden">
        <img 
          src={imagePreview} 
          alt={result.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-900/80 via-forest-900/20 to-transparent" />
        
        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
          <div>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mb-2"
            >
              <span className="px-3 py-1 bg-leaf-400 text-forest-900 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                匹配成功
              </span>
              <span className="text-white/80 text-xs font-mono bg-black/30 px-2 py-1 rounded backdrop-blur-sm">
                置信度: {(result.confidence * 100).toFixed(1)}%
              </span>
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl sm:text-4xl font-display font-bold text-white drop-shadow-md"
            >
              {result.name}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-forest-100 font-mono text-sm mt-1 italic"
            >
              {result.scientificName}
            </motion.p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="flex items-center gap-2 text-lg font-semibold text-forest-800 mb-3">
            <Info className="w-5 h-5 text-forest-400" />
            生物特征
          </h3>
          <p className="text-stone-600 leading-relaxed">
            {result.description}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-forest-50 rounded-2xl p-5 border border-forest-100"
          >
            <h4 className="flex items-center gap-2 font-medium text-forest-700 mb-2">
              <Leaf className="w-4 h-4 text-forest-500" />
              栖息环境
            </h4>
            <p className="text-sm text-forest-800/80 leading-relaxed">
              {result.habitat}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-amber-50 rounded-2xl p-5 border border-amber-100"
          >
            <h4 className="flex items-center gap-2 font-medium text-amber-700 mb-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              有趣的事实
            </h4>
            <p className="text-sm text-amber-900/80 leading-relaxed">
              {result.funFact}
            </p>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="pt-6 border-t border-stone-100 flex justify-center"
        >
          <button 
            onClick={onReset}
            className="flex items-center gap-2 px-6 py-3 text-forest-600 font-medium hover:bg-forest-50 rounded-full transition-colors active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            继续识别其他昆虫
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
