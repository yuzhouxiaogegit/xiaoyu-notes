// 视图渲染模块

/**
 * 小宇笔记 - 加密笔记管理系统
 * 作者：宇宙小哥
 * 项目地址：https://github.com/yuzhouxiaogegit/xiaoyu-notes
 * 版权所有 © 2025 宇宙小哥
 */

function renderLoginPage() {
    // 检查是否为本地开发环境
    const isLocalDev = isDevEnvironment();
    
    const devNotice = isLocalDev ? `
        <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
            <div class="flex items-center gap-2 text-yellow-400 text-sm">
                <span>⚠️</span>
                <span><strong>开发模式</strong> - 使用模拟登录</span>
            </div>
            <div class="text-xs text-yellow-200 mt-1">
                用户名: <code class="bg-yellow-500/20 px-1 rounded">admin</code> | 
                密码: <code class="bg-yellow-500/20 px-1 rounded">admin123</code>
            </div>
        </div>
    ` : '';
    
    return `
        <div class="fixed inset-0 flex items-center justify-center p-4 sm:p-6 md:p-8">
            <div class="tech-card p-6 sm:p-8 md:p-12 rounded-3xl w-full max-w-md space-y-6">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-4xl sm:text-5xl mb-4">${window.AppBranding.appIcon}</div>
                    <h1 class="text-2xl sm:text-3xl font-black mb-2">${window.AppBranding.appName}</h1>
                    <p class="text-slate-400 text-sm">${window.AppBranding.appDescription}</p>
                </div>
                
                ${devNotice}
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-400 mb-2">用户名</label>
                        <input id="loginUsername" type="text" placeholder="请输入用户名" maxlength="50"
                            class="w-full input-tech p-3 sm:p-4 rounded-xl text-sm" ${isLocalDev ? 'value="admin"' : ''}>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-slate-400 mb-2">密码</label>
                        <div class="relative">
                            <input id="loginPassword" type="password" placeholder="请输入密码" maxlength="50"
                                class="w-full input-tech p-3 sm:p-4 pr-12 rounded-xl text-sm" ${isLocalDev ? 'value="admin123"' : ''}>
                            <button onclick="togglePasswordVisibility('loginPassword')" type="button"
                                class="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors">
                                <svg id="loginPassword-icon" class="eye-icon" viewBox="0 0 24 24">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-slate-400 mb-2">验证码</label>
                        <div class="flex gap-2 sm:gap-3">
                            <input id="loginCaptcha" type="text" placeholder="请输入验证码" maxlength="6"
                                class="flex-1 input-tech p-3 sm:p-4 rounded-xl text-sm uppercase">
                            <div class="relative w-32 sm:w-40 h-12 cursor-pointer" onclick="refreshCaptcha()">
                                <img id="captchaImage" class="w-full h-full rounded-lg border border-slate-700" alt="验证码">
                                <div class="absolute inset-0 flex items-center justify-center bg-slate-800/50 rounded-lg opacity-0 hover:opacity-100 transition-opacity">
                                    <span class="text-xs text-white">点击刷新</span>
                                </div>
                            </div>
                        </div>
                        <p class="text-xs text-slate-500 mt-2">不区分大小写，点击图片可刷新</p>
                    </div>
                </div>
                
                <button onclick="handleLogin()" class="w-full btn-primary text-white py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg">
                    🔐 登录
                </button>
                
                <p class="text-center text-xs text-slate-500">
                    登录后可管理加密笔记
                </p>
            </div>
        </div>
    `;
}

function renderDashboard() {
    return `
        <!-- 移动端顶部导航栏 -->
        <div class="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50">
            <div class="flex items-center justify-between p-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-lg">${window.AppBranding.appIcon}</div>
                    <h1 class="text-lg font-bold">${window.AppBranding.appName}</h1>
                </div>
                <button onclick="toggleMobileMenu()" id="mobileMenuBtn" class="p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                </button>
            </div>
        </div>

        <!-- 移动端侧边栏遮罩 -->
        <div id="mobileMenuOverlay" class="lg:hidden fixed inset-0 bg-black/50 z-40 hidden" onclick="closeMobileMenu()"></div>

        <!-- 侧边栏 -->
        <aside id="sidebar" class="sidebar fixed lg:relative inset-y-0 left-0 z-50 w-64 lg:w-64 flex-shrink-0 flex flex-col transform -translate-x-full lg:translate-x-0 transition-all duration-300 ease-in-out">
            ${renderSidebar()}
        </aside>

        <!-- 桌面端快速访问浮动按钮（折叠时显示） -->
        <div id="quickAccessFab" class="hidden lg:block fixed left-4 bottom-4 z-40 opacity-0 pointer-events-none transition-all duration-300">
            <div class="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-2 shadow-2xl border border-slate-700/50">
                <div class="flex flex-col gap-1">
                    <button onclick="switchView('write')" class="w-12 h-12 rounded-xl hover:bg-blue-500/20 flex items-center justify-center text-xl transition-colors" title="写笔记">
                        ✍️
                    </button>
                    <button onclick="switchView('list')" class="w-12 h-12 rounded-xl hover:bg-blue-500/20 flex items-center justify-center text-xl transition-colors" title="笔记列表">
                        📋
                    </button>
                    <button onclick="switchView('categories')" class="w-12 h-12 rounded-xl hover:bg-blue-500/20 flex items-center justify-center text-xl transition-colors" title="分类管理">
                        🏷️
                    </button>
                    <button onclick="switchView('settings')" class="w-12 h-12 rounded-xl hover:bg-blue-500/20 flex items-center justify-center text-xl transition-colors" title="系统设置">
                        ⚙️
                    </button>
                </div>
            </div>
        </div>

        <!-- 主内容区域 -->
        <main class="flex-1 overflow-y-auto pt-16 lg:pt-0 transition-all duration-300 ease-in-out" id="mainArea">
            <div id="mainContent" class="p-4 sm:p-6 lg:p-8"></div>
        </main>
    `;
}

function renderSidebar() {
    return `
        <div class="p-6 border-b border-slate-700/50 sidebar-header">
            <!-- 展开状态的完整头部 -->
            <div class="sidebar-header-expanded flex items-center">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xl">${window.AppBranding.appIcon}</div>
                    <div class="sidebar-text">
                        <h1 class="text-lg font-bold">${window.AppBranding.appName}</h1>
                        <p class="text-xs text-slate-500 font-mono">by ${window.AppBranding.author}</p>
                    </div>
                </div>
            </div>
            
            <!-- 折叠状态的简化头部 -->
            <div class="sidebar-header-collapsed hidden flex-col items-center justify-center h-full">
                <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xl">${window.AppBranding.appIcon}</div>
            </div>
        </div>
        <nav class="flex-1 p-4 space-y-2">
            <button onclick="switchView('write')" id="menuWrite" class="menu-item w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left" title="写笔记">
                <span class="text-xl flex-shrink-0">✍️</span>
                <span class="font-medium sidebar-text">写笔记</span>
            </button>
            <button onclick="switchView('list')" id="menuList" class="menu-item w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left" title="笔记列表">
                <span class="text-xl flex-shrink-0">📋</span>
                <span class="font-medium sidebar-text">笔记列表</span>
            </button>
            <button onclick="switchView('categories')" id="menuCategories" class="menu-item w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left" title="分类管理">
                <span class="text-xl flex-shrink-0">🏷️</span>
                <span class="font-medium sidebar-text">分类管理</span>
            </button>
            <button onclick="switchView('settings')" id="menuSettings" class="menu-item w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left" title="系统设置">
                <span class="text-xl flex-shrink-0">⚙️</span>
                <span class="font-medium sidebar-text">系统设置</span>
            </button>
        </nav>
        <div class="p-4 border-t border-slate-700/50">
            <button onclick="handleLogout()" class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-rose-400 hover:bg-rose-500/10 transition-colors" title="退出登录">
                <span class="text-xl flex-shrink-0">🚪</span>
                <span class="font-medium sidebar-text">退出登录</span>
            </button>
        </div>
    `;
}

function renderWriteView() {
    return `
        <div class="max-w-6xl mx-auto space-y-4 sm:space-y-6 animate-slide-in">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
                <div>
                    <h2 class="text-2xl sm:text-3xl font-bold mb-2">创建新笔记</h2>
                    <p class="text-slate-400 text-sm">内容将加密存储，分享时可选择额外加密</p>
                </div>
                <div class="tech-badge px-3 sm:px-4 py-2 rounded-lg text-xs font-bold self-start sm:self-auto">🔒 加密存储</div>
            </div>
            <div class="tech-card p-4 sm:p-6 rounded-2xl space-y-4" style="overflow: visible;">
                <div style="overflow: visible;">
                    <label class="block text-sm font-medium text-slate-400 mb-2">分类</label>
                    <select id="noteCategory" class="w-full input-tech p-3 rounded-xl text-sm cursor-pointer">
                        <option value="default">默认分类</option>
                    </select>
                </div>
                <div class="relative">
                    <textarea id="noteInput" placeholder="在此输入笔记内容..." 
                        oninput="updateCharCount()"
                        maxlength="30000"
                        class="w-full input-tech p-4 sm:p-5 h-64 sm:h-80 lg:h-96 rounded-xl resize-none text-sm leading-relaxed"></textarea>
                    <div class="absolute bottom-3 right-3 text-xs text-slate-500 bg-slate-800/80 px-2 py-1 rounded">
                        <span id="charCount">0</span> / 30000 字
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row gap-3">
                    <button onclick="handleSaveNote()" class="flex-1 btn-primary text-white py-3 sm:py-4 rounded-xl font-bold flex items-center justify-center gap-2">
                        <span>💾</span><span>保存笔记</span>
                    </button>
                    <button onclick="handleAISummary()" class="btn-secondary px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold flex items-center justify-center gap-2">
                        <span>🤖</span><span>AI 总结</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderCategoriesView() {
    return `
        <div class="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-slide-in">
            <div class="mb-6 sm:mb-8">
                <h2 class="text-2xl sm:text-3xl font-bold mb-2">分类管理</h2>
                <p class="text-slate-400 text-sm">创建和管理笔记分类，编码自动生成</p>
            </div>
            
            <div class="tech-card p-4 sm:p-6 rounded-2xl space-y-4">
                <h3 class="text-lg font-bold mb-4">创建新分类</h3>
                <div class="flex flex-col sm:flex-row gap-3">
                    <input id="newCategoryName" type="text" placeholder="输入分类名称（如：工作、学习、生活）" maxlength="500"
                        class="flex-1 input-tech p-3 rounded-xl text-sm">
                    <button onclick="handleCreateCategory()" class="btn-primary text-white px-4 sm:px-6 py-3 rounded-xl font-bold whitespace-nowrap">
                        ➕ 创建分类
                    </button>
                </div>
                <p class="text-xs text-slate-500">分类编码将自动生成，格式：cat_{timestamp}_{random}</p>
            </div>
            
            <div class="tech-card p-4 sm:p-6 rounded-2xl">
                <h3 class="text-lg font-bold mb-4">分类列表</h3>
                <div id="categoriesList" class="space-y-3"></div>
            </div>
        </div>
    `;
}


function renderListView() {
    return `
        <div class="max-w-6xl mx-auto space-y-4 sm:space-y-6 animate-slide-in">
            <div class="mb-6 sm:mb-8">
                <h2 class="text-2xl sm:text-3xl font-bold mb-4">笔记列表 <span class="text-slate-400 text-lg sm:text-xl font-normal">(共 <span id="totalCount">-</span> 条笔记)</span></h2>
                <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button onclick="toggleSelectAllBtn()" id="selectAllBtn" class="btn-secondary px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-sm">
                        ☑️ 全选
                    </button>
                    <button onclick="handleBatchDelete()" id="batchDeleteBtn" class="btn-danger px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold hidden text-sm">
                        🗑️ 批量删除 (<span id="selectedCount">0</span>)
                    </button>
                    <button onclick="handleRefresh()" class="btn-secondary px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-sm">
                        🔄 刷新
                    </button>
                </div>
            </div>
            
            <div class="flex gap-2 sm:gap-3 mb-4 sm:mb-6 overflow-x-auto pb-2" id="categoryTabs"></div>
            
            <div id="notesList" class="space-y-3 sm:space-y-4"></div>
            <div id="pagination" class="flex justify-center items-center gap-1 sm:gap-2 pt-4 sm:pt-6 flex-wrap"></div>
        </div>
    `;
}

function renderSettingsView() {
    // 检查是否为本地开发环境
    const isLocalDev = isDevEnvironment();
    
    const devNotice = isLocalDev ? `
        <div class="tech-card p-4 sm:p-6 rounded-2xl mb-4 sm:mb-6 bg-yellow-500/10 border border-yellow-500/30">
            <div class="flex items-center gap-3 mb-3">
                <span class="text-2xl">⚠️</span>
                <h3 class="text-lg font-bold text-yellow-400">开发模式</h3>
            </div>
            <div class="space-y-2 text-sm text-yellow-200">
                <p>• 当前运行在本地开发环境</p>
                <p>• API请求使用模拟数据</p>
                <p>• 数据不会真实保存</p>
                <p>• 部署到生产环境后将自动切换到正常模式</p>
            </div>
        </div>
    ` : '';
    
    return `
        <div class="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-slide-in">
            <div class="mb-6 sm:mb-8">
                <h2 class="text-2xl sm:text-3xl font-bold mb-2">系统设置</h2>
                <p class="text-slate-400 text-sm">查看系统配置信息</p>
            </div>
            
            ${devNotice}
            
            <div class="tech-card p-4 sm:p-6 rounded-2xl space-y-4 sm:space-y-6">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">管理密钥状态</label>
                    <div class="flex items-center gap-3">
                        <div class="w-3 h-3 rounded-full ${isLocalDev ? 'bg-blue-400' : (AppConfig.ADMIN_KEY ? 'bg-green-400' : 'bg-yellow-400')}"></div>
                        <span class="${isLocalDev ? 'text-blue-400' : (AppConfig.ADMIN_KEY ? 'text-green-400' : 'text-yellow-400')} text-sm font-medium">
                            ${isLocalDev ? '开发模式（使用模拟密钥）' : (AppConfig.ADMIN_KEY ? '已配置' : '未配置')}
                        </span>
                    </div>
                    <p class="text-xs text-slate-500 mt-2">
                        ${isLocalDev ? '开发环境使用模拟数据和临时密钥，登录后自动生成' : '管理密钥在服务端环境变量中配置'}
                    </p>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">数据传输安全</label>
                    <div class="flex items-center gap-3">
                        <div class="w-3 h-3 rounded-full bg-blue-400"></div>
                        <span class="text-blue-400 text-sm font-medium">
                            ${isLocalDev ? '开发模式（模拟数据）' : '全POST + 混淆'}
                        </span>
                    </div>
                    <p class="text-xs text-slate-500 mt-2">
                        ${isLocalDev ? '开发环境使用本地模拟，生产环境使用加密传输' : '所有API请求使用POST方法，数据通过动态密钥混淆传输'}
                    </p>
                </div>
            </div>
            
            <div class="tech-card p-4 sm:p-6 rounded-2xl">
                <h3 class="text-lg font-bold mb-4">关于</h3>
                <div class="space-y-2 text-sm text-slate-400">
                    <p>📝 项目: <a href="https://github.com/${window.AppBranding.github.username}/${window.AppBranding.github.repository}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline transition-colors">${window.AppBranding.projectInfo.name}</a></p>
                    <p>👤 作者: ${window.AppBranding.projectInfo.author}</p>
                    <p>🔒 加密: ${window.AppBranding.projectInfo.encryption}</p>
                    <p>☁️ 部署: ${window.AppBranding.projectInfo.deployment}</p>
                    <p>🛡️ 隐私: ${window.AppBranding.projectInfo.privacy}</p>
                    <p>🏷️ 分类: ${window.AppBranding.projectInfo.categories}</p>
                    <p>👁️ 限制: ${window.AppBranding.projectInfo.sharing}</p>
                    <p>📱 PWA: ${window.AppBranding.projectInfo.pwa}</p>
                </div>
            </div>
            
            <div class="tech-card p-4 sm:p-6 rounded-2xl">
                <h3 class="text-lg font-bold mb-4">缓存管理</h3>
                <div class="space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <p class="text-sm font-medium">本地缓存</p>
                            <p class="text-xs text-slate-500">清理浏览器缓存和离线数据</p>
                        </div>
                        <button onclick="clearLocalCache()" class="btn-secondary px-4 py-2 rounded-lg text-sm font-bold self-start sm:self-auto">
                            🗑️ 清理缓存
                        </button>
                    </div>
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <p class="text-sm font-medium">会话数据</p>
                            <p class="text-xs text-slate-500">清理登录状态和临时数据</p>
                        </div>
                        <button onclick="clearSessionData()" class="btn-secondary px-4 py-2 rounded-lg text-sm font-bold self-start sm:self-auto">
                            🔄 重置会话
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}
