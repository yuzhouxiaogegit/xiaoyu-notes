// 笔记列表和分页相关功能模块

/**
 * 小宇笔记 - 列表管理模块
 * 作者：宇宙小哥
 */

// 加载分类
async function loadCategories() {
    // 检查是否已登录且有管理员密钥（开发环境跳过检查）
    if (!isDevEnvironment() && !AppConfig.ADMIN_KEY) {
        return;
    }
    
    try {
        const data = await getCategoryStats();
        if (!data) return;
    
    AppConfig.categories = data.categories;
    const tabsDiv = document.getElementById('categoryTabs');
    if (!tabsDiv) return;
    
    tabsDiv.innerHTML = `
        <button onclick="filterByCategory('all')" 
            class="category-tab px-4 py-2 rounded-lg text-sm font-bold ${AppConfig.currentCategory === 'all' ? 'active' : ''}">
            全部
        </button>
    `;
    
    data.categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.onclick = () => filterByCategory(cat.code);
        btn.className = `category-tab px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${AppConfig.currentCategory === cat.code ? 'active' : ''}`;
        btn.textContent = `${cat.name} (${cat.count})`; // textContent is safe, no escaping needed
        btn.title = cat.name; // 完整名称显示在 tooltip
        tabsDiv.appendChild(btn);
    });
    } catch (error) {
        // 静默处理错误，不显示错误消息
        console.warn('加载分类失败:', error.message);
        if (!isDevEnvironment()) {
            console.error('加载分类失败:', error);
            showToast('无法加载分类数据，请检查网络连接', 'error');
        }
    }
}

// 分类筛选
async function filterByCategory(category) {
    AppConfig.currentCategory = category;
    AppConfig.currentPage = 1; // 重置到第一页
    
    // 重新加载笔记列表和分类数据
    await Promise.all([
        loadNotesList(),
        loadCategories()
    ]);
}

// 分页渲染
function renderPagination(total) {
    const totalPages = Math.ceil(total / AppConfig.pageSize);
    const pag = document.getElementById('pagination');
    if (totalPages <= 1) {
        pag.innerHTML = '';
        return;
    }
    
    let html = `
        <button onclick="changePage(1)" ${AppConfig.currentPage === 1 ? 'disabled' : ''} 
            class="pagination-btn px-4 py-2 rounded-lg text-sm font-bold">⏮️ 首页</button>
        <button onclick="changePage(${AppConfig.currentPage - 1})" ${AppConfig.currentPage === 1 ? 'disabled' : ''} 
            class="pagination-btn px-4 py-2 rounded-lg text-sm font-bold">◀️</button>
    `;
    
    const start = Math.max(1, AppConfig.currentPage - 2);
    const end = Math.min(totalPages, AppConfig.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
        html += `
            <button onclick="changePage(${i})" 
                class="pagination-btn ${i === AppConfig.currentPage ? 'active' : ''} px-4 py-2 rounded-lg text-sm font-bold">${i}</button>
        `;
    }
    
    html += `
        <button onclick="changePage(${AppConfig.currentPage + 1})" ${AppConfig.currentPage === totalPages ? 'disabled' : ''} 
            class="pagination-btn px-4 py-2 rounded-lg text-sm font-bold">▶️</button>
        <button onclick="changePage(${totalPages})" ${AppConfig.currentPage === totalPages ? 'disabled' : ''} 
            class="pagination-btn px-4 py-2 rounded-lg text-sm font-bold">末页 ⏭️</button>
    `;
    
    pag.innerHTML = html;
}

function changePage(page) {
    AppConfig.currentPage = page;
    loadNotesList();
}

// 笔记选择
function toggleNoteSelection(id, checked) {
    if (checked) {
        AppConfig.selectedNotes.add(id);
    } else {
        AppConfig.selectedNotes.delete(id);
    }
    
    updateBatchDeleteBtn();
    
    // 更新全选按钮状态
    const allCheckboxes = document.querySelectorAll('.note-checkbox');
    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn && allCheckboxes.length > 0) {
        const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
        selectAllBtn.textContent = allChecked ? '✅ 取消全选' : '☑️ 全选';
    }
}

// 全选/取消全选按钮
function toggleSelectAllBtn() {
    const checkboxes = document.querySelectorAll('.note-checkbox');
    const selectAllBtn = document.getElementById('selectAllBtn');
    
    // 检查当前是否全选
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    const newState = !allChecked;
    
    checkboxes.forEach(cb => {
        cb.checked = newState;
        const noteId = parseInt(cb.dataset.noteId);
        if (newState) {
            AppConfig.selectedNotes.add(noteId);
        } else {
            AppConfig.selectedNotes.delete(noteId);
        }
    });
    
    // 更新按钮文本
    selectAllBtn.textContent = newState ? '✅ 取消全选' : '☑️ 全选';
    
    // 更新批量删除按钮
    updateBatchDeleteBtn();
}

// 更新批量删除按钮状态
function updateBatchDeleteBtn() {
    const btn = document.getElementById('batchDeleteBtn');
    const count = document.getElementById('selectedCount');
    const selectAllBtn = document.getElementById('selectAllBtn');
    
    if (AppConfig.selectedNotes.size > 0) {
        btn.classList.remove('hidden');
        count.textContent = AppConfig.selectedNotes.size;
    } else {
        btn.classList.add('hidden');
        if (selectAllBtn) {
            selectAllBtn.textContent = '☑️ 全选';
        }
    }
}

// 刷新列表
async function handleRefresh() {
    try {
        await loadNotesList();
        showToast('数据刷新完成', 'success');
    } catch (error) {
        showToast('刷新数据时出现问题，请检查网络连接', 'error');
    }
}

// 批量删除
async function handleBatchDelete() {
    if (AppConfig.selectedNotes.size === 0) return;
    
    showConfirm(
        `确认删除选中的 ${AppConfig.selectedNotes.size} 条笔记？此操作不可恢复！`,
        async () => {
            const ids = Array.from(AppConfig.selectedNotes);
            const result = await deleteNotes(ids);
            
            if (result) {
                showToast(`成功删除 ${result.count} 条笔记`, 'success');
                AppConfig.selectedNotes.clear();
                const selectAllBtn = document.getElementById('selectAllBtn');
                if (selectAllBtn) {
                    selectAllBtn.textContent = '☑️ 全选';
                }
                loadNotesList();
            } else {
                showToast('删除操作未完成，请检查网络连接后重试', 'error');
            }
        },
        'danger'
    );
}