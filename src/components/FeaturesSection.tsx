import { motion } from 'motion/react';
import { Camera, ScanSearch, BookOpenIcon } from 'lucide-react';

const features = [
  {
    icon: Camera,
    title: '拍摄或上传图鉴',
    description: '在户外探索时遇到有趣的昆虫？拍下高清晰度照片或从相册直接上传。'
  },
  {
    icon: ScanSearch,
    title: '特征极速分析',
    description: '预留的高性能 API 接口，可提取生物形态特征进行云端比对。'
  },
  {
    icon: BookOpenIcon,
    title: '解锁科普档案',
    description: '获取详细学名、栖息地及其生态趣味简史，丰富你的自然知识。'
  }
];

export function FeaturesSection() {
  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 relative z-10">
      {features.map((feature, index) => {
        const Icon = feature.icon;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
            className="p-8 bg-white/50 backdrop-blur-md rounded-3xl border border-white shadow-xl shadow-stone-200/30 text-center hover:bg-white/70 transition-colors"
          >
            <div className="w-14 h-14 mx-auto bg-forest-50 text-forest-600 rounded-2xl flex items-center justify-center mb-5 rotate-3 hover:rotate-6 transition-transform">
              <Icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-display text-stone-800 mb-3">{feature.title}</h3>
            <p className="text-sm text-stone-500 leading-relaxed font-medium">{feature.description}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
