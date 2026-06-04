export interface InsectAnalysisResult {
  id: string;
  name: string;
  scientificName: string;
  confidence: number;
  description: string;
  habitat: string;
  funFact: string;
}

/**
 * 这是一个预留的后端接入点。
 * 你可以在这里替换为你真实的后端 API 请求逻辑。
 * 
 * @param imageFile - 用户上传的昆虫图片文件，或者图片 Base64 数据
 * @returns 返回一个 Promise，包含分析结果
 */
export async function identifyInsect(imageFile: File | string): Promise<InsectAnalysisResult> {
  // TODO: 在这里替换为你真实的后端请求，例如：
  // const formData = new FormData();
  // formData.append('image', imageFile);
  // const response = await fetch('/api/identify', { method: 'POST', body: formData });
  // return await response.json();

  // 以下为模拟后端的延迟和返回数据，用于前端展示效果
  return new Promise((resolve) => {
    // 随机模拟几种昆虫的结果
    const mockInsects: InsectAnalysisResult[] = [
      {
        id: "bug-01",
        name: "七星瓢虫",
        scientificName: "Coccinella septempunctata",
        confidence: 0.98,
        description: "七星瓢虫是瓢虫科的一种，体型呈半球形，背面为醒目的红色或橘红色，上面有七个明显的黑色斑点。它们是著名的益虫，以蚜虫等农作物害虫为食。",
        habitat: "广泛分布于草地、森林、农田和花园中。",
        funFact: "一只七星瓢虫在其一生中可以吃掉多达 5000 只蚜虫！"
      },
      {
        id: "bug-02",
        name: "玉带凤蝶",
        scientificName: "Papilio polytes",
        confidence: 0.94,
        description: "一种大型、美丽的蝴蝶，翅膀主要为黑色，后翅中域有一条由白色斑块组成的宽带，形如玉带，因此得名。它们飞行姿态优雅，常在花丛中翩翩起舞。",
        habitat: "常见于林缘、灌丛、花园及城市公园。",
        funFact: "玉带凤蝶的雌蝶具有拟态现象，有些形态会模仿有毒的红珠凤蝶以躲避捕食者。"
      },
      {
        id: "bug-03",
        name: "长戟大兜虫",
        scientificName: "Dynastes hercules",
        confidence: 0.99,
        description: "世界上体型最长的甲虫之一。雄性拥有巨大且向前的头角和前胸背板角，看起来像一把长戟。它们甲壳坚硬，力量惊人，但在自然界中并不好斗，主要以树汁和腐果为食。",
        habitat: "主要分布于中南美洲的热带雨林。",
        funFact: "它们的名字来源于希腊神话中的大力神赫拉克勒斯 (Hercules)，因为它们能举起自身体重数百倍的物体。"
      }
    ];

    setTimeout(() => {
      resolve(mockInsects[Math.floor(Math.random() * mockInsects.length)]);
    }, 2500); // 模拟 2.5 秒的网络请求延迟
  });
}
