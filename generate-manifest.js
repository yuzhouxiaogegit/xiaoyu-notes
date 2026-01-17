/**
 * 生成 PWA manifest.json 文件
 * 小宇笔记 - 加密笔记管理系统
 * 作者：宇宙小哥
 */

const fs = require('fs');
const path = require('path');

// 读取应用配置
const appConfigPath = path.join(__dirname, 'public/assets/js/app-config.js');
let appConfig = {};

try {
  const configContent = fs.readFileSync(appConfigPath, 'utf8');
  // 简单解析配置文件中的 AppBranding 对象
  const match = configContent.match(/window\.AppBranding\s*=\s*({[\s\S]*?});/);
  if (match) {
    // 使用 eval 解析配置对象（仅在构建时使用，相对安全）
    const configStr = match[1]
      .replace(/(\w+):/g, '"$1":')  // 给属性名加引号
      .replace(/'/g, '"');          // 单引号改双引号
    appConfig = JSON.parse(configStr);
  }
} catch (error) {
  console.warn('无法读取应用配置，使用默认值');
  appConfig = {
    appName: "小宇笔记",
    appNameShort: "小宇笔记",
    appDescription: "端到端加密笔记管理系统",
    themeColor: "#0f172a",
    backgroundColor: "#020617"
  };
}

// 生成 manifest.json
const manifest = {
  "name": appConfig.appName || "小宇笔记",
  "short_name": appConfig.appNameShort || "小宇笔记",
  "description": appConfig.appDescription || "端到端加密笔记管理系统",
  "start_url": "/",
  "display": "standalone",
  "background_color": appConfig.backgroundColor || "#020617",
  "theme_color": appConfig.themeColor || "#0f172a",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "icon.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icon.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["productivity", "utilities"],
  "lang": "zh-CN",
  "dir": "ltr"
};

// 写入文件
const manifestPath = path.join(__dirname, 'public/manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

console.log('✅ manifest.json 生成成功');
console.log(`   应用名称: ${manifest.name}`);
console.log(`   描述: ${manifest.description}`);
console.log(`   主题色: ${manifest.theme_color}`);