// 分享和阅后即焚相关功能模块

/**
 * 小宇笔记 - 分享模块
 * 作者：宇宙小哥
 */

// 修改分享模态框，支持访问次数限制
function showShareModal(content) {
    const modal = showModal(`
        <div class="tech-card w-full max-w-md p-8 rounded-2xl">
            <h3 class="text-2xl font-bold mb-4 flex items-center gap-2">
                <span>🔥</span>
                <span>阅后即焚</span>
            </h3>
            <p class="text-slate-400 text-sm mb-6">设置访问次数限制和加密密码</p>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-400 mb-2">加密密码</label>
                    <div class="relative">
                        <input id="sharePassword" type="password" placeholder="输入加密密码" maxlength="50"
                            class="w-full input-tech p-3 pr-10 rounded-xl text-sm font-mono">
                        <button onclick="togglePasswordVisibility('sharePassword')" type="button"
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors">
                            <svg id="sharePassword-icon" class="eye-icon" viewBox="0 0 24 24">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                    </div>
                    <p class="text-xs text-slate-500 mt-1">此密码用于加密分享内容</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-400 mb-2">访问次数限制</label>
                    <div class="flex gap-3">
                        <select id="shareViewLimitType" class="input-tech p-3 rounded-xl text-sm cursor-pointer" onchange="toggleCustomLimit()">
                            <option value="-1">无限次访问</option>
                            <option value="1">1次（查看后立即销毁）</option>
                            <option value="3">3次</option>
                            <option value="5">5次</option>
                            <option value="10">10次</option>
                            <option value="custom">自定义次数</option>
                        </select>
                        <input id="shareViewLimitCustom" type="number" placeholder="次数" min="1" max="999" maxlength="3"
                            class="input-tech p-3 rounded-xl text-sm w-24 hidden">
                    </div>
                </div>
                <button onclick="handleCreateShare('${content.replace(/'/g, "\\'")}', this)" 
                    class="w-full btn-primary text-white py-4 rounded-xl font-bold">
                    🔗 生成分享链接
                </button>
                <button onclick="this.closest('.fixed').remove()" 
                    class="w-full btn-secondary py-3 rounded-xl font-semibold">
                    取消
                </button>
            </div>
            <div id="shareResult" class="mt-4 hidden">
                <div class="tech-card p-4 rounded-xl">
                    <p class="text-xs text-slate-400 mb-2">分享链接：</p>
                    <input id="shareUrl" readonly class="w-full input-tech p-3 rounded-lg text-sm font-mono mb-3">
                    <p class="text-xs text-slate-500 mb-3" id="shareLimitInfo"></p>
                    <button onclick="copyShareLink()" class="w-full btn-secondary py-2 rounded-lg text-sm font-bold">
                        📋 复制链接
                    </button>
                </div>
            </div>
        </div>
    `);
}

// 切换自定义访问次数输入框
function toggleCustomLimit() {
    const select = document.getElementById('shareViewLimitType');
    const customInput = document.getElementById('shareViewLimitCustom');
    
    if (select.value === 'custom') {
        customInput.classList.remove('hidden');
        customInput.focus();
    } else {
        customInput.classList.add('hidden');
        customInput.value = '';
    }
}

async function handleCreateShare(content, btn) {
    const password = document.getElementById('sharePassword').value.trim();
    if (!password) {
        showToast('请输入加密密码', 'warning');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = '生成中...';
    
    try {
        // 使用用户输入的密码加密内容
        const encryptedContent = await encrypt(content, password);
        
        // 获取访问次数限制
        const limitType = document.getElementById('shareViewLimitType').value;
        let viewLimit = -1;
        if (limitType === 'custom') {
            const customLimit = parseInt(document.getElementById('shareViewLimitCustom').value);
            viewLimit = customLimit > 0 ? customLimit : -1;
        } else if (limitType !== '-1') {
            viewLimit = parseInt(limitType);
        }
        
        const url = await createShareLink(encryptedContent, viewLimit);
        
        document.getElementById('shareResult').classList.remove('hidden');
        document.getElementById('shareUrl').value = url;
        
        // 显示限制信息
        const limitInfo = document.getElementById('shareLimitInfo');
        if (viewLimit > 0) {
            limitInfo.textContent = `访问限制：${viewLimit}次后自动销毁`;
        } else {
            limitInfo.textContent = '访问限制：无限次访问';
        }
        
        btn.textContent = '✅ 已生成';
    } catch (error) {
        showToast('生成分享链接失败：' + error.message, 'error');
        btn.disabled = false;
        btn.textContent = '🔗 生成分享链接';
    }
}

async function copyShareLink() {
    const input = document.getElementById('shareUrl');
    const textToCopy = input.value;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(textToCopy);
            showToast('链接已复制到剪贴板', 'success');
            return; 
        } catch (err) {

        }
    }

    try {
        input.select();
        input.setSelectionRange(0, 99999); 
        const successful = document.execCommand('copy');
        if (successful) {
            showToast('链接已复制到剪贴板', 'success');
        } else {
            throw new Error('execCommand copy failed');
        }
    } catch (err) {
        showToast('复制失败，请手动选择复制', 'error');
    }
}

// 分享页面
function renderSharePage(shareId) {
    document.getElementById('app').innerHTML = `
        <div class="fixed inset-0 flex items-center justify-center p-2 sm:p-4 md:p-8">
            <div class="tech-card p-4 sm:p-6 md:p-8 lg:p-12 rounded-2xl sm:rounded-3xl w-full max-w-[95vw] sm:max-w-2xl lg:max-w-4xl xl:max-w-7xl space-y-4 sm:space-y-6">
                <div class="text-center mb-4 sm:mb-6">
                    <div class="text-4xl sm:text-5xl md:text-6xl mb-4">🔥</div>
                    <h1 class="text-2xl sm:text-3xl md:text-4xl font-black mb-2">阅后即焚</h1>
                    <p class="text-slate-400 text-sm">此内容查看后将永久销毁</p>
                    <div id="viewLimitInfo" class="mt-4 hidden">
                        <span class="tech-badge px-3 sm:px-4 py-2 rounded-lg text-sm font-bold"></span>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-400 mb-2">解密密码</label>
                    <div class="relative">
                        <input id="sharePw" type="password" placeholder="输入笔记密码解密内容" maxlength="50"
                            class="w-full input-tech p-3 sm:p-4 pr-12 rounded-xl font-mono text-sm sm:text-base">
                        <button onclick="togglePasswordVisibility('sharePw')" type="button"
                            class="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors">
                            <svg id="sharePw-icon" class="eye-icon" viewBox="0 0 24 24">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                    </div>
                </div>
                <button onclick="viewShareContent('${shareId}')" class="w-full btn-primary text-white py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg">
                    🔓 解密并查看
                </button>
                <div id="shareContent" class="tech-card p-4 sm:p-6 md:p-8 rounded-xl hidden min-h-[300px] sm:min-h-[400px] max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
                    <pre class="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed whitespace-pre-wrap font-sans break-words"></pre>
                </div>
            </div>
        </div>
    `;
}

// 修改分享页面，显示访问次数信息
async function viewShareContent(shareId) {
    const pw = document.getElementById('sharePw').value;
    if (!pw) {
        showToast('请输入密码', 'warning');
        return;
    }
    
    const data = await getShareContent(shareId);
    if (!data) {
        showToast('链接已失效或被焚毁', 'error');
        return;
    }
    
    const clearText = await decrypt(data.content, pw);
    if (!clearText) {
        showToast('密码错误', 'error');
        return;
    }
    
    const contentDiv = document.getElementById('shareContent');
    contentDiv.querySelector('pre').textContent = clearText;
    contentDiv.classList.remove('hidden');
    
    // 显示查看次数信息
    const viewLimitInfo = document.getElementById('viewLimitInfo');
    const badge = viewLimitInfo.querySelector('.tech-badge');
    
    let message = '';
    let toastMessage = '⚠️ 此内容已查看';
    
    if (data.view_limit > 0) {
        if (data.is_last_view) {
            message = `🔥 这是最后一次查看，内容已永久删除！`;
            toastMessage = `⚠️ 这是最后一次查看，内容已从服务器永久删除！`;
            badge.className = 'tech-badge px-4 py-2 rounded-lg text-sm font-bold bg-red-500/20 border-red-500/30 text-red-400';
        } else {
            const remaining = data.view_limit - data.view_count;
            message = `👁️ 已查看 ${data.view_count}/${data.view_limit} 次，还可查看 ${remaining} 次`;
            toastMessage = `⚠️ 已查看 ${data.view_count}/${data.view_limit} 次，还可查看 ${remaining} 次`;
            badge.className = 'tech-badge px-4 py-2 rounded-lg text-sm font-bold bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
        }
    } else {
        message = `♾️ 无限次访问`;
        badge.className = 'tech-badge px-4 py-2 rounded-lg text-sm font-bold bg-green-500/20 border-green-500/30 text-green-400';
    }
    
    badge.textContent = message;
    viewLimitInfo.classList.remove('hidden');
    
    showToast(toastMessage, 'warning');
}