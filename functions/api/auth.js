/**
 * 小宇笔记 - 认证API处理
 * 作者：宇宙小哥
 */

import { generateCaptcha, generateCaptchaSVG, generateCaptchaToken } from '../utils/captcha.js';

// 验证码存储（生产环境应使用数据库或Redis）
const captchaStore = new Map();

// 清理过期验证码
function cleanExpiredCaptchas() {
  const now = Date.now();
  for (const [token, data] of captchaStore.entries()) {
    if (now - data.timestamp > 5 * 60 * 1000) { // 5分钟过期
      captchaStore.delete(token);
    }
  }
}

// 处理验证码生成
export async function handleCaptcha(request, env, corsHeaders) {
  try {
    cleanExpiredCaptchas();
    
    const code = generateCaptcha();
    const token = generateCaptchaToken();
    const svg = generateCaptchaSVG(code);
    
    // 存储验证码（生产环境应使用数据库）
    captchaStore.set(token, {
      code: code.toLowerCase(),
      timestamp: Date.now()
    });
    
    const svgBuffer = new TextEncoder().encode(svg);
    const base64 = btoa(String.fromCharCode(...svgBuffer));
    const imageUrl = `data:image/svg+xml;base64,${base64}`;
    
    return Response.json({
      imageUrl: imageUrl,
      captchaToken: token
    }, { headers: corsHeaders });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  }
}

// 处理登录验证
export async function handleLogin(request, env, corsHeaders, getRequestData) {
  try {
    const { username, password, captcha, captchaToken } = await getRequestData();
    
    // 验证验证码
    const captchaData = captchaStore.get(captchaToken);
    if (!captchaData || captchaData.code !== captcha.toLowerCase()) {
      captchaStore.delete(captchaToken);
      return Response.json({ error: "验证码错误" }, { status: 400, headers: corsHeaders });
    }
    
    // 验证验证码是否过期
    if (Date.now() - captchaData.timestamp > 5 * 60 * 1000) {
      captchaStore.delete(captchaToken);
      return Response.json({ error: "验证码已过期" }, { status: 400, headers: corsHeaders });
    }
    
    // 删除已使用的验证码
    captchaStore.delete(captchaToken);
    
    // 验证用户名和密码
    if (username === env.ADMIN_USERNAME && password === env.ADMIN_PASSWORD) {
      const token = btoa(`${username}:${Date.now()}`);
      
      return Response.json({
        status: "OK",
        token: token,
        admin_key: env.ADMIN_KEY
      }, { headers: corsHeaders });
    } else {
      return Response.json({ error: "用户名或密码错误" }, { status: 401, headers: corsHeaders });
    }
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  }
}