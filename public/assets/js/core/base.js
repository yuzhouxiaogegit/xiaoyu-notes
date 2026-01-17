/**
 * 通用基础框架 - 高复用核心
 * 作者：宇宙小哥
 */

// 通用工具类
export class Utils {
  // 防抖函数
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // 节流函数
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // HTML转义
  static escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  // 深拷贝
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => Utils.deepClone(item));
    if (typeof obj === 'object') {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = Utils.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }

  // 格式化数字
  static formatNumber(num) {
    return num.toLocaleString();
  }

  // 生成随机ID
  static generateId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

// 通用事件管理器
export class EventManager {
  constructor() {
    this.events = new Map();
  }

  // 注册事件
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
    return this;
  }

  // 触发事件
  emit(event, ...args) {
    if (this.events.has(event)) {
      this.events.get(event).forEach(callback => callback(...args));
    }
    return this;
  }

  // 移除事件
  off(event, callback) {
    if (this.events.has(event)) {
      const callbacks = this.events.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
    return this;
  }
}

// 通用状态管理器
export class StateManager {
  constructor(initialState = {}) {
    this.state = initialState;
    this.listeners = [];
  }

  // 获取状态
  getState() {
    return Utils.deepClone(this.state);
  }

  // 设置状态
  setState(newState) {
    const prevState = Utils.deepClone(this.state);
    this.state = { ...this.state, ...newState };
    this.listeners.forEach(listener => listener(this.state, prevState));
  }

  // 订阅状态变化
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
}

// 通用DOM操作器
export class DOMHelper {
  // 查询元素
  static $(selector, context = document) {
    return context.querySelector(selector);
  }

  // 查询所有元素
  static $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  }

  // 创建元素
  static create(tag, attrs = {}, children = []) {
    const element = document.createElement(tag);
    
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'innerHTML') {
        element.innerHTML = value;
      } else if (key.startsWith('on')) {
        element.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        element.setAttribute(key, value);
      }
    });

    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });

    return element;
  }

  // 显示/隐藏元素
  static toggle(element, show) {
    if (show === undefined) {
      show = element.style.display === 'none';
    }
    element.style.display = show ? '' : 'none';
  }

  // 添加/移除类
  static toggleClass(element, className, add) {
    if (add === undefined) {
      element.classList.toggle(className);
    } else {
      element.classList.toggle(className, add);
    }
  }
}

// 通用加载管理器
export class LoadingManager {
  constructor() {
    this.loadingStates = new Map();
  }

  // 显示加载
  show(key, message = '加载中...') {
    this.loadingStates.set(key, { message, timestamp: Date.now() });
    this.updateUI();
  }

  // 隐藏加载
  hide(key) {
    this.loadingStates.delete(key);
    this.updateUI();
  }

  // 更新UI
  updateUI() {
    const hasLoading = this.loadingStates.size > 0;
    const loadingElement = DOMHelper.$('#globalLoading');
    
    if (hasLoading && !loadingElement) {
      this.createLoadingElement();
    } else if (!hasLoading && loadingElement) {
      loadingElement.remove();
    }
  }

  // 创建加载元素
  createLoadingElement() {
    const loading = DOMHelper.create('div', {
      id: 'globalLoading',
      className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50',
      innerHTML: `
        <div class="bg-slate-800 rounded-lg p-6 flex items-center gap-3">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
          <span class="text-white">加载中...</span>
        </div>
      `
    });
    document.body.appendChild(loading);
  }
}

// 全局实例
export const globalEventManager = new EventManager();
export const globalStateManager = new StateManager();
export const globalLoadingManager = new LoadingManager();