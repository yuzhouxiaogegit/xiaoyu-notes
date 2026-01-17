// 笔记管理相关功能模块

/**
 * 小宇笔记 - 笔记管理模块
 * 作者：宇宙小哥
 */

// 通用字数统计函数
function updateCharacterCount(inputElement, countElement, maxLength = 30000) {
    if (!inputElement || !countElement) return;
    
    const count = inputElement.value.length;
    countElement.textContent = count.toLocaleString();
    
    // 统一的颜色变化逻辑
    const percentage = count / maxLength;
    if (count === 0) {
        countElement.className = 'text-slate-500';
    } else if (percentage < 0.33) {
        countElement.className = 'text-blue-400';
    } else if (percentage < 0.67) {
        countElement.className = 'text-green-400';
    } else if (percentage < 0.9) {
        countElement.className = 'text-yellow-400';
    } else if (percentage < 1.0) {
        countElement.className = 'text-orange-400';
    } else {
        countElement.className = 'text-red-400';
    }
}

// 更新字数统计（写笔记页面）
function updateCharCount() {
    const input = document.getElementById('noteInput');
    const countSpan = document.getElementById('charCount');
    updateCharacterCount(input, countSpan, 30000);
}

// 保存笔记
async function handleSaveNote() {
    const content = document.getElementById('noteInput').value.trim();
    const category = document.getElementById('noteCategory').value.trim() || 'default';
    
    if (!content) {
        showToast('内容不能为空', 'warning');
        return;
    }
    
    // 检查是否为本地开发环境
    const isLocalDev = isDevEnvironment();
    
    // 生产环境需要检查登录状态
    if (!isLocalDev && !isLoggedIn()) {
        showToast('请先登录', 'warning');
        return;
    }
    
    LoadingManager.show('saveNote', '正在保存笔记...');
    
    try {
        // 直接发送明文内容，后端负责加密存储
        const result = await saveNote(content, category);
        
        if (result) {
            document.getElementById('noteInput').value = '';
            document.getElementById('noteCategory').value = 'default';
            updateCharCount(); // 重置字数统计
            showToast('保存成功！', 'success');
        }
    } catch (error) {
        showToast('保存失败：' + error.message, 'error');
    } finally {
        LoadingManager.hide('saveNote');
    }
}

// 处理刷新按钮点击
async function handleRefresh() {
    // 防止重复点击
    if (AppConfig.isRefreshing) {
        return;
    }
    
    AppConfig.isRefreshing = true;
    
    try {
        showToast('正在刷新...', 'info');
        
        // 重新加载笔记列表和分类数据
        await Promise.all([
            loadNotesList(),
            loadCategories()
        ]);
        
        showToast('刷新完成', 'success');
    } catch (error) {
        console.error('刷新失败:', error);
        showToast('刷新失败，请重试', 'error');
    } finally {
        AppConfig.isRefreshing = false;
    }
}

// 加载笔记列表
async function loadNotesList() {
    // 检查是否已登录（开发环境跳过检查）
    if (!isDevEnvironment() && !isLoggedIn()) {
        const listDiv = document.getElementById('notesList');
        if (listDiv) {
            listDiv.innerHTML = `
                <div class="tech-card p-12 rounded-2xl text-center">
                    <div class="text-5xl mb-4">🔐</div>
                    <h3 class="text-xl font-bold mb-2">需要登录</h3>
                    <p class="text-slate-400 text-sm">请先登录以查看笔记列表</p>
                </div>
            `;
        }
        return;
    }
    
    LoadingManager.show('loadNotes', '正在加载笔记...');
    
    try {
        const data = await getNotes(AppConfig.currentPage, AppConfig.currentCategory);
        if (!data) return;
    
    document.getElementById('totalCount').textContent = data.total;
    const listDiv = document.getElementById('notesList');
    listDiv.innerHTML = '';
    
    if (data.data.length === 0) {
        listDiv.innerHTML = `
            <div class="tech-card p-12 rounded-2xl text-center">
                <div class="text-5xl mb-4">📝</div>
                <h3 class="text-xl font-bold mb-2">暂无笔记</h3>
                <p class="text-slate-400 text-sm">点击左侧"写笔记"创建第一条笔记</p>
            </div>
        `;
        return;
    }
    
    for (let note of data.data) {
        // 直接使用明文内容，不再解密
        const clearText = note.content;
        const preview = clearText.substring(0, 150) + (clearText.length > 150 ? '...' : '');
        
        // 获取分类名称
        const category = (AppConfig.categories || []).find(c => c.code === note.category_code);
        const categoryName = category ? category.name : '默认';
        
        const card = document.createElement('div');
        card.className = "tech-card p-4 sm:p-6 rounded-2xl space-y-3 sm:space-y-4";
        card.innerHTML = `
            <div class="flex items-start gap-3 sm:gap-4">
                <input type="checkbox" class="checkbox-custom note-checkbox mt-1" data-note-id="${note.id}" onchange="toggleNoteSelection(${note.id}, this.checked)">
                <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                        <span class="tech-badge px-2 sm:px-3 py-1 rounded-lg text-xs">#${note.id}</span>
                        <span class="tech-badge px-2 sm:px-3 py-1 rounded-lg text-xs">🏷️ ${escapeHtml(categoryName)}</span>
                        ${note.view_limit > 0 ? `<span class="tech-badge px-2 sm:px-3 py-1 rounded-lg text-xs">👁️ ${note.view_count}/${note.view_limit}</span>` : ''}
                        <span class="text-xs text-slate-500 break-all">${new Date(note.created_at).toLocaleString('zh-CN')}</span>
                    </div>
                    <div class="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words">${escapeHtml(preview)}</div>
                </div>
            </div>
            <div class="pt-3 sm:pt-4 border-t border-slate-700/50">
                <!-- 移动端：垂直布局 -->
                <div class="flex flex-col sm:hidden gap-2">
                    <div class="flex gap-2">
                        <button onclick='viewFullNote(${note.id}, \`${note.content}\`, "${note.created_at}", "${escapeHtml(categoryName).replace(/"/g, '&quot;')}")' 
                            class="flex-1 text-xs font-bold text-blue-400 hover:text-blue-300 px-3 py-2 rounded-lg hover:bg-blue-500/10 text-center">
                            📖 查看
                        </button>
                        <button onclick='handleEditNote(${note.id}, \`${note.content}\`, "${note.category_code}")' 
                            class="flex-1 text-xs font-bold text-green-400 hover:text-green-300 px-3 py-2 rounded-lg hover:bg-green-500/10 text-center">
                            ✏️ 编辑
                        </button>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="handleChangeCategory(${note.id}, '${note.category_code}')" 
                            class="flex-1 text-xs font-bold text-purple-400 hover:text-purple-300 px-3 py-2 rounded-lg hover:bg-purple-500/10 text-center">
                            🏷️ 分类
                        </button>
                        <button onclick='showShareModal(\`${note.content}\`)' 
                            class="flex-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 px-3 py-2 rounded-lg hover:bg-cyan-500/10 text-center">
                            🔥 分享
                        </button>
                        <button onclick="handleDeleteNote(${note.id})" 
                            class="flex-1 text-xs font-bold text-rose-400 hover:text-rose-300 px-3 py-2 rounded-lg hover:bg-rose-500/10 text-center">
                            🗑️ 删除
                        </button>
                    </div>
                </div>
                <!-- 桌面端：水平布局 -->
                <div class="hidden sm:flex items-center gap-3">
                    <button onclick='viewFullNote(${note.id}, \`${note.content}\`, "${note.created_at}", "${escapeHtml(categoryName).replace(/"/g, '&quot;')}")' 
                        class="text-xs font-bold text-blue-400 hover:text-blue-300 px-3 py-2 rounded-lg hover:bg-blue-500/10">
                        📖 查看全文
                    </button>
                    <button onclick='handleEditNote(${note.id}, \`${note.content}\`, "${note.category_code}")' 
                        class="text-xs font-bold text-green-400 hover:text-green-300 px-3 py-2 rounded-lg hover:bg-green-500/10">
                        ✏️ 编辑
                    </button>
                    <button onclick="handleChangeCategory(${note.id}, '${note.category_code}')" 
                        class="text-xs font-bold text-purple-400 hover:text-purple-300 px-3 py-2 rounded-lg hover:bg-purple-500/10">
                        🏷️ 更改分类
                    </button>
                    <button onclick='showShareModal(\`${note.content}\`)' 
                        class="text-xs font-bold text-cyan-400 hover:text-cyan-300 px-3 py-2 rounded-lg hover:bg-cyan-500/10">
                        🔥 阅后即焚
                    </button>
                    <button onclick="handleDeleteNote(${note.id})" 
                        class="text-xs font-bold text-rose-400 hover:text-rose-300 px-3 py-2 rounded-lg hover:bg-rose-500/10 ml-auto">
                        🗑️ 删除
                    </button>
                </div>
            </div>
        `;
        listDiv.appendChild(card);
    }
    
    renderPagination(data.total);
    } catch (error) {
        // 静默处理错误，不显示错误消息
        console.warn('加载笔记列表失败:', error.message);
        if (!isDevEnvironment()) {
            console.error('加载笔记列表失败:', error);
            showToast('加载笔记列表失败', 'error');
        }
    } finally {
        LoadingManager.hide('loadNotes');
    }
}

// 编辑笔记
async function handleEditNote(id, content, categoryCode) {
    // 在新的密码架构下，content 已经是明文（后端解密后发送）
    const clearText = content;
    
    // 获取所有分类
    const categoriesData = await getCategories();
    let categoryOptions = '<option value="default">默认分类</option>';
    if (categoriesData && categoriesData.categories) {
        categoriesData.categories.forEach(cat => {
            const selected = cat.code === categoryCode ? 'selected' : '';
            const displayName = cat.name.length > 20 ? cat.name.substring(0, 20) + '...' : cat.name;
            categoryOptions += `<option value="${escapeHtml(cat.code)}" ${selected} title="${escapeHtml(cat.name)}">${escapeHtml(displayName)}</option>`;
        });
    }
    
    const modal = showModal(`
        <div class="tech-card w-full max-w-6xl max-h-[90vh] overflow-y-auto p-8 rounded-2xl">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-2xl font-bold">编辑笔记</h3>
                <button onclick="this.closest('.fixed').remove()" 
                    class="w-10 h-10 rounded-lg btn-secondary flex items-center justify-center text-xl">✕</button>
            </div>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-400 mb-2">分类</label>
                    <select id="editNoteCategory" class="w-full input-tech p-3 rounded-xl text-sm cursor-pointer">
                        ${categoryOptions}
                    </select>
                </div>
                <div class="relative">
                    <textarea id="editNoteInput" 
                        maxlength="30000"
                        class="w-full input-tech p-5 h-[500px] rounded-xl resize-none text-sm leading-relaxed">${escapeHtml(clearText)}</textarea>
                    <div class="absolute bottom-3 right-3 text-xs text-slate-500 bg-slate-800/80 px-2 py-1 rounded">
                        <span id="editCharCount">0</span> / 30000 字
                    </div>
                </div>
                <div class="flex gap-3">
                    <button onclick="this.closest('.fixed').remove()" 
                        class="flex-1 btn-secondary py-3 rounded-xl font-semibold">
                        取消
                    </button>
                    <button onclick="saveEditedNote(${id})" 
                        class="flex-1 btn-primary text-white py-3 rounded-xl font-bold">
                        💾 保存修改
                    </button>
                </div>
            </div>
        </div>
    `);
    
    // 初始化字数统计
    const input = document.getElementById('editNoteInput');
    const countSpan = document.getElementById('editCharCount');
    const updateCount = () => updateCharacterCount(input, countSpan, 30000);
    updateCount();
    input.addEventListener('input', updateCount);
}

// 保存编辑后的笔记
async function saveEditedNote(id) {
    const content = document.getElementById('editNoteInput').value.trim();
    const category = document.getElementById('editNoteCategory').value.trim();
    
    if (!content) {
        showToast('内容不能为空', 'warning');
        return;
    }
    
    // 在新的密码架构下，直接保存明文内容（后端会处理加密）
    const result = await updateNote(id, content, category);
    
    if (result) {
        showToast('更新成功！', 'success');
        document.querySelector('.fixed').remove(); // 关闭模态框
        loadNotesList();
    } else {
        showToast('更新失败', 'error');
    }
}

// 删除单条笔记
async function handleDeleteNote(id) {
    showConfirm(
        '确认删除这条笔记？此操作不可恢复！',
        async () => {
            const result = await deleteNotes([id]);
            if (result) {
                showToast('删除成功', 'success');
                loadNotesList();
            } else {
                showToast('删除失败', 'error');
            }
        },
        'danger'
    );
}

// 查看全文
async function viewFullNote(id, content, createdAt, category) {
    // 在新的密码架构下，content 已经是明文（后端解密后发送）
    const clearText = content;
    
    showModal(`
        <div class="tech-card w-full max-w-6xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-2xl">
            <div class="flex items-center justify-between mb-4 sm:mb-6">
                <div>
                    <div class="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <span class="tech-badge px-2 sm:px-3 py-1 rounded-lg text-xs">#${id}</span>
                        <span class="tech-badge px-2 sm:px-3 py-1 rounded-lg text-xs">${escapeHtml(category)}</span>
                        <span class="text-xs text-slate-500">${new Date(createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                    <h3 class="text-xl sm:text-2xl font-bold">笔记详情</h3>
                </div>
                <button onclick="this.closest('.fixed').remove()" 
                    class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg btn-secondary flex items-center justify-center text-lg sm:text-xl flex-shrink-0">✕</button>
            </div>
            <div class="tech-card p-4 sm:p-6 rounded-xl min-h-[60vh]">
                <pre class="text-sm sm:text-base text-slate-300 leading-relaxed whitespace-pre-wrap font-sans break-words">${escapeHtml(clearText)}</pre>
            </div>
        </div>
    `);
}

// AI 总结
async function handleAISummary() {
    const text = document.getElementById('noteInput').value.trim();
    if (!text) {
        showToast('请先输入内容', 'warning');
        return;
    }
    
    showToast('AI 正在分析中...', 'info');
    const result = await getAISummary(text);
    
    if (result) {
        showModal(`
            <div class="tech-card w-full max-w-2xl p-8 rounded-2xl">
                <h3 class="text-2xl font-bold mb-4 flex items-center gap-2">
                    <span>🤖</span>
                    <span>AI 智能总结</span>
                </h3>
                <div class="tech-card p-6 rounded-xl mb-6">
                    <p class="text-slate-300 leading-relaxed">${escapeHtml(result.summary)}</p>
                </div>
                <button onclick="this.closest('.fixed').remove()" 
                    class="w-full btn-primary text-white py-3 rounded-xl font-bold">
                    关闭
                </button>
            </div>
        `);
    }
}