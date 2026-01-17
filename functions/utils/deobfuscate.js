/**
 * 小宇笔记 - 数据解混淆工具
 * 作者：宇宙小哥
 */

// 数据解混淆函数（服务端）
export function Decode(strJson, salt) {
  let strArr = JSON.stringify(strJson).replace(/[\[|\]|\"|\']/g, '').split(',');
  let res = "";
  for (let i in strArr) {
    res += String.fromCharCode(Number(strArr[i]) + salt);
  }
  return JSON.parse(res);
}

// 从HTTP请求特征生成动态salt（与客户端保持一致）
export function generateDynamicSalt(url, timestamp) {
  const urlHash = url.split('').reduce((hash, char) => {
    return ((hash << 5) - hash) + char.charCodeAt(0);
  }, 0);
  
  const timeWindow = Math.floor(timestamp / 30000);
  const salt = Math.abs((urlHash + timeWindow) % 127) + 1;
  
  return salt;
}

// 解混淆请求数据
export function deobfuscateRequestData(obfuscatedData, url) {
  try {
    const { payload, timestamp, checksum } = obfuscatedData;
    
    // 验证校验和
    const expectedChecksum = btoa(url + timestamp);
    if (checksum !== expectedChecksum) {
      return null;
    }
    
    // 验证时间戳（允许5分钟误差）
    const now = Date.now();
    if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
      return null;
    }
    
    const salt = generateDynamicSalt(url, timestamp);
    return Decode(payload, -salt);
    
  } catch (error) {
    return null;
  }
}

// 处理带会话信息的解混淆
export function deobfuscateWithSession(obfuscatedData, url, sessionToken, adminKey) {
  try {
    const { payload, timestamp, checksum } = obfuscatedData;
    
    // 验证校验和
    const expectedChecksum = btoa(url + timestamp + sessionToken);
    if (checksum !== expectedChecksum) {
      return null;
    }
    
    // 验证时间戳（允许5分钟误差）
    const now = Date.now();
    if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
      return null;
    }
    
    // 使用会话信息增强salt
    const baseSalt = generateDynamicSalt(url, timestamp);
    const sessionHash = sessionToken.split('').reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0);
    const adminHash = adminKey.split('').reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0);
    
    const finalSalt = baseSalt + (Math.abs(sessionHash + adminHash) % 50);
    
    return Decode(payload, -finalSalt);
    
  } catch (error) {
    return null;
  }
}