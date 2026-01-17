// 加解密核心功能

/**
 * 小宇笔记 - 加密笔记管理系统
 * 作者：宇宙小哥
 * 项目地址：https://github.com/yuzhouxiaogegit/xiaoyu-notes
 * 版权所有 © 2025 宇宙小哥
 */

// 版权校验 - 延迟检查
(function() {
    setTimeout(() => {
        if (!window.CopyrightInfo || window.CopyrightInfo.author !== '宇宙小哥') {
            throw new Error('Copyright verification failed');
        }
    }, 100);
})();

// 生成随机 salt
function generateSalt() {
    return crypto.getRandomValues(new Uint8Array(16));
}

// 使用 PBKDF2 派生密钥
async function getK(pw, salt) {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(pw),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );
    
    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encrypt(text, pw) {
    // 版权保护检查
    if (!window.CopyrightInfo || window.CopyrightInfo.author !== '宇宙小哥') {
        throw new Error('Unauthorized access');
    }
    
    const salt = generateSalt();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await getK(pw, salt);
    
    const cipher = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv }, 
        key, 
        new TextEncoder().encode(text)
    );
    
    return btoa(JSON.stringify({ 
        salt: Array.from(salt),
        iv: Array.from(iv), 
        data: Array.from(new Uint8Array(cipher)) 
    }));
}

async function decrypt(json, pw) {
    // 版权保护检查
    if (!window.CopyrightInfo || window.CopyrightInfo.author !== '宇宙小哥') {
        return null;
    }
    
    try {
        const parsed = JSON.parse(atob(json));
        
        // 新格式：包含 salt
        if (parsed.salt) {
            const { salt, iv, data } = parsed;
            const key = await getK(pw, new Uint8Array(salt));
            
            const dec = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(iv) }, 
                key, 
                new Uint8Array(data)
            );
            return new TextDecoder().decode(dec);
        }
        
        // 旧格式：没有 salt，使用 SHA-256（向后兼容）
        if (parsed.iv && parsed.data && !parsed.salt) {
            const { iv, data } = parsed;
            
            // 使用旧的 SHA-256 方法
            const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
            const key = await crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['decrypt']);
            
            const dec = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(iv) }, 
                key, 
                new Uint8Array(data)
            );
            return new TextDecoder().decode(dec);
        }
        
        return null;
    } catch (e) { 
        return null; 
    }
}
