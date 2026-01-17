// UI 工具函数

/**
 * 小宇笔记 - 加密笔记管理系统
 * 作者：宇宙小哥
 * 项目地址：https://github.com/yuzhouxiaogegit/xiaoyu-notes
 * 版权所有 © 2025 宇宙小哥
 */

// HTML 转义函数，防止 XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 加载状态管理
const LoadingManager = {
    activeLoaders: new Set(),
    
    show(id = 'default', message = '加载中...') {
        this.activeLoaders.add(id);
        this.updateUI(message);
    },
    
    hide(id = 'default') {
        this.activeLoaders.delete(id);
        if (this.activeLoaders.size === 0) {
            this.hideUI();
        }
    },
    
    updateUI(message) {
        let loader = document.getElementById('globalLoader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'globalLoader';
            loader.className = 'fixed top-4 right-4 z-50 bg-slate-800/90 backdrop-blur-sm rounded-lg px-4 py-2 text-sm text-slate-200 shadow-lg animate-fade-in';
            document.body.appendChild(loader);
        }
        loader.innerHTML = `
            <div class="flex items-center gap-2">
                <div class="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span>${escapeHtml(message)}</span>
            </div>
        `;
    },
    
    hideUI() {
        const loader = document.getElementById('globalLoader');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.transform = 'translateX(10px)';
            setTimeout(() => loader.remove(), 200);
        }
    }
};

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + '-icon');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        `;
    } else {
        input.type = 'password';
        icon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        `;
    }
}

function showModal(content) {
    const modal = document.createElement('div');
    modal.className = "fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 md:p-8 animate-fade-in";
    modal.innerHTML = content;
    document.body.appendChild(modal);
    
    // 防止背景滚动
    document.body.style.overflow = 'hidden';
    
    modal.onclick = (e) => { 
        if (e.target === modal) {
            document.body.style.overflow = '';
            modal.remove(); 
        }
    };
    
    // ESC键关闭
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            document.body.style.overflow = '';
            modal.remove();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
    
    return modal;
}

function closeModal(modal) {
    if (modal) {
        document.body.style.overflow = '';
        modal.remove();
    }
}

function showToast(message, type = 'info') {
    const colors = {
        success: 'bg-green-500',
        danger: 'bg-red-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    };
    
    const icons = {
        success: '✓',
        danger: '✕',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };
    
    const toast = document.createElement('div');
    toast.className = `fixed top-4 left-1/2 -translate-x-1/2 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-toast-in flex items-center gap-3 min-w-[300px] justify-center`;
    toast.innerHTML = `
        <span class="text-xl font-bold">${icons[type]}</span>
        <span>${escapeHtml(message)}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, -10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showConfirm(message, onConfirm, type = 'warning') {
    const colors = {
        warning: 'text-yellow-400',
        danger: 'text-red-400',
        info: 'text-blue-400'
    };
    
    const icons = {
        warning: '⚠️',
        danger: '🗑️',
        info: 'ℹ️'
    };
    
    const modal = showModal(`
        <div class="tech-card w-full max-w-md p-8 rounded-2xl">
            <div class="text-center mb-6">
                <div class="text-6xl mb-4">${icons[type]}</div>
                <h3 class="text-xl font-bold ${colors[type]} mb-2">确认操作</h3>
                <p class="text-slate-300 text-sm">${escapeHtml(message)}</p>
            </div>
            <div class="flex gap-3">
                <button onclick="this.closest('.fixed').remove()" 
                    class="flex-1 btn-secondary py-3 rounded-xl font-semibold">
                    取消
                </button>
                <button id="confirmBtn" 
                    class="flex-1 btn-primary text-white py-3 rounded-xl font-bold">
                    确认
                </button>
            </div>
        </div>
    `);
    
    document.getElementById('confirmBtn').onclick = () => {
        modal.remove();
        onConfirm();
    };
}

function showPrompt(title, placeholder, defaultValue, onConfirm) {
    const modal = showModal(`
        <div class="tech-card w-full max-w-md p-8 rounded-2xl">
            <h3 class="text-2xl font-bold mb-4">${escapeHtml(title)}</h3>
            <input id="promptInput" type="text" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(defaultValue || '')}" maxlength="500"
                class="w-full input-tech p-4 rounded-xl text-sm mb-4">
            <div class="flex gap-3">
                <button onclick="this.closest('.fixed').remove()" 
                    class="flex-1 btn-secondary py-3 rounded-xl font-semibold">
                    取消
                </button>
                <button id="promptConfirmBtn" 
                    class="flex-1 btn-primary text-white py-3 rounded-xl font-bold">
                    确认
                </button>
            </div>
        </div>
    `);
    
    const input = document.getElementById('promptInput');
    input.focus();
    input.select();
    
    const confirm = () => {
        const value = input.value.trim();
        if (value) {
            modal.remove();
            onConfirm(value);
        } else {
            showToast('请输入内容', 'warning');
        }
    };
    
    document.getElementById('promptConfirmBtn').onclick = confirm;
    input.onkeypress = (e) => {
        if (e.key === 'Enter') confirm();
    };
}
