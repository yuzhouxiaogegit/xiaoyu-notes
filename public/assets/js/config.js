/**
 * 小宇笔记 - 加密笔记管理系统
 * 作者：宇宙小哥
 * 项目地址：https://github.com/yuzhouxiaogegit/xiaoyu-notes
 * 版权所有 © 2025 宇宙小哥
 */

// 全局配置和状态管理
const AppConfig = {
    API_URL: window.location.origin, // 自动获取当前域名
    ADMIN_KEY: "", // 不在客户端存储，每次登录时获取
    MASTER_PASSWORD: "",
    currentPage: 1,
    pageSize: 10,
    currentView: 'write',
    currentCategory: 'all',
    selectedNotes: new Set(),
    categories: [],
    isViewSwitching: false, // 防止视图切换竞态条件
    isRefreshing: false // 防止重复刷新
};

// 检查是否为开发环境
function isDevEnvironment() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // 只有以下情况才被认为是开发环境（使用模拟数据）
    return protocol === 'file:' ||                    // 文件协议
           (hostname === 'localhost' && port === '8000') ||  // 纯前端开发服务器
           (hostname === 'localhost' && port === '3000') ||  // 常见前端开发端口
           (hostname === 'localhost' && port === '8788') ||  // Wrangler 开发服务器
           (hostname === '127.0.0.1' && port === '8000');    // 本地静态服务器
}

// 获取环境状态信息
function getEnvironmentInfo() {
    const isDev = isDevEnvironment();
    return {
        isDevelopment: isDev,
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        apiUrl: AppConfig.API_URL,
        hasAdminKey: !!AppConfig.ADMIN_KEY,
        hasMasterPassword: !!AppConfig.MASTER_PASSWORD,
        mode: isDev ? '开发模式' : '生产模式'
    };
}

// 保存配置（保存笔记密码到本地存储）
function saveConfig() {
    // 保存笔记密码到 localStorage（加密存储）
    if (AppConfig.MASTER_PASSWORD) {
        // 使用简单的编码存储，避免明文保存
        const encoded = btoa(AppConfig.MASTER_PASSWORD);
        localStorage.setItem('note_password_hash', encoded);
    }
}

// 加载配置（从本地存储加载笔记密码）
function loadConfig() {
    try {
        // 加载笔记密码
        const encoded = localStorage.getItem('note_password_hash');
        if (encoded) {
            AppConfig.MASTER_PASSWORD = atob(encoded);
            // 如果页面上有密码输入框，同步显示
            const masterPwInput = document.getElementById('masterPw');
            if (masterPwInput) {
                masterPwInput.value = AppConfig.MASTER_PASSWORD;
            }
        }
    } catch (error) {
        console.warn('加载配置失败:', error);
        // 如果解码失败，清除无效数据
        localStorage.removeItem('note_password_hash');
    }
}

// 清除保存的笔记密码
function clearSavedPassword() {
    localStorage.removeItem('note_password_hash');
    AppConfig.MASTER_PASSWORD = '';
    const masterPwInput = document.getElementById('masterPw');
    if (masterPwInput) {
        masterPwInput.value = '';
    }
}

// 检查是否已配置（现在总是返回 true，因为配置在服务端）
function isConfigured() {
    return true; // 配置在服务端环境变量中，总是已配置
}
