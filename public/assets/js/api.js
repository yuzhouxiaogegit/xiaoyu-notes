/**
 * 小宇笔记 - 高复用API模块
 * 作者：宇宙小哥
 * 基于核心框架重构，实现高封装和复用
 */

// 版权校验 - 延迟检查，避免阻止初始化
(function() {
    setTimeout(() => {
        if (!window.CopyrightInfo || window.CopyrightInfo.author !== '宇宙小哥') {
            throw new Error('Copyright verification failed');
        }
    }, 100);
})();

// 兼容原有的apiRequest函数
async function apiRequest(endpoint, options = {}) {
    // 1. 定义无需 ADMIN_KEY 的白名单
    const whiteList = ['/api/captcha', '/api/login', '/api/verify'];
    const isPublicEndpoint = whiteList.includes(endpoint);

    // 2. 开发环境处理
    if (isDevEnvironment()) {
        console.log(`[Dev Mode] Requesting: ${endpoint}`);
        // 开发环境直接返回null，让各个API函数处理模拟数据
        return null;
    }
    
    // 3. 授权检查（开发环境跳过检查）
    if (!isPublicEndpoint && !isDevEnvironment() && !AppConfig.ADMIN_KEY) {
        console.warn('请求被拦截：缺少管理密钥', endpoint);
        throw new Error('Unauthorized: Admin key missing');
    }

    // 4. 版权检查
    const isAuthorized = window.CopyrightInfo?.author === '宇宙小哥';
    if (!isPublicEndpoint && !isAuthorized) {
        throw new Error('System integrity check failed');
    }

    const url = `${AppConfig.API_URL}${endpoint}`;
    const sessionToken = localStorage.getItem('login_token');
    
    // 5. 构建 Headers
    const headers = {
        'Content-Type': 'application/json',
        ...(AppConfig.ADMIN_KEY && { 'Authorization': AppConfig.ADMIN_KEY }),
        'X-Obfuscated': 'true',
        ...options.headers
    };
    
    if (sessionToken) {
        headers['X-Session-Token'] = sessionToken;
    }

    // 6. 数据混淆处理
    let requestBody = options.body;
    if (requestBody && headers['X-Obfuscated'] === 'true') {
        try {
            const data = JSON.parse(requestBody);
            const obfuscatedData = obfuscateWithSession(data, endpoint);
            requestBody = JSON.stringify(obfuscatedData);
        } catch (e) {
            console.warn('数据混淆失败，使用原始数据', e);
        }
    }

    try {
        const response = await fetch(url, { 
            ...options, 
            headers,
            body: requestBody
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        let data = await response.json();
        
        // 7. 响应数据解混淆
        if (response.headers.get('X-Obfuscated') === 'true' && data.payload) {
            try {
                const deobfuscatedData = deobfuscateWithSession(data, endpoint);
                if (deobfuscatedData) {
                    data = deobfuscatedData;
                }
            } catch (e) {
                console.warn('响应数据解混淆失败', e);
            }
        }
        
        return data;
        
    } catch (error) {
        console.error(`API请求失败 [${endpoint}]:`, error);
        showToast(error.message || '网络连接失败', 'error');
        return null;
    }
}

// 高复用认证API类
class AuthAPI {
    // 获取验证码
    static async getCaptcha() {
        if (isDevEnvironment()) {
            return AuthAPI.generateMockCaptcha();
        }
        
        try {
            const response = await fetch(`${AppConfig.API_URL}/api/captcha`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.image || !data.token) {
                throw new Error('验证码数据格式错误');
            }
            
            return { 
                imageUrl: data.image,
                captchaToken: data.token 
            };
        } catch (error) {
            showToast('获取验证码失败: ' + error.message, 'error');
            return null;
        }
    }

    // 生成模拟验证码
    static generateMockCaptcha() {
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        
        const svg = `
            <svg width="120" height="40" xmlns="http://www.w3.org/2000/svg">
                <rect width="120" height="40" fill="#1e293b"/>
                <text x="60" y="25" font-family="Arial, sans-serif" font-size="18" 
                      font-weight="bold" fill="#60a5fa" text-anchor="middle">${code}</text>
            </svg>
        `;
        
        const base64Image = `data:image/svg+xml;base64,${btoa(svg)}`;
        const token = btoa(`${code}:${Date.now()}`);
        
        return {
            imageUrl: base64Image,
            captchaToken: token
        };
    }

    // 登录
    static async login(username, password, captcha, captchaToken) {
        if (isDevEnvironment()) {
            return AuthAPI.handleMockLogin(username, password, captcha, captchaToken);
        }
        
        try {
            const loginData = { username, password, captcha, captchaToken };
            // 登录时使用基础混淆，因为还没有会话信息
            const obfuscatedData = obfuscateRequestData(loginData, '/api/login');
            
            const response = await fetch(`${AppConfig.API_URL}/api/login`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Obfuscated': 'true'
                },
                body: JSON.stringify(obfuscatedData)
            });
            
            let data = await response.json();
            
            // 登录响应也使用基础解混淆
            if (response.headers.get('X-Obfuscated') === 'true' && data.payload) {
                const deobfuscatedData = deobfuscateResponseData(data, '/api/login');
                if (deobfuscatedData) {
                    data = deobfuscatedData;
                }
            }
            
            if (!response.ok) {
                return { error: data.error || '登录失败' };
            }
            
            return data;
        } catch (error) {
            console.error('登录请求失败:', error);
            return { error: '网络连接失败，请检查网络后重试' };
        }
    }

    // 模拟登录验证
    static handleMockLogin(username, password, captcha, captchaToken) {
        try {
            const decoded = atob(captchaToken);
            const [originalCode, timestamp] = decoded.split(':');
            const now = Date.now();
            
            if (now - parseInt(timestamp) > 5 * 60 * 1000) {
                return { error: "验证码已过期" };
            }
            
            if (captcha.toUpperCase() !== originalCode.toUpperCase()) {
                return { error: "验证码错误" };
            }
            
            const devUsername = 'admin';
            const devPassword = 'admin123';
            
            if (username === devUsername && password === devPassword) {
                const token = btoa(`${username}:${Date.now()}`);
                const adminKey = 'dev-admin-key-' + Math.random().toString(36).substr(2, 9);
                
                return {
                    status: "OK",
                    token: token,
                    admin_key: adminKey
                };
            } else {
                return { error: "用户名或密码错误（开发环境：admin/admin123）" };
            }
        } catch (e) {
            return { error: "登录验证失败" };
        }
    }
}

// 兼容原有函数
async function getCaptcha() {
    return await AuthAPI.getCaptcha();
}

async function login(username, password, captcha, captchaToken) {
    return await AuthAPI.login(username, password, captcha, captchaToken);
}

// 开发环境分类数据管理辅助函数
function getDevCategories() {
    const stored = localStorage.getItem('dev_categories');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.warn('解析开发环境分类数据失败，使用默认数据');
        }
    }
    
    // 默认模拟分类数据
    const defaultCategories = [
        { code: 'work', name: '工作笔记' },
        { code: 'study', name: '学习资料' },
        { code: 'life', name: '生活记录' },
        { code: 'ideas', name: '想法灵感' }
    ];
    
    localStorage.setItem('dev_categories', JSON.stringify(defaultCategories));
    return defaultCategories;
}

function saveDevCategories(categories) {
    localStorage.setItem('dev_categories', JSON.stringify(categories));
}

function getNextDevCategoryCode() {
    return `dev_cat_${Date.now()}`;
}

// 高复用分类API类
class CategoriesAPI {
    // 创建分类
    static async create(name) {
        if (isDevEnvironment()) {
            console.log('开发模式：创建分类', name);
            const categories = getDevCategories();
            const code = getNextDevCategoryCode();
            const newCategory = { code, name };
            
            categories.push(newCategory);
            saveDevCategories(categories);
            
            return { status: "OK", code, name };
        }
        
        return await apiRequest('/api/categories/create', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
    }

    // 更新分类
    static async update(code, name) {
        if (isDevEnvironment()) {
            console.log('开发模式：更新分类', { code, name });
            const categories = getDevCategories();
            const categoryIndex = categories.findIndex(c => c.code === code);
            
            if (categoryIndex !== -1) {
                categories[categoryIndex].name = name;
                saveDevCategories(categories);
                return { status: "OK", name };
            } else {
                return { error: "分类不存在" };
            }
        }
        
        return await apiRequest('/api/categories/update', {
            method: 'POST',
            body: JSON.stringify({ code, name })
        });
    }

    // 获取分类列表
    static async getList() {
        if (isDevEnvironment()) {
            const categories = getDevCategories();
            return { categories };
        }
        
        return await apiRequest('/api/categories/list', {
            method: 'POST',
            body: JSON.stringify({})
        });
    }

    // 获取分类统计
    static async getStats() {
        if (isDevEnvironment()) {
            const categories = getDevCategories();
            const notes = getDevNotes();
            
            // 计算每个分类的笔记数量
            const categoriesWithCount = categories.map(cat => {
                const count = notes.filter(note => note.category_code === cat.code).length;
                return { ...cat, count };
            });
            
            return { categories: categoriesWithCount };
        }
        
        return await apiRequest('/api/categories/stats', {
            method: 'POST',
            body: JSON.stringify({})
        });
    }

    // 删除分类
    static async delete(code) {
        if (isDevEnvironment()) {
            console.log('开发模式：删除分类', code);
            const categories = getDevCategories();
            const notes = getDevNotes();
            
            // 检查该分类下是否有笔记
            const notesInCategory = notes.filter(note => note.category_code === code);
            if (notesInCategory.length > 0) {
                return { 
                    error: "该分类下有笔记", 
                    count: notesInCategory.length 
                };
            }
            
            // 删除分类
            const filteredCategories = categories.filter(cat => cat.code !== code);
            saveDevCategories(filteredCategories);
            
            return { status: "Deleted" };
        }
        
        return await apiRequest('/api/categories/delete', {
            method: 'POST',
            body: JSON.stringify({ code })
        });
    }
}

// 兼容原有函数
async function createCategory(name) {
    return await CategoriesAPI.create(name);
}

async function updateCategory(code, name) {
    return await CategoriesAPI.update(code, name);
}

async function getCategories() {
    return await CategoriesAPI.getList();
}

async function getCategoryStats() {
    return await CategoriesAPI.getStats();
}

async function deleteCategory(code) {
    return await CategoriesAPI.delete(code);
}

// 开发环境数据管理辅助函数
function getDevNotes() {
    const stored = localStorage.getItem('dev_notes');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.warn('解析开发环境笔记数据失败，使用默认数据');
        }
    }
    
    // 默认模拟数据（明文，将在保存时加密）
    const defaultNotes = [
        {
            id: 1,
            content: '这是第一条模拟笔记内容，用于开发环境测试。',
            category_code: 'work',
            view_limit: -1,
            view_count: 0,
            created_at: new Date().toISOString(),
            _isPlainText: true // 标记为明文，需要在首次读取时加密
        },
        {
            id: 2,
            content: '这是第二条模拟笔记，包含更多的测试内容。可以用来验证界面显示效果。',
            category_code: 'study',
            view_limit: -1,
            view_count: 0,
            created_at: new Date(Date.now() - 86400000).toISOString(),
            _isPlainText: true // 标记为明文，需要在首次读取时加密
        }
    ];
    
    // 异步加密默认数据
    migrateDefaultNotes(defaultNotes);
    
    return defaultNotes;
}

// 迁移默认数据（将明文加密）
async function migrateDefaultNotes(notes) {
    const serverKey = 'server-key-dev';
    let needsSave = false;
    
    for (const note of notes) {
        if (note._isPlainText) {
            try {
                note.content = await encrypt(note.content, serverKey);
                delete note._isPlainText;
                needsSave = true;
            } catch (e) {
                console.warn('加密默认笔记失败:', e);
            }
        }
    }
    
    if (needsSave) {
        saveDevNotes(notes);
    }
}

function saveDevNotes(notes) {
    localStorage.setItem('dev_notes', JSON.stringify(notes));
}

function getNextDevNoteId() {
    const notes = getDevNotes();
    return Math.max(...notes.map(n => n.id), 0) + 1;
}

// 保存笔记
async function saveNote(content, category_code = 'default', view_limit = -1) {
    if (isDevEnvironment()) {
        // 本地开发环境：保存到 localStorage
        console.log('开发模式：保存笔记到本地存储', { content: content.substring(0, 50) + '...', category_code, view_limit });
        
        const notes = getDevNotes();
        const newNote = {
            id: getNextDevNoteId(),
            content: content,
            category_code: category_code,
            view_limit: view_limit,
            view_count: 0,
            created_at: new Date().toISOString()
        };
        
        notes.unshift(newNote); // 添加到开头
        saveDevNotes(notes);
        
        return { status: "OK", id: newNote.id };
    }
    
    // 生产环境：调用真实API
    return await apiRequest('/api/save', {
        method: 'POST',
        body: JSON.stringify({ content, category_code, view_limit })
    });
}

// 更新笔记
async function updateNote(id, content, category_code = 'default') {
    if (isDevEnvironment()) {
        // 本地开发环境：更新 localStorage 中的笔记
        console.log('开发模式：更新笔记', { id, content: content.substring(0, 50) + '...', category_code });
        
        const notes = getDevNotes();
        const noteIndex = notes.findIndex(n => n.id === id);
        
        if (noteIndex !== -1) {
            // 在新的密码架构下，content 参数是明文，需要加密后存储
            const serverKey = 'server-key-dev';
            const encryptedContent = await encrypt(content, serverKey);
            
            notes[noteIndex].content = encryptedContent;
            notes[noteIndex].category_code = category_code;
            saveDevNotes(notes);
            return { status: "OK" };
        } else {
            return { error: "笔记不存在" };
        }
    }
    
    // 生产环境：调用真实API
    return await apiRequest('/api/note/update', {
        method: 'POST',
        body: JSON.stringify({ id, content, category_code })
    });
}

// 更新笔记分类
async function updateNoteCategory(noteId, category_code) {
    if (isDevEnvironment()) {
        // 本地开发环境：更新 localStorage 中的笔记分类
        console.log('开发模式：更新笔记分类', { noteId, category_code });
        
        const notes = getDevNotes();
        const noteIndex = notes.findIndex(n => n.id === noteId);
        
        if (noteIndex !== -1) {
            notes[noteIndex].category_code = category_code;
            saveDevNotes(notes);
            return { status: "OK" };
        } else {
            return { error: "笔记不存在" };
        }
    }
    
    // 生产环境：调用真实API
    return await apiRequest('/api/note/update-category', {
        method: 'POST',
        body: JSON.stringify({ id: noteId, category_code })
    });
}

// 获取笔记列表（改为POST请求，参数可混淆）
async function getNotes(page = 1, category = 'all') {
    if (isDevEnvironment()) {
        // 本地开发环境：从 localStorage 读取笔记数据
        const allNotes = getDevNotes();
        
        // 模拟后端解密过程：将存储的加密内容解密为明文
        const decryptedNotes = [];
        const serverKey = 'server-key-dev'; // 开发环境使用固定密钥
        
        for (const note of allNotes) {
            try {
                // 尝试解密内容
                const decryptedContent = await decrypt(note.content, serverKey);
                decryptedNotes.push({
                    ...note,
                    content: decryptedContent || note.content // 如果解密失败，使用原内容
                });
            } catch (e) {
                // 如果解密失败，可能是明文内容，直接使用
                decryptedNotes.push(note);
            }
        }
        
        // 按分类筛选
        let filteredNotes = decryptedNotes;
        if (category !== 'all') {
            filteredNotes = decryptedNotes.filter(note => note.category_code === category);
        }
        
        // 分页处理
        const limit = AppConfig.pageSize || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedNotes = filteredNotes.slice(startIndex, endIndex);
        
        return {
            data: paginatedNotes,
            total: filteredNotes.length,
            page: page,
            limit: limit
        };
    }
    
    // 生产环境：调用真实API，后端已解密返回明文内容
    return await apiRequest('/api/list', {
        method: 'POST',
        body: JSON.stringify({ 
            page, 
            limit: AppConfig.pageSize,
            category 
        })
    });
}

// 删除笔记（支持批量）
async function deleteNotes(ids) {
    if (isDevEnvironment()) {
        // 本地开发环境：从 localStorage 删除笔记
        const idArray = Array.isArray(ids) ? ids : [ids];
        console.log('开发模式：删除笔记', idArray);
        
        const notes = getDevNotes();
        const filteredNotes = notes.filter(note => !idArray.includes(note.id));
        
        saveDevNotes(filteredNotes);
        
        return { status: "Deleted", count: idArray.length };
    }
    
    // 生产环境：调用真实API
    return await apiRequest('/api/delete', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.isArray(ids) ? ids : [ids] })
    });
}

// 创建分享链接
async function createShareLink(content, view_limit = -1) {
    if (isDevEnvironment()) {
        // 本地开发环境：生成模拟分享链接并存储到 localStorage
        const pid = 'dev-share-' + Date.now();
        console.log('开发模式：模拟创建分享链接', { pid, view_limit });
        
        // 将分享数据存储到 localStorage
        const shareData = {
            content: content,
            view_limit: view_limit,
            view_count: 0,
            created_at: new Date().toISOString()
        };
        localStorage.setItem(`share_${pid}`, JSON.stringify(shareData));
        
        return `${location.origin}?share=${pid}`;
    }
    
    // 生产环境：调用真实API
    const pid = crypto.randomUUID();
    const result = await apiRequest('/api/save', {
        method: 'POST',
        body: JSON.stringify({ content, view_limit, public_id: pid, is_share: true })
    });
    
    if (result && result.status === 'OK') {
        return `${location.origin}?share=${pid}`;
    } else {
        throw new Error('创建分享链接失败');
    }
}

// 获取分享内容（改为POST，避免URL暴露分享ID）
async function getShareContent(shareId) {
    if (isDevEnvironment()) {
        // 本地开发环境：从 localStorage 读取分享内容
        console.log('开发模式：模拟获取分享内容', shareId);
        
        const shareKey = `share_${shareId}`;
        const shareDataStr = localStorage.getItem(shareKey);
        
        if (!shareDataStr) {
            console.log('分享链接不存在或已过期');
            return null;
        }
        
        try {
            const shareData = JSON.parse(shareDataStr);
            
            // 增加查看次数
            shareData.view_count = (shareData.view_count || 0) + 1;
            
            // 检查是否超过查看限制
            const isLastView = shareData.view_limit > 0 && shareData.view_count >= shareData.view_limit;
            
            // 如果是最后一次查看，删除数据
            if (isLastView) {
                localStorage.removeItem(shareKey);
            } else {
                // 否则更新查看次数
                localStorage.setItem(shareKey, JSON.stringify(shareData));
            }
            
            return {
                content: shareData.content,
                view_count: shareData.view_count,
                view_limit: shareData.view_limit,
                is_last_view: isLastView
            };
        } catch (e) {
            console.error('解析分享数据失败:', e);
            return null;
        }
    }
    
    // 生产环境：调用真实API
    try {
        const response = await fetch(`${AppConfig.API_URL}/api/share`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Obfuscated': 'true'
            },
            body: JSON.stringify(obfuscateRequestData({ shareId }, '/api/share'))
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('分享API错误:', errorData);
            return null;
        }
        
        let data = await response.json();
        
        // 如果服务端返回混淆数据，进行解混淆
        if (response.headers.get('X-Obfuscated') === 'true' && data.payload) {
            const deobfuscatedData = deobfuscateResponseData(data, '/api/share');
            if (deobfuscatedData) {
                data = deobfuscatedData;
            }
        }
        
        return data;
    } catch (error) {
        console.error('获取分享内容失败:', error);
        return null;
    }
}

// AI 总结
async function getAISummary(text) {
    if (isDevEnvironment()) {
        // 本地开发环境：返回模拟AI总结
        console.log('开发模式：模拟AI总结');
        return { 
            summary: `这是一段模拟的AI总结内容。原文大约${text.length}个字符，主要内容包括：${text.substring(0, 100)}...` 
        };
    }
    
    // 生产环境：调用真实API
    return await apiRequest('/api/ai-sum', {
        method: 'POST',
        body: JSON.stringify({ text })
    });
}
