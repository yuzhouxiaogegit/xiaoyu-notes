// 分类管理相关功能模块

/**
 * 小宇笔记 - 分类管理模块
 * 作者：宇宙小哥
 */

// 分类管理相关函数
async function handleCreateCategory() {
    const name = document.getElementById('newCategoryName').value.trim();
    if (!name) {
        showToast('请输入分类名称', 'warning');
        return;
    }
    
    const result = await createCategory(name);
    if (result) {
        showToast(`分类"${escapeHtml(name)}"创建成功`, 'success');
        document.getElementById('newCategoryName').value = '';
        loadCategoriesList();
    }
}

async function loadCategoriesList() {
    // 检查是否已登录且有管理员密钥（开发环境跳过检查）
    if (!isDevEnvironment() && !AppConfig.ADMIN_KEY) {
        const listDiv = document.getElementById('categoriesList');
        if (listDiv) {
            listDiv.innerHTML = `
                <div class="text-center py-8 text-slate-400">
                    <p>🔐 请先登录以管理分类</p>
                </div>
            `;
        }
        return;
    }
    
    try {
        const data = await getCategories();
        if (!data) return;
    
    const listDiv = document.getElementById('categoriesList');
    if (!listDiv) return;
    
    if (data.categories.length === 0) {
        listDiv.innerHTML = `
            <div class="text-center py-8 text-slate-400">
                <p>暂无分类，请创建第一个分类</p>
            </div>
        `;
        return;
    }
    
    listDiv.innerHTML = '';
    for (let cat of data.categories) {
        const item = document.createElement('div');
        item.className = 'tech-card p-4 rounded-xl flex items-center justify-between';
        item.innerHTML = `
            <div class="flex-1">
                <div class="font-bold text-lg">${escapeHtml(cat.name)}</div>
                <div class="text-xs text-slate-500 font-mono mt-1">${escapeHtml(cat.code)}</div>
            </div>
            <div class="flex gap-2">
                <button onclick="handleEditCategory('${escapeHtml(cat.code)}', '${escapeHtml(cat.name).replace(/'/g, '&#39;')}')" 
                    class="btn-secondary px-4 py-2 rounded-lg text-sm font-bold">
                    ✏️ 编辑
                </button>
                <button onclick="handleDeleteCategory('${escapeHtml(cat.code)}', '${escapeHtml(cat.name).replace(/'/g, '&#39;')}')" 
                    class="btn-danger px-4 py-2 rounded-lg text-sm font-bold">
                    🗑️ 删除
                </button>
            </div>
        `;
        listDiv.appendChild(item);
    }
    } catch (error) {
        // 静默处理错误，不显示错误消息
        console.warn('加载分类列表失败:', error.message);
        if (!isDevEnvironment()) {
            console.error('加载分类列表失败:', error);
            showToast('无法加载分类列表，请检查网络连接', 'error');
        }
    }
}

// 编辑分类名称
function handleEditCategory(code, currentName) {
    showPrompt(
        '编辑分类名称',
        '输入新的分类名称',
        currentName,
        async (newName) => {
            const result = await updateCategory(code, newName);
            if (result) {
                showToast('分类名称已更新', 'success');
                loadCategoriesList();
            } else {
                showToast('分类名称更新未完成，请重试', 'error');
            }
        }
    );
}

// 更改笔记分类
async function handleChangeCategory(noteId, currentCategoryCode) {
    // 获取所有分类
    const data = await getCategories();
    if (!data || !data.categories) {
        showToast('无法获取分类列表，请检查网络连接', 'error');
        return;
    }
    
    // 构建分类选择模态框
    const currentCategory = data.categories.find(c => c.code === currentCategoryCode);
    const currentName = currentCategory ? currentCategory.name : '默认';
    
    let optionsHtml = '<option value="default">默认分类</option>';
    data.categories.forEach(cat => {
        const selected = cat.code === currentCategoryCode ? 'selected' : '';
        // 限制显示长度
        const displayName = cat.name.length > 20 ? cat.name.substring(0, 20) + '...' : cat.name;
        optionsHtml += `<option value="${escapeHtml(cat.code)}" ${selected} title="${escapeHtml(cat.name)}">${escapeHtml(displayName)}</option>`;
    });
    
    const modal = showModal(`
        <div class="tech-card w-full max-w-md p-8 rounded-2xl">
            <h3 class="text-2xl font-bold mb-4">更改笔记分类</h3>
            <p class="text-slate-400 text-sm mb-4">当前分类：${escapeHtml(currentName)}</p>
            <div class="mb-6">
                <label class="block text-sm font-medium text-slate-400 mb-2">选择新分类</label>
                <select id="newCategorySelect" class="w-full input-tech p-3 rounded-xl text-sm cursor-pointer">
                    ${optionsHtml}
                </select>
            </div>
            <div class="flex gap-3">
                <button onclick="this.closest('.fixed').remove()" 
                    class="flex-1 btn-secondary py-3 rounded-xl font-semibold">
                    取消
                </button>
                <button id="confirmChangeCategoryBtn" 
                    class="flex-1 btn-primary text-white py-3 rounded-xl font-bold">
                    确认更改
                </button>
            </div>
        </div>
    `);
    
    document.getElementById('confirmChangeCategoryBtn').onclick = async () => {
        const newCategoryCode = document.getElementById('newCategorySelect').value;
        if (newCategoryCode === currentCategoryCode) {
            showToast('分类未改变', 'info');
            modal.remove();
            return;
        }
        
        const result = await updateNoteCategory(noteId, newCategoryCode);
        if (result && result.status === 'OK') {
            const newCat = data.categories.find(c => c.code === newCategoryCode);
            const newName = newCat ? newCat.name : '默认';
            showToast(`分类已更改为：${escapeHtml(newName)}`, 'success');
            modal.remove();
            loadNotesList();
        } else {
            showToast('笔记分类更改未完成，请重试', 'error');
        }
    };
}

async function handleDeleteCategory(code, name) {
    console.log('handleDeleteCategory called with:', { code, name });
    
    showConfirm(
        `确认删除分类"${escapeHtml(name)}"？`,
        async () => {
            console.log('确认删除，调用deleteCategory');
            const result = await deleteCategory(code);
            console.log('deleteCategory result:', result);
            
            if (result) {
                if (result.error) {
                    // 精准提示：该分类下有文章
                    showToast(`无法删除：该分类下有 ${result.count} 条笔记，请先删除笔记或更改笔记分类`, 'warning');
                } else {
                    showToast(`分类"${escapeHtml(name)}"已删除`, 'success');
                    loadCategoriesList();
                }
            } else {
                showToast(`无法删除：该分类下有 ${result.count} 条笔记，请先删除笔记或更改笔记分类`, 'warning');
            }
        },
        'danger'
    );
}

// 渲染分类标签
function renderCategoryTabs(categories) {
    const tabsDiv = document.getElementById('categoryTabs');
    if (!tabsDiv) return;
    
    let tabsHtml = `
        <button onclick="filterByCategory('all')" 
            class="category-tab px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${AppConfig.currentCategory === 'all' ? 'active' : ''}">
            全部
        </button>
    `;
    
    categories.forEach(cat => {
        const isActive = AppConfig.currentCategory === cat.code;
        const displayName = cat.name.length > 10 ? cat.name.substring(0, 10) + '...' : cat.name;
        tabsHtml += `
            <button onclick="filterByCategory('${escapeHtml(cat.code)}')" 
                class="category-tab px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${isActive ? 'active' : ''}"
                title="${escapeHtml(cat.name)}">
                ${escapeHtml(displayName)} (${cat.count || 0})
            </button>
        `;
    });
    
    tabsDiv.innerHTML = tabsHtml;
}

// 按分类筛选
async function filterByCategory(category) {
    AppConfig.currentCategory = category;
    AppConfig.currentPage = 1; // 重置到第一页
    
    // 重新加载笔记列表
    await loadNotesList();
    
    // 重新加载分类数据以更新标签状态
    await loadCategories();
}

// 加载分类到下拉菜单
async function loadCategoryOptions() {
    // 检查是否已登录且有管理员密钥（开发环境跳过检查）
    if (!isDevEnvironment() && !AppConfig.ADMIN_KEY) {
        // 未登录时，只显示默认分类
        const select = document.getElementById('noteCategory');
        if (select) {
            select.innerHTML = '<option value="default">默认分类</option>';
        }
        return;
    }
    
    try {
        const data = await getCategories();
        if (!data) return;
        
        const select = document.getElementById('noteCategory');
        if (!select) return;
        
        select.innerHTML = '<option value="default">默认分类</option>';
        data.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.code;
            // 限制显示长度，超过 20 个字符显示省略号
            const displayName = cat.name.length > 20 ? cat.name.substring(0, 20) + '...' : cat.name;
            option.textContent = displayName;
            option.title = cat.name; // 完整名称显示在 tooltip
            select.appendChild(option);
        });
    } catch (error) {
        // 静默处理错误，不显示错误消息
        console.warn('加载分类选项失败:', error.message);
        // 确保至少有默认选项
        const select = document.getElementById('noteCategory');
        if (select && select.children.length === 0) {
            select.innerHTML = '<option value="default">默认分类</option>';
        }
    }
}