// 侧边栏和导航相关功能模块

/**
 * 小宇笔记 - 侧边栏模块
 * 作者：宇宙小哥
 */

// 使用window对象避免重复声明错误
window.sidebarCollapsed = window.sidebarCollapsed || false;
window.autoCollapseTimer = window.autoCollapseTimer || null;

// 自动折叠侧边栏（基于屏幕宽度）
function autoCollapseSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    const screenWidth = window.innerWidth;
    const shouldCollapse = screenWidth < 1024; // 统一使用1024px断点
    
    if (shouldCollapse && !window.sidebarCollapsed) {
        collapseSidebar();
    } else if (!shouldCollapse && window.sidebarCollapsed) {
        expandSidebar();
    }
}

// 折叠侧边栏
function collapseSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarTexts = document.querySelectorAll('.sidebar-text');
    const quickAccessFab = document.getElementById('quickAccessFab');
    const headerExpanded = document.querySelector('.sidebar-header-expanded');
    const headerCollapsed = document.querySelector('.sidebar-header-collapsed');
    const passwordSection = document.querySelector('.sidebar-password-section');
    
    window.sidebarCollapsed = true;
    
    // 折叠状态 - 宽度改为 20 (80px)
    sidebar.classList.remove('w-64');
    sidebar.classList.add('w-20');
    
    // 切换头部显示
    if (headerExpanded) headerExpanded.style.display = 'none';
    if (headerCollapsed) headerCollapsed.style.display = 'flex';
    
    // 隐藏文本
    sidebarTexts.forEach(text => {
        text.style.opacity = '0';
        text.style.transform = 'translateX(-10px)';
    });
    
    // 隐藏笔记密码输入框
    if (passwordSection) {
        passwordSection.style.display = 'none';
    }
    
    // 显示快速访问按钮
    if (quickAccessFab) {
        setTimeout(() => {
            quickAccessFab.style.opacity = '1';
            quickAccessFab.style.pointerEvents = 'auto';
        }, 300);
    }
    
    // 延迟隐藏文本以配合动画
    setTimeout(() => {
        sidebarTexts.forEach(text => {
            text.style.display = 'none';
        });
    }, 150);
}

// 展开侧边栏
function expandSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarTexts = document.querySelectorAll('.sidebar-text');
    const quickAccessFab = document.getElementById('quickAccessFab');
    const headerExpanded = document.querySelector('.sidebar-header-expanded');
    const headerCollapsed = document.querySelector('.sidebar-header-collapsed');
    const passwordSection = document.querySelector('.sidebar-password-section');
    
    window.sidebarCollapsed = false;
    
    // 展开状态
    sidebar.classList.remove('w-20');
    sidebar.classList.add('w-64');
    
    // 切换头部显示
    if (headerExpanded) headerExpanded.style.display = 'flex';
    if (headerCollapsed) headerCollapsed.style.display = 'none';
    
    // 显示笔记密码输入框
    if (passwordSection) {
        passwordSection.style.display = 'block';
    }
    
    // 隐藏快速访问按钮
    if (quickAccessFab) {
        quickAccessFab.style.opacity = '0';
        quickAccessFab.style.pointerEvents = 'none';
    }
    
    // 显示文本
    sidebarTexts.forEach(text => {
        text.style.display = 'block';
    });
    
    // 延迟显示文本动画
    setTimeout(() => {
        sidebarTexts.forEach(text => {
            text.style.opacity = '1';
            text.style.transform = 'translateX(0)';
        });
    }, 50);
}

// 初始化侧边栏状态
function initSidebarState() {
    // 初始化时根据屏幕宽度自动折叠
    autoCollapseSidebar();
    
    // 监听窗口大小变化
    window.addEventListener('resize', () => {
        // 防抖处理，避免频繁触发
        if (window.autoCollapseTimer) {
            clearTimeout(window.autoCollapseTimer);
        }
        window.autoCollapseTimer = setTimeout(autoCollapseSidebar, 200);
    });
}

// 移动端菜单控制
function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileMenuOverlay');
    const isOpen = !sidebar.classList.contains('-translate-x-full');
    
    if (isOpen) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
}

function openMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileMenuOverlay');
    
    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // 防止背景滚动
}

function closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileMenuOverlay');
    
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
    document.body.style.overflow = ''; // 恢复滚动
}

// 更新快速访问按钮的高亮状态
function updateQuickAccessHighlightImpl(currentView) {
    const quickAccessFab = document.getElementById('quickAccessFab');
    if (!quickAccessFab) return;
    
    const buttons = quickAccessFab.querySelectorAll('button');
    buttons.forEach((btn, index) => {
        btn.classList.remove('bg-blue-500/30', 'text-blue-300');
        btn.classList.add('hover:bg-blue-500/20');
    });
    
    // 根据当前视图高亮对应按钮
    const viewIndex = {
        'write': 0,
        'list': 1,
        'categories': 2,
        'settings': 3
    };
    
    const activeIndex = viewIndex[currentView];
    if (activeIndex !== undefined && buttons[activeIndex]) {
        buttons[activeIndex].classList.remove('hover:bg-blue-500/20');
        buttons[activeIndex].classList.add('bg-blue-500/30', 'text-blue-300');
    }
}