/**
 * 小宇笔记 - 加密笔记管理系统
 * 作者：宇宙小哥
 * 项目地址：https://github.com/yuzhouxiaogegit/xiaoyu-notes
 * 版权所有 © 2025 宇宙小哥
 */

// 应用配置文件 - 部署时需要修改的内容
// 兼容浏览器主线程和Service Worker环境
const globalScope = typeof window !== 'undefined' ? window : self;

globalScope.AppBranding = {
    // 基本信息
    appName: "小宇笔记",
    appNameShort: "小宇笔记", 
    appDescription: "安全加密笔记管理系统",
    author: "宇宙小哥",
    
    // 页面标题
    pageTitle: "小宇笔记 | 安全加密笔记管理系统",
    
    // 应用图标 emoji
    appIcon: "📝",
    
    // 主题颜色
    themeColor: "#0f172a",
    backgroundColor: "#020617",
    
    // 版本信息
    version: "1.0.0",
    
    // 缓存名称（用于 Service Worker）
    cacheName: "xiaoyu-notes-v2",
    
    // 数据库名称
    databaseName: "xiaoyu-notes-db",
    
    // 项目信息（用于设置页面）
    projectInfo: {
        name: "小宇笔记",
        author: "宇宙小哥",
        encryption: "AES-GCM 256-bit + 数据传输混淆",
        deployment: "Cloudflare Pages + D1 + Workers AI",
        privacy: "服务端加密存储，分享时用户自定义加密",
        categories: "支持自定义分类管理",
        sharing: "支持阅后即焚和访问次数限制",
        pwa: "支持离线使用和桌面安装"
    },
    
    // GitHub 相关（可选）
    github: {
        username: "yuzhouxiaogegit",
        repository: "xiaoyu-notes"
    }
};

// 版权信息（用于版权验证）
globalScope.CopyrightInfo = {
    author: "宇宙小哥",
    project: "小宇笔记",
    year: "2025"
};