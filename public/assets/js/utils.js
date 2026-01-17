// 工具函数和缓存管理模块

/**
 * 小宇笔记 - 工具模块
 * 作者：宇宙小哥
 */

// 测试函数：重置到初始化页面
window.showWelcomePage = function() {
    location.reload();
};

// 测试混淆功能
window.testObfuscation = function() {
    // 测试数据
    const testData = {
        username: 'testuser',
        password: 'testpass123',
        message: '这是一条测试消息'
    };
    
    // 测试基础混淆
    const obfuscated1 = obfuscateRequestData(testData, '/api/test');
    const deobfuscated1 = deobfuscateResponseData(obfuscated1, '/api/test');
    
    // 测试会话混淆
    const obfuscated2 = obfuscateWithSession(testData, '/api/test');
    const deobfuscated2 = deobfuscateWithSession(obfuscated2, '/api/test');
    
    // 验证数据完整性
    const isValid1 = JSON.stringify(testData) === JSON.stringify(deobfuscated1);
    const isValid2 = JSON.stringify(testData) === JSON.stringify(deobfuscated2);
    
    return { isValid1, isValid2 };
};

// 缓存管理函数
async function clearLocalCache() {
    showConfirm(
        '确认清理本地缓存？这将清除离线数据，但不会影响登录状态。',
        async () => {
            try {
                // 清理 Service Worker 缓存
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(
                        cacheNames.map(cacheName => caches.delete(cacheName))
                    );
                }
                showToast('缓存已清理', 'success');
                setTimeout(() => location.reload(), 1000);
            } catch (error) {
                showToast('清理缓存失败', 'error');
            }
        }
    );
}

function clearSessionData() {
    showConfirm(
        '确认重置会话数据？这将清除登录状态和临时数据，并重新加载页面。',
        async () => {
            try {
                // 1. 清理内存中的敏感数据 (保留你原有的逻辑)
                if (typeof AppConfig !== 'undefined') {
                    AppConfig.ADMIN_KEY = '';
                    AppConfig.MASTER_PASSWORD = '';
                    if (AppConfig.selectedNotes) AppConfig.selectedNotes.clear();
                    AppConfig.categories = [];
                    AppConfig.currentPage = 1;
                    AppConfig.currentView = 'write';
                    AppConfig.currentCategory = 'all';
                }

                // 2. 停止活动监听器
                if (typeof activityTimer !== 'undefined' && activityTimer) {
                    clearInterval(activityTimer);
                    activityTimer = null;
                }

                // 3. 清理持久化存储（保留登录状态）
                const loginToken = localStorage.getItem('login_token');
                const adminKey = localStorage.getItem('admin_key');
                
                localStorage.clear();
                sessionStorage.clear();
                
                // 恢复登录状态
                if (loginToken) localStorage.setItem('login_token', loginToken);
                if (adminKey) localStorage.setItem('admin_key', adminKey);

                // 4. 清理 Service Worker 缓存 (你新增的逻辑)
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(
                        cacheNames.map(cacheName => caches.delete(cacheName))
                    );
                }

                // 5. 成功反馈并重启
                showToast('会话已重置，正在重新加载...', 'success');
                
                setTimeout(() => {
                    // 使用 replace 避免回退到已清除数据的页面状态
                    window.location.replace(window.location.origin + window.location.pathname);
                }, 1000);

            } catch (error) {
                console.error('重置失败:', error);
                showToast('部分数据清理失败，请手动刷新', 'error');
            }
        }
    );
}
// 测试函数：重置所有数据
window.resetAll = async function() {
    showConfirm(
        '⚠️ 确认清除所有本地数据？此操作不可撤销，所有配置和本地存储将被永久删除。',
        async () => {
            try {
                // 1. 清理各种存储机制（保留登录状态）
                const loginToken = localStorage.getItem('login_token');
                const adminKey = localStorage.getItem('admin_key');
                
                localStorage.clear();
                sessionStorage.clear();
                
                // 恢复登录状态
                if (loginToken) localStorage.setItem('login_token', loginToken);
                if (adminKey) localStorage.setItem('admin_key', adminKey);
                
                // 2. 尝试清理 IndexedDB (如果应用中有使用)
                if (window.indexedDB && window.indexedDB.databases) {
                    const dbs = await window.indexedDB.databases();
                    dbs.forEach(db => window.indexedDB.deleteDatabase(db.name));
                }

                // 3. 清理 Service Worker 缓存
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(
                        cacheNames.map(name => caches.delete(name))
                    );
                }

                // 4. 成功提示
                showToast('所有本地数据已清空', 'success');

                // 5. 延迟刷新，确保用户看到提示且 I/O 操作完成
                setTimeout(() => {
                    // 使用 location.replace 彻底重置页面上下文
                    window.location.replace(window.location.origin + window.location.pathname);
                }, 1200);

            } catch (error) {
                console.error('重置失败:', error);
                showToast('清理过程中出现异常', 'error');
            }
        }
    );
};