// 主应用逻辑 - 核心初始化和路由

/**
 * 小宇笔记 - 加密笔记管理系统
 * 作者：宇宙小哥
 * 项目地址：https://github.com/yuzhouxiaogegit/xiaoyu-notes
 * 版权所有 © 2025 宇宙小哥
 */

// 检查是否已登录（核心函数，需要在初始化时使用）
function isLoggedIn() {
    const token = localStorage.getItem('login_token');
    if (!token) return false;
    
    try {
        const decoded = atob(token);
        const parts = decoded.split(':');
        
        // 1. 确保拆分后的格式正确
        if (parts.length < 2) return false;
        
        // 2. 解析时间戳
        const timestamp = parseInt(parts[1]);
        if (isNaN(timestamp)) return false;
        
        // 3. 检查是否过期（24小时）
        const now = Date.now();
        const expireTime = 24 * 60 * 60 * 1000; // 24小时
        
        return (now - timestamp) < expireTime;
    } catch (e) {
        return false;
    }
}

// 恢复登录状态（从localStorage恢复ADMIN_KEY）
async function restoreLoginState() {
    const token = localStorage.getItem('login_token');
    const adminKey = localStorage.getItem('admin_key');
    
    if (token && adminKey && isLoggedIn()) {
        // 恢复ADMIN_KEY到内存
        AppConfig.ADMIN_KEY = adminKey;
        return true;
    }
    
    // 如果任何一个缺失，清理所有登录信息
    localStorage.removeItem('login_token');
    localStorage.removeItem('admin_key');
    AppConfig.ADMIN_KEY = '';
    return false;
}

// 应用初始化
async function init() {
    try {
        // 检查是否是分享链接访问
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('share');
        
        if (shareId) {
            // 分享链接访问，显示分享页面
            renderSharePage(shareId);
            return;
        }
        
        // 恢复登录状态
        const isLoggedInState = await restoreLoginState();
        
        if (isLoggedInState) {
            // 已登录，显示主界面
            document.getElementById('app').innerHTML = renderDashboard();
            
            // 初始化侧边栏状态
            initSidebarState();
            
            // 默认显示写笔记页面
            switchView('write');
            
            // 启动活动监控
            startActivityMonitor();
        } else {
            // 未登录，显示登录页面
            document.getElementById('app').innerHTML = renderLoginPage();
            refreshCaptcha();
            
            // 添加回车键监听
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && document.getElementById('loginUsername')) {
                    handleLogin();
                }
            });
        }
    } catch (error) {
        console.error('应用初始化失败:', error);
        document.getElementById('app').innerHTML = `
            <div class="flex items-center justify-center min-h-screen">
                <div class="text-center">
                    <h2 class="text-xl font-bold text-red-400 mb-2">应用初始化失败</h2>
                    <p class="text-slate-400 mb-4">${error.message}</p>
                    <button onclick="location.reload()" class="btn-primary text-white px-6 py-2 rounded-lg">
                        重新加载
                    </button>
                </div>
            </div>
        `;
    }
}

// 切换视图
async function switchView(view) {
    // 防止重复切换
    if (AppConfig.currentView === view && AppConfig.isViewSwitching) {
        return;
    }
    
    AppConfig.isViewSwitching = true;
    AppConfig.currentView = view;
    
    try {
        // 移动端自动关闭菜单
        if (window.innerWidth < 1024) {
            closeMobileMenu();
        }
        
        document.querySelectorAll('.menu-item').forEach(btn => btn.classList.remove('active'));
        const menuId = 'menu' + view.charAt(0).toUpperCase() + view.slice(1);
        document.getElementById(menuId)?.classList.add('active');
        
        // 更新快速访问按钮的高亮状态
        updateQuickAccessHighlight(view);
        
        const content = document.getElementById('mainContent');
        
        // 渲染对应视图（所有模块已预加载）
        if (view === 'write') {
            content.innerHTML = renderWriteView();
            loadCategoryOptions();
            // 初始化字数统计
            updateCharCount();
        } else if (view === 'list') {
            content.innerHTML = renderListView();
            // 自动刷新笔记列表和分类数据
            await Promise.all([
                loadNotesList(),
                loadCategories()
            ]);
        } else if (view === 'categories') {
            content.innerHTML = renderCategoriesView();
            loadCategoriesList();
        } else if (view === 'settings') {
            content.innerHTML = renderSettingsView();
        }
    } finally {
        AppConfig.isViewSwitching = false;
    }
}

// 更新快速访问按钮高亮状态
function updateQuickAccessHighlight(activeView) {
    // 这个函数的实际实现在sidebar.js中
    // 检查sidebar.js中的实现是否存在
    if (typeof window.updateQuickAccessHighlightImpl === 'function') {
        window.updateQuickAccessHighlightImpl(activeView);
    }
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);