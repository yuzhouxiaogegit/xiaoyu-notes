// API数据混淆模块

/**
 * 小宇笔记 - 加密笔记管理系统
 * 作者：宇宙小哥
 * 项目地址：https://github.com/yuzhouxiaogegit/xiaoyu-notes
 * 版权所有 © 2025 宇宙小哥
 */

// 数据加密方法
function Encode(strJson, salt) {
    let strArr = JSON.stringify(strJson);
    let res = [];
    for (let i in strArr) {
        res[i] = strArr.charCodeAt(i) + salt;
    }
    return JSON.stringify(res);
}

// 数据解密方法
function Decode(strJson, salt) {
    let strArr = JSON.stringify(strJson).replace(/[\[|\]|\"|\']/g, '').split(',');
    let res = "";
    for (let i in strArr) {
        res += String.fromCharCode(Number(strArr[i]) + salt);
    }
    return JSON.parse(res);
}

// 从HTTP请求特征生成动态salt
function generateDynamicSalt(url, timestamp) {
    // 使用URL路径、时间戳等生成salt
    const urlHash = url.split('').reduce((hash, char) => {
        return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0);
    
    // 时间窗口（每30秒变化一次）
    const timeWindow = Math.floor(timestamp / 30000);
    
    // 结合多个因子生成salt（范围1-127，避免0和负数）
    const salt = Math.abs((urlHash + timeWindow) % 127) + 1;
    
    return salt;
}

// 从请求头生成额外的混淆因子
function getRequestFingerprint(headers) {
    const factors = [
        headers['User-Agent'] || '',
        headers['Accept-Language'] || '',
        headers['Accept-Encoding'] || ''
    ];
    
    return factors.join('|').split('').reduce((hash, char) => {
        return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0);
}

// 混淆API请求数据
function obfuscateRequestData(data, url) {
    const timestamp = Date.now();
    const salt = generateDynamicSalt(url, timestamp);
    
    const obfuscatedData = {
        payload: Encode(data, salt),
        timestamp: timestamp,
        checksum: btoa(url + timestamp) // 简单的校验和
    };
    
    return obfuscatedData;
}

// 解混淆API响应数据
function deobfuscateResponseData(obfuscatedData, url) {
    try {
        const { payload, timestamp, checksum } = obfuscatedData;
        
        // 验证校验和
        const expectedChecksum = btoa(url + timestamp);
        if (checksum !== expectedChecksum) {
            return null;
        }
        
        // 验证时间戳（防止重放攻击，允许5分钟误差）
        const now = Date.now();
        if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
            return null;
        }
        
        const salt = generateDynamicSalt(url, timestamp);
        return Decode(payload, -salt); // 解密时使用负salt
        
    } catch (error) {
        return null;
    }
}

// 增强版：结合会话信息的混淆
function obfuscateWithSession(data, url) {
    const timestamp = Date.now();
    const sessionToken = localStorage.getItem('login_token') || '';
    const adminKey = AppConfig.ADMIN_KEY || '';
    
    // 结合会话信息生成更复杂的salt
    const sessionHash = (sessionToken + adminKey).split('').reduce((hash, char) => {
        return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0);
    
    const baseSalt = generateDynamicSalt(url, timestamp);
    const finalSalt = Math.abs((baseSalt + sessionHash) % 127) + 1;
    
    const obfuscatedData = {
        payload: Encode(data, finalSalt),
        timestamp: timestamp,
        checksum: btoa(url + timestamp + sessionToken.slice(0, 8))
    };
    
    return obfuscatedData;
}

// 混淆API请求数据（兼容旧函数名）
function obfuscateRequestData(data, url) {
    return obfuscateWithSession(data, url);
}

// 解混淆API响应数据（兼容旧函数名）
function deobfuscateResponseData(obfuscatedData, url) {
    return deobfuscateWithSession(obfuscatedData, url);
}