/**
 * 小宇笔记 - 加密笔记管理系统
 * 作者：宇宙小哥
 * 项目地址：https://github.com/yuzhouxiaogegit/xiaoyu-notes
 * 版权所有 © 2025 宇宙小哥
 */

// 简单的服务端加密函数（基于环境变量中的密钥）
function encryptContent(text, key) {
  try {
    // 使用简单的XOR加密（生产环境建议使用更强的加密）
    const keyBytes = new TextEncoder().encode(key);
    const textBytes = new TextEncoder().encode(text);
    const encrypted = new Uint8Array(textBytes.length);
    
    for (let i = 0; i < textBytes.length; i++) {
      encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    // 转换为base64
    return btoa(String.fromCharCode(...encrypted));
  } catch (e) {
    return text; // 加密失败时返回原文
  }
}

// 简单的服务端解密函数
function decryptContent(encryptedText, key) {
  try {
    // 从base64解码
    const encrypted = new Uint8Array(atob(encryptedText).split('').map(c => c.charCodeAt(0)));
    const keyBytes = new TextEncoder().encode(key);
    const decrypted = new Uint8Array(encrypted.length);
    
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    return encryptedText; // 解密失败时返回原文
  }
}

// 数据解混淆函数（服务端）
function Decode(strJson, salt) {
  let strArr = JSON.stringify(strJson).replace(/[\[|\]|\"|\']/g, '').split(',');
  let res = "";
  for (let i in strArr) {
    res += String.fromCharCode(Number(strArr[i]) + salt);
  }
  return JSON.parse(res);
}

// 从HTTP请求特征生成动态salt（与客户端保持一致）
function generateDynamicSalt(url, timestamp) {
  const urlHash = url.split('').reduce((hash, char) => {
    return ((hash << 5) - hash) + char.charCodeAt(0);
  }, 0);
  
  const timeWindow = Math.floor(timestamp / 30000);
  const salt = Math.abs((urlHash + timeWindow) % 127) + 1;
  
  return salt;
}

// 解混淆请求数据
function deobfuscateRequestData(obfuscatedData, url) {
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
function deobfuscateWithSession(obfuscatedData, url, sessionToken, adminKey) {
  try {
    const { payload, timestamp, checksum } = obfuscatedData;
    
    // 验证校验和
    const expectedChecksum = btoa(url + timestamp + (sessionToken || '').slice(0, 8));
    if (checksum !== expectedChecksum) {
      return null;
    }
    
    // 验证时间戳
    const now = Date.now();
    if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
      return null;
    }
    
    // 重新计算salt
    const sessionHash = ((sessionToken || '') + (adminKey || '')).split('').reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0);
    
    const baseSalt = generateDynamicSalt(url, timestamp);
    const finalSalt = Math.abs((baseSalt + sessionHash) % 127) + 1;
    
    return Decode(payload, -finalSalt);
    
  } catch (error) {
    return null;
  }
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  
  if (!url.pathname.startsWith('/api')) {
    return next();
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Session-Token, X-Obfuscated",
    "Access-Control-Expose-Headers": "X-New-Token, X-Obfuscated"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 初始化数据库
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        category_code TEXT DEFAULT 'default',
        view_limit INTEGER DEFAULT -1,
        view_count INTEGER DEFAULT 0,
        public_id TEXT UNIQUE, 
        is_share_copy INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_notes_pid ON notes(public_id)`).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category_code)`).run();
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_categories_code ON categories(code)`).run();

    // 生成验证码接口（支持GET和POST）
    if (url.pathname === "/api/captcha" && (request.method === "GET" || request.method === "POST")) {
      // 生成 6 位字母数字混合验证码（排除易混淆字符）
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      
      const token = btoa(`${code}:${Date.now()}`);
      
      // 生成复杂的 SVG 验证码
      const width = 160;
      const height = 50;
      
      // 随机颜色
      const colors = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#fb923c'];
      
      // 生成字符
      let chars_svg = '';
      for (let i = 0; i < code.length; i++) {
        const x = 15 + i * 24;
        const y = 30 + (Math.random() - 0.5) * 8;
        const rotate = (Math.random() - 0.5) * 30;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const fontSize = 22 + Math.floor(Math.random() * 6);
        
        chars_svg += `
          <text x="${x}" y="${y}" 
                font-family="Arial, sans-serif" 
                font-size="${fontSize}" 
                font-weight="bold" 
                fill="${color}"
                transform="rotate(${rotate} ${x} ${y})">${code[i]}</text>
        `;
      }
      
      // 生成干扰线
      let lines = '';
      for (let i = 0; i < 5; i++) {
        const x1 = Math.random() * width;
        const y1 = Math.random() * height;
        const x2 = Math.random() * width;
        const y2 = Math.random() * height;
        const color = colors[Math.floor(Math.random() * colors.length)];
        lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.5" opacity="0.4"/>`;
      }
      
      // 生成噪点
      let dots = '';
      for (let i = 0; i < 50; i++) {
        const cx = Math.random() * width;
        const cy = Math.random() * height;
        const r = Math.random() * 2 + 0.5;
        const color = colors[Math.floor(Math.random() * colors.length)];
        dots += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="0.3"/>`;
      }
      
      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="turbulence"/>
              <feDisplacementMap in2="turbulence" in="SourceGraphic" scale="3" xChannelSelector="R" yChannelSelector="G"/>
            </filter>
          </defs>
          <rect width="${width}" height="${height}" fill="#1e293b"/>
          ${dots}
          ${lines}
          <g filter="url(#noise)">
            ${chars_svg}
          </g>
        </svg>
      `;
      
      // 转换为 base64
      const base64Image = `data:image/svg+xml;base64,${btoa(svg)}`;
      
      return Response.json({
        image: base64Image,
        token: token
      }, { headers: corsHeaders });
    }

    // 验证验证码接口
    if (url.pathname === "/api/verify-captcha" && request.method === "POST") {
      const { token, code } = await request.json();
      
      try {
        const decoded = atob(token);
        const [originalCode, timestamp] = decoded.split(':');
        const now = Date.now();
        
        // 验证码 5 分钟内有效
        if (now - parseInt(timestamp) > 5 * 60 * 1000) {
          return Response.json({ error: "验证码已过期" }, { status: 400, headers: corsHeaders });
        }
        
        // 不区分大小写
        if (code.toUpperCase() === originalCode.toUpperCase()) {
          return Response.json({ status: "OK" }, { headers: corsHeaders });
        } else {
          return Response.json({ error: "验证码错误" }, { status: 400, headers: corsHeaders });
        }
      } catch (e) {
        return Response.json({ error: "验证码无效" }, { status: 400, headers: corsHeaders });
      }
    }

    // 登录接口（不需要鉴权）
    if (url.pathname === "/api/login" && request.method === "POST") {
      let requestData = await request.json();
      
      // 检查是否是混淆数据
      if (request.headers.get('X-Obfuscated') === 'true' && requestData.payload) {
        const deobfuscatedData = deobfuscateRequestData(requestData, url.pathname);
        if (deobfuscatedData) {
          requestData = deobfuscatedData;
        } else {
          return Response.json({ error: "数据解析失败" }, { status: 400, headers: corsHeaders });
        }
      }
      
      const { username, password, captcha, captchaToken } = requestData;
      
      // 先验证验证码
      try {
        const decoded = atob(captchaToken);
        const [originalCode, timestamp] = decoded.split(':');
        const now = Date.now();
        
        if (now - parseInt(timestamp) > 5 * 60 * 1000) {
          return Response.json({ error: "验证码已过期" }, { status: 400, headers: corsHeaders });
        }
        
        // 不区分大小写
        if (captcha.toUpperCase() !== originalCode.toUpperCase()) {
          return Response.json({ error: "验证码错误" }, { status: 400, headers: corsHeaders });
        }
      } catch (e) {
        return Response.json({ error: "验证码无效" }, { status: 400, headers: corsHeaders });
      }
      
      // 验证用户名密码
      if (username === env.LOGIN_USERNAME && password === env.LOGIN_PASSWORD) {
        const token = btoa(`${username}:${Date.now()}`);
        return Response.json({ 
          status: "OK", 
          token,
          admin_key: env.ADMIN_KEY 
        }, { headers: corsHeaders });
      } else {
        return Response.json({ 
          error: "用户名或密码错误" 
        }, { status: 401, headers: corsHeaders });
      }
    }

    // 阅后即焚接口（改为POST）
    if (url.pathname === "/api/share" && request.method === "POST") {
      try {
        const { shareId } = await getRequestData();
        const note = await env.DB.prepare("SELECT * FROM notes WHERE public_id = ? AND is_share_copy = 1").bind(shareId).first();
        
        if (!note) {
          return Response.json({ error: "失效或已被焚毁" }, { status: 404, headers: corsHeaders });
        }
        
        // 检查访问次数限制
        if (note.view_limit > 0 && note.view_count >= note.view_limit) {
          await env.DB.prepare("DELETE FROM notes WHERE public_id = ?").bind(shareId).run();
          return Response.json({ error: "访问次数已达上限，已自动删除" }, { status: 410, headers: corsHeaders });
        }
        
        // 增加访问次数
        const newCount = note.view_count + 1;
        
        // 如果达到限制，删除；否则更新计数
        if (note.view_limit > 0 && newCount >= note.view_limit) {
          await env.DB.prepare("DELETE FROM notes WHERE public_id = ?").bind(shareId).run();
        } else {
          await env.DB.prepare("UPDATE notes SET view_count = ? WHERE public_id = ?").bind(newCount, shareId).run();
        }
        
        // 分享内容需要先用服务端密钥解密，得到用户密码加密的内容
        const serverKey = env.SERVER_ENCRYPT_KEY || 'default-server-key-change-in-production';
        const userEncryptedContent = decryptContent(note.content, serverKey);
        
        return Response.json({ 
          content: userEncryptedContent, // 返回用户密码加密的内容
          view_count: newCount,
          view_limit: note.view_limit,
          is_last_view: note.view_limit > 0 && newCount >= note.view_limit
        }, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
      }
    }

    // 管理员鉴权
    const auth = request.headers.get("Authorization");
    if (auth !== env.ADMIN_KEY) {
      return Response.json({ error: "暗号错误" }, { status: 401, headers: corsHeaders });
    }

    // 检查并续期 token
    const sessionToken = request.headers.get("X-Session-Token");
    if (sessionToken) {
      try {
        const decoded = atob(sessionToken);
        const [username, timestamp] = decoded.split(':');
        const now = Date.now();
        
        // 如果 token 在 2 小时内，自动续期
        if (now - parseInt(timestamp) < 2 * 60 * 60 * 1000) {
          const newToken = btoa(`${username}:${now}`);
          corsHeaders['X-New-Token'] = newToken;
        }
      } catch (e) {
        // token 无效，忽略
      }
    }

    // 通用请求数据解混淆处理
    async function getRequestData() {
      if (request.method === 'GET') return {};
      
      let requestData = await request.json();
      
      // 检查是否是混淆数据
      if (request.headers.get('X-Obfuscated') === 'true' && requestData.payload) {
        const deobfuscatedData = deobfuscateWithSession(requestData, url.pathname, sessionToken, auth);
        if (deobfuscatedData) {
          return deobfuscatedData;
        } else {
          throw new Error('数据解析失败');
        }
      }
      
      return requestData;
    }

    // 分类管理 - 创建分类
    if (url.pathname === "/api/categories/create" && request.method === "POST") {
      try {
        const { name } = await getRequestData();
        if (!name) {
          return Response.json({ error: "分类名称不能为空" }, { status: 400, headers: corsHeaders });
        }
        
        // 生成唯一编码
        const code = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await env.DB.prepare("INSERT INTO categories (name, code) VALUES (?, ?)")
          .bind(name, code).run();
        
        return Response.json({ status: "OK", code, name }, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
      }
    }

    // 分类管理 - 获取所有分类（改为POST）
    if (url.pathname === "/api/categories/list" && request.method === "POST") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM categories ORDER BY created_at DESC"
      ).all();
      return Response.json({ categories: results }, { headers: corsHeaders });
    }

    // 分类管理 - 更新分类名称
    if (url.pathname === "/api/categories/update" && request.method === "POST") {
      try {
        const { code, name } = await getRequestData();
        if (!name) {
          return Response.json({ error: "分类名称不能为空" }, { status: 400, headers: corsHeaders });
        }
        
        await env.DB.prepare("UPDATE categories SET name = ? WHERE code = ?")
          .bind(name, code).run();
        
        return Response.json({ status: "OK", name }, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
      }
    }

    // 分类管理 - 删除分类
    if (url.pathname === "/api/categories/delete" && request.method === "POST") {
      try {
        const { code } = await getRequestData();
        
        // 检查是否有笔记使用此分类
        const count = await env.DB.prepare(
          "SELECT COUNT(*) as count FROM notes WHERE category_code = ? AND is_share_copy = 0"
        ).bind(code).first();
        
        if (count.count > 0) {
          return Response.json({ 
            error: "该分类下还有笔记，无法删除", 
            count: count.count 
          }, { status: 400, headers: corsHeaders });
        }
        
        await env.DB.prepare("DELETE FROM categories WHERE code = ?").bind(code).run();
        return Response.json({ status: "Deleted" }, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
      }
    }

    // 保存笔记
    if (url.pathname === "/api/save" && request.method === "POST") {
      try {
        const { content, category_code, view_limit, public_id, is_share } = await getRequestData();
        
        // 使用服务端密钥加密内容
        const serverKey = env.SERVER_ENCRYPT_KEY || 'default-server-key-change-in-production';
        const encryptedContent = encryptContent(content, serverKey);
        
        await env.DB.prepare(
          "INSERT OR REPLACE INTO notes (content, category_code, view_limit, public_id, is_share_copy) VALUES (?, ?, ?, ?, ?)"
        ).bind(
          encryptedContent, // 存储加密后的内容
          category_code || 'default', 
          view_limit !== undefined ? view_limit : -1,
          public_id || null, 
          is_share ? 1 : 0
        ).run();
        
        return Response.json({ status: "OK" }, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
      }
    }

    // 更新笔记分类
    if (url.pathname === "/api/note/update-category" && request.method === "POST") {
      try {
        const { id, category_code } = await getRequestData();
        
        await env.DB.prepare(
          "UPDATE notes SET category_code = ? WHERE id = ?"
        ).bind(category_code, id).run();
        
        return Response.json({ status: "OK" }, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
      }
    }

    // 更新笔记内容
    if (url.pathname === "/api/note/update" && request.method === "POST") {
      try {
        const { id, content, category_code } = await getRequestData();
        
        // 使用服务端密钥加密内容
        const serverKey = env.SERVER_ENCRYPT_KEY || 'default-server-key-change-in-production';
        const encryptedContent = encryptContent(content, serverKey);
        
        await env.DB.prepare(
          "UPDATE notes SET content = ?, category_code = ? WHERE id = ? AND is_share_copy = 0"
        ).bind(encryptedContent, category_code || 'default', id).run();
        
        return Response.json({ status: "OK" }, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
      }
    }

    // 获取笔记列表（改为POST）
    if (url.pathname === "/api/list" && request.method === "POST") {
      try {
        const { page = 1, limit = 10, category = '' } = await getRequestData();
        const offset = (page - 1) * limit;

        let query = "SELECT * FROM notes WHERE is_share_copy = 0";
        let countQuery = "SELECT COUNT(*) as total FROM notes WHERE is_share_copy = 0";
        const params = [];
        const countParams = [];

        if (category && category !== 'all') {
          query += " AND category_code = ?";
          countQuery += " AND category_code = ?";
          params.push(category);
          countParams.push(category);
        }

        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
        params.push(limit, offset);

        const { results } = await env.DB.prepare(query).bind(...params).all();
        const countRes = await env.DB.prepare(countQuery).bind(...countParams).first();

        // 解密笔记内容
        const serverKey = env.SERVER_ENCRYPT_KEY || 'default-server-key-change-in-production';
        const decryptedResults = results.map(note => ({
          ...note,
          content: decryptContent(note.content, serverKey) // 解密后返回明文
        }));

        return Response.json({
          data: decryptedResults,
          total: countRes.total,
          page: page,
          limit: limit
        }, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
      }
    }

    // 获取分类统计（改为POST）
    if (url.pathname === "/api/categories/stats" && request.method === "POST") {
      const { results } = await env.DB.prepare(`
        SELECT c.code, c.name, COUNT(n.id) as count 
        FROM categories c 
        LEFT JOIN notes n ON c.code = n.category_code AND n.is_share_copy = 0
        GROUP BY c.code, c.name
        ORDER BY c.created_at DESC
      `).all();
      return Response.json({ categories: results }, { headers: corsHeaders });
    }

    // 删除笔记（支持批量）
    if (url.pathname === "/api/delete" && request.method === "POST") {
      try {
        const { ids } = await getRequestData();
        const idArray = Array.isArray(ids) ? ids : [ids];
        const placeholders = idArray.map(() => '?').join(',');
        await env.DB.prepare(`DELETE FROM notes WHERE id IN (${placeholders})`).bind(...idArray).run();
        return Response.json({ status: "Deleted", count: idArray.length }, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
      }
    }

    // AI 智能总结
    if (url.pathname === "/api/ai-sum" && request.method === "POST") {
      try {
        const { text } = await getRequestData();
        const aiRes = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
          messages: [
            { role: 'system', content: '你是一个笔记摘要助手，请用简洁的中文总结用户输入的内容。' },
            { role: 'user', content: text.slice(0, 2000) }
          ]
        });
        return Response.json({ summary: aiRes.response }, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });

  } catch (e) {
    return Response.json({ error: "Server Error", message: e.message }, { status: 500, headers: corsHeaders });
  }
}
