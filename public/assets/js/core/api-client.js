/**
 * 通用API客户端 - 高复用网络请求
 * 作者：宇宙小哥
 */

import { Utils, globalLoadingManager } from './base.js';

export class APIClient {
  constructor(baseURL = '/api', options = {}) {
    this.baseURL = baseURL;
    this.options = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...options
    };
    this.interceptors = {
      request: [],
      response: []
    };
  }

  // 添加请求拦截器
  addRequestInterceptor(interceptor) {
    this.interceptors.request.push(interceptor);
    return this;
  }

  // 添加响应拦截器
  addResponseInterceptor(interceptor) {
    this.interceptors.response.push(interceptor);
    return this;
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      ...options
    };

    // 应用请求拦截器
    for (const interceptor of this.interceptors.request) {
      await interceptor(config);
    }

    let lastError;
    for (let attempt = 0; attempt <= this.options.retries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, config);
        
        // 应用响应拦截器
        for (const interceptor of this.interceptors.response) {
          await interceptor(response);
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        if (attempt < this.options.retries) {
          await this.delay(this.options.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError;
  }

  // 带超时的fetch
  async fetchWithTimeout(url, config) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
    
    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // GET请求
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  // POST请求
  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    });
  }

  // PUT请求
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // DELETE请求
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // 批量请求
  async batch(requests) {
    const promises = requests.map(req => 
      this.request(req.endpoint, req.options).catch(error => ({ error, ...req }))
    );
    return Promise.all(promises);
  }
}

// 创建默认API客户端实例
export const apiClient = new APIClient();

// 添加通用拦截器
apiClient.addRequestInterceptor(async (config) => {
  // 添加认证头
  const token = localStorage.getItem('login_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 添加混淆头
  const isObfuscated = config.headers['X-Obfuscated'];
  if (isObfuscated) {
    const sessionToken = localStorage.getItem('session_token');
    if (sessionToken) {
      config.headers['X-Session-Token'] = sessionToken;
    }
  }
});

apiClient.addResponseInterceptor(async (response) => {
  // 处理新token
  const newToken = response.headers.get('X-New-Token');
  if (newToken) {
    localStorage.setItem('login_token', newToken);
  }
});

// 通用API方法封装
export class APIService {
  constructor(client = apiClient) {
    this.client = client;
  }

  // 通用CRUD操作
  async create(resource, data, loadingKey) {
    if (loadingKey) globalLoadingManager.show(loadingKey, '创建中...');
    try {
      return await this.client.post(`/${resource}`, data);
    } finally {
      if (loadingKey) globalLoadingManager.hide(loadingKey);
    }
  }

  async read(resource, params = {}, loadingKey) {
    if (loadingKey) globalLoadingManager.show(loadingKey, '加载中...');
    try {
      return await this.client.post(`/${resource}`, params);
    } finally {
      if (loadingKey) globalLoadingManager.hide(loadingKey);
    }
  }

  async update(resource, data, loadingKey) {
    if (loadingKey) globalLoadingManager.show(loadingKey, '更新中...');
    try {
      return await this.client.post(`/${resource}/update`, data);
    } finally {
      if (loadingKey) globalLoadingManager.hide(loadingKey);
    }
  }

  async delete(resource, data, loadingKey) {
    if (loadingKey) globalLoadingManager.show(loadingKey, '删除中...');
    try {
      return await this.client.post(`/${resource}/delete`, data);
    } finally {
      if (loadingKey) globalLoadingManager.hide(loadingKey);
    }
  }

  // 分页查询
  async paginate(resource, page = 1, limit = 10, filters = {}) {
    return this.read(resource, { page, limit, ...filters });
  }

  // 批量操作
  async batchDelete(resource, ids) {
    return this.delete(resource, { ids });
  }
}

// 默认服务实例
export const apiService = new APIService();