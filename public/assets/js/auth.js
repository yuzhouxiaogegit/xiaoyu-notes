// 认证相关功能模块

/**
 * 小宇笔记 - 认证模块
 * 作者：宇宙小哥
 */

// 使用window对象避免重复声明错误
window.activityTimer = window.activityTimer || null;
window.lastActivityTime = window.lastActivityTime || Date.now();
window.currentCaptchaToken = window.currentCaptchaToken || null;

// 启动活动监听
function startActivityMonitor() {
    // 监听用户活动
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
        document.addEventListener(event, updateActivity, { passive: true });
    });
    
    // 每 30 秒检查一次 token
    window.activityTimer = setInterval(checkTokenExpiry, 30000);
}

// 更新活动时间
function updateActivity() {
    window.lastActivityTime = Date.now();
}

// 检查 token 是否过期
function checkTokenExpiry() {
    const token = localStorage.getItem('login_token');
    if (!token) {
        handleTokenExpired();
        return;
    }
    
    try {
        const decoded = atob(token);
        const [, timestamp] = decoded.split(':');
        const now = Date.now();
        const tokenAge = now - parseInt(timestamp);
        
        // token 超过 2 小时，强制退出
        if (tokenAge > 2 * 60 * 60 * 1000) {
            handleTokenExpired();
            return;
        }
        
        // 如果用户在 5 分钟内有活动，且 token 超过 10 分钟，主动续期
        const timeSinceActivity = now - window.lastActivityTime;
        if (timeSinceActivity < 5 * 60 * 1000 && tokenAge > 10 * 60 * 1000) {
            renewToken();
        }
    } catch (e) {
        handleTokenExpired();
    }
}

// 主动续期 token
async function renewToken() {
    // 通过任意 API 请求触发续期
    await getCategoryStats();
}

// token 过期处理
function handleTokenExpired() {
    if (window.activityTimer) {
        clearInterval(window.activityTimer);
    }
    localStorage.removeItem('login_token');
    showToast('登录已过期，请重新登录', 'warning');
    setTimeout(() => location.reload(), 2000);
}

// 刷新验证码
async function refreshCaptcha() {
    try {
        const result = await getCaptcha();
        if (result) {
            document.getElementById('captchaImage').src = result.imageUrl;
            window.currentCaptchaToken = result.captchaToken;
        }
    } catch (error) {
        console.warn('刷新验证码失败:', error.message);
        // 在生产环境中，验证码失败应该显示错误
        if (!isDevEnvironment()) {
            showToast('获取验证码失败，请刷新页面重试', 'error');
        }
    }
}

// 处理登录
async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const captcha = document.getElementById('loginCaptcha').value.trim();
    
    if (!username || !password) {
        showToast('请输入用户名和密码', 'warning');
        return;
    }
    
    if (!captcha) {
        showToast('请输入验证码', 'warning');
        return;
    }
    
    LoadingManager.show('login', '正在登录...');
    
    try {
        const result = await login(username, password, captcha, window.currentCaptchaToken);
        
        if (result && result.error) {
            showToast(result.error, 'error');
            refreshCaptcha();
            document.getElementById('loginCaptcha').value = '';
            return;
        }
        
        if (result && result.status === 'OK') {
            // 保存登录信息
            localStorage.setItem('login_token', result.token);
            AppConfig.ADMIN_KEY = result.admin_key;
            
            showToast('登录成功', 'success');
            
            // 登录成功后直接跳转到主应用
            setTimeout(() => {
                document.getElementById('app').innerHTML = renderDashboard();
                initSidebarState(); // 初始化侧边栏状态
                switchView('write');
                startActivityMonitor();
            }, 500);
        } else {
            showToast('登录失败，请重试', 'error');
            refreshCaptcha();
        }
    } catch (error) {
        showToast('登录过程中发生错误：' + error.message, 'error');
        refreshCaptcha();
    } finally {
        LoadingManager.hide('login');
    }
}

// 退出登录
function handleLogout() {
    showConfirm(
        '确认退出登录？',
        () => {
            if (window.activityTimer) {
                clearInterval(window.activityTimer);
            }
            localStorage.clear();
            showToast('已退出登录', 'success');
            setTimeout(() => location.reload(), 500);
        },
        'warning'
    );
}