import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

export function HeroSection() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="text-center w-full max-w-4xl mx-auto mb-16 pt-8 sm:pt-12"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 text-forest-700 font-medium text-sm mb-6 border border-forest-100 shadow-sm backdrop-blur-md"
      >
        <Sparkles className="w-4 h-4 text-leaf-500" />
        <span>你的口袋自然博物馆</span>
      </motion.div>

      <h1 className="text-5xl sm:text-7xl font-display font-bold text-stone-800 tracking-tight leading-[1.15] mb-6">
        探索隐藏在叶片下的 <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-forest-600 via-forest-500 to-leaf-500">
          微观奇迹
        </span>
      </h1>

      <p className="text-lg sm:text-xl text-stone-500 leading-relaxed max-w-2xl mx-auto mb-10 font-medium">
        遇见不知名的昆虫？只需一张照片，我们的人工智能计算引擎即可瞬间为您揭示物种身份、生活习性与生态趣闻。从现在起，每一次相遇都是一场科普之旅。
      </p>

      <div className="flex flex-wrap justify-center gap-6 text-sm font-semibold text-stone-400">
         <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-leaf-400"></div>
            支持海量物种发现
         </div>
         <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-forest-400"></div>
            亚秒级极速识别接入
         </div>
         <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
            详尽的生态博物档案
         </div>
      </div>
    </motion.div>
  );
}
