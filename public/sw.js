/**
 * 小宇笔记 - 加密笔记管理系统
 * Service Worker
 * 作者：宇宙小哥
 * 项目地址：https://github.com/yuzhouxiaogegit/xiaoyu-notes
 * 版权所有 © 2025 宇宙小哥
 */

// 导入应用配置
importScripts('./assets/js/app-config.js');

// 版权保护检查
if (!self.AppBranding || !self.AppBranding.author || self.AppBranding.author !== '宇宙小哥') {
    throw new Error('Copyright verification failed in Service Worker');
}

const CACHE_NAME = self.AppBranding ? self.AppBranding.cacheName : 'xiaoyu-notes-v1';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon.png',
    './assets/css/style.css',
    './assets/js/app-config.js',
    './assets/js/main.js',
    './assets/js/api.js',
    './assets/js/config.js',
    './assets/js/crypto.js',
    './assets/js/obfuscate.js',
    './assets/js/ui.js',
    './assets/js/views.js',
    './assets/js/auth.js',
    './assets/js/sidebar.js',
    './assets/js/notes.js',
    './assets/js/categories.js',
    './assets/js/list.js',
    './assets/js/share.js',
    './assets/js/utils.js'
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 网络请求策略
self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    
    // API 请求：网络优先
    if (e.request.url.includes('/api/')) {
        e.respondWith(
            fetch(e.request).catch(() => {
                return new Response(JSON.stringify({ error: '网络不可用' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }
    
    // 静态资源：缓存优先，网络回退
    e.respondWith(
        caches.match(e.request).then(response => {
            return response || fetch(e.request).catch(() => {
                // 离线时返回基本页面
                if (e.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});