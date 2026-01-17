/**
 * 通用UI组件 - 高复用界面元素
 * 作者：宇宙小哥
 */

import { DOMHelper, Utils } from './base.js';

// 通用模态框组件
export class Modal {
  constructor(options = {}) {
    this.options = {
      closable: true,
      backdrop: true,
      keyboard: true,
      ...options
    };
    this.element = null;
    this.isOpen = false;
  }

  // 显示模态框
  show(content, title = '') {
    if (this.isOpen) return;

    this.element = DOMHelper.create('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4',
      innerHTML: `
        <div class="fixed inset-0 bg-black/50 transition-opacity" data-backdrop></div>
        <div class="relative bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          ${title ? `
            <div class="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 class="text-xl font-bold">${Utils.escapeHtml(title)}</h3>
              ${this.options.closable ? '<button class="text-slate-400 hover:text-white" data-close>✕</button>' : ''}
            </div>
          ` : ''}
          <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            ${content}
          </div>
        </div>
      `
    });

    // 绑定事件
    if (this.options.closable) {
      const closeBtn = DOMHelper.$('[data-close]', this.element);
      if (closeBtn) closeBtn.onclick = () => this.hide();
    }

    if (this.options.backdrop) {
      const backdrop = DOMHelper.$('[data-backdrop]', this.element);
      if (backdrop) backdrop.onclick = () => this.hide();
    }

    if (this.options.keyboard) {
      document.addEventListener('keydown', this.handleKeydown);
    }

    document.body.appendChild(this.element);
    document.body.style.overflow = 'hidden';
    this.isOpen = true;

    return this;
  }

  // 隐藏模态框
  hide() {
    if (!this.isOpen || !this.element) return;

    document.removeEventListener('keydown', this.handleKeydown);
    document.body.style.overflow = '';
    this.element.remove();
    this.element = null;
    this.isOpen = false;

    return this;
  }

  // 键盘事件处理
  handleKeydown = (e) => {
    if (e.key === 'Escape' && this.options.keyboard) {
      this.hide();
    }
  }
}

// 通用提示组件
export class Toast {
  static show(message, type = 'info', duration = 3000) {
    const toast = DOMHelper.create('div', {
      className: `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 translate-x-full ${Toast.getTypeClass(type)}`,
      innerHTML: `
        <div class="flex items-center gap-2">
          <span class="text-lg">${Toast.getTypeIcon(type)}</span>
          <span>${Utils.escapeHtml(message)}</span>
        </div>
      `
    });

    document.body.appendChild(toast);

    // 动画显示
    setTimeout(() => {
      toast.classList.remove('translate-x-full');
    }, 10);

    // 自动隐藏
    setTimeout(() => {
      toast.classList.add('translate-x-full');
      setTimeout(() => toast.remove(), 300);
    }, duration);

    return toast;
  }

  static getTypeClass(type) {
    const classes = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    };
    return classes[type] || classes.info;
  }

  static getTypeIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  }
}

// 通用确认对话框
export class Confirm {
  static show(message, onConfirm, type = 'info') {
    const modal = new Modal({ backdrop: false, keyboard: true });
    
    const content = `
      <div class="text-center">
        <div class="text-4xl mb-4">${Confirm.getTypeIcon(type)}</div>
        <h3 class="text-xl font-bold mb-4">确认操作</h3>
        <p class="text-slate-300 mb-6">${Utils.escapeHtml(message)}</p>
        <div class="flex gap-3">
          <button class="flex-1 btn-secondary py-3 rounded-xl font-semibold" data-cancel>
            取消
          </button>
          <button class="flex-1 ${Confirm.getTypeButtonClass(type)} py-3 rounded-xl font-bold" data-confirm>
            确认
          </button>
        </div>
      </div>
    `;

    modal.show(content);

    // 绑定事件
    const cancelBtn = DOMHelper.$('[data-cancel]', modal.element);
    const confirmBtn = DOMHelper.$('[data-confirm]', modal.element);

    cancelBtn.onclick = () => modal.hide();
    confirmBtn.onclick = () => {
      modal.hide();
      if (onConfirm) onConfirm();
    };

    return modal;
  }

  static getTypeIcon(type) {
    const icons = {
      danger: '⚠️',
      warning: '⚠️',
      info: '❓'
    };
    return icons[type] || icons.info;
  }

  static getTypeButtonClass(type) {
    const classes = {
      danger: 'btn-danger text-white',
      warning: 'bg-yellow-500 text-white',
      info: 'btn-primary text-white'
    };
    return classes[type] || classes.info;
  }
}

// 通用输入对话框
export class Prompt {
  static show(title, placeholder = '', defaultValue = '', onConfirm) {
    const modal = new Modal({ keyboard: true });
    
    const content = `
      <div>
        <h3 class="text-xl font-bold mb-4">${Utils.escapeHtml(title)}</h3>
        <input type="text" class="w-full input-tech p-3 rounded-xl mb-6" 
               placeholder="${Utils.escapeHtml(placeholder)}" 
               value="${Utils.escapeHtml(defaultValue)}" 
               data-input>
        <div class="flex gap-3">
          <button class="flex-1 btn-secondary py-3 rounded-xl font-semibold" data-cancel>
            取消
          </button>
          <button class="flex-1 btn-primary text-white py-3 rounded-xl font-bold" data-confirm>
            确认
          </button>
        </div>
      </div>
    `;

    modal.show(content);

    const input = DOMHelper.$('[data-input]', modal.element);
    const cancelBtn = DOMHelper.$('[data-cancel]', modal.element);
    const confirmBtn = DOMHelper.$('[data-confirm]', modal.element);

    // 自动聚焦
    setTimeout(() => input.focus(), 100);

    // 回车确认
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        confirmBtn.click();
      }
    };

    cancelBtn.onclick = () => modal.hide();
    confirmBtn.onclick = () => {
      const value = input.value.trim();
      if (value && onConfirm) {
        onConfirm(value);
      }
      modal.hide();
    };

    return modal;
  }
}

// 通用分页组件
export class Pagination {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? DOMHelper.$(container) : container;
    this.options = {
      currentPage: 1,
      totalPages: 1,
      showInfo: true,
      showJumper: true,
      ...options
    };
  }

  render(currentPage, totalPages, onPageChange) {
    if (totalPages <= 1) {
      this.container.innerHTML = '';
      return;
    }

    const { showInfo, showJumper } = this.options;
    let html = '';

    // 分页按钮
    html += `
      <div class="flex items-center gap-2 flex-wrap">
        <button class="pagination-btn px-4 py-2 rounded-lg text-sm font-bold" 
                ${currentPage === 1 ? 'disabled' : ''} 
                data-page="1">⏮️ 首页</button>
        <button class="pagination-btn px-4 py-2 rounded-lg text-sm font-bold" 
                ${currentPage === 1 ? 'disabled' : ''} 
                data-page="${currentPage - 1}">◀️</button>
    `;

    // 页码按钮
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let i = start; i <= end; i++) {
      html += `
        <button class="pagination-btn ${i === currentPage ? 'active' : ''} px-4 py-2 rounded-lg text-sm font-bold" 
                data-page="${i}">${i}</button>
      `;
    }

    html += `
        <button class="pagination-btn px-4 py-2 rounded-lg text-sm font-bold" 
                ${currentPage === totalPages ? 'disabled' : ''} 
                data-page="${currentPage + 1}">▶️</button>
        <button class="pagination-btn px-4 py-2 rounded-lg text-sm font-bold" 
                ${currentPage === totalPages ? 'disabled' : ''} 
                data-page="${totalPages}">末页 ⏭️</button>
      </div>
    `;

    this.container.innerHTML = html;

    // 绑定事件
    DOMHelper.$$('[data-page]', this.container).forEach(btn => {
      btn.onclick = () => {
        const page = parseInt(btn.dataset.page);
        if (page !== currentPage && onPageChange) {
          onPageChange(page);
        }
      };
    });
  }
}

// 导出全局实例
export const modal = new Modal();
export const toast = Toast;
export const confirm = Confirm;
export const prompt = Prompt;