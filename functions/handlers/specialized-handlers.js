/**
 * 专门化处理器 - 基于通用框架的特殊业务逻辑
 */

import { BaseHandler } from '../core/base-handler.js';
import { CrudHandler } from './crud-handler.js';
import { generateCaptcha, generateCaptchaSVG, generateCaptchaToken } from '../utils/captcha.js';

// 验证码存储
const captchaStore = new Map();

// 认证处理器
export class AuthHandler extends BaseHandler {
  // 验证码生成
  async captcha(request, url) {
    this.cleanExpiredCaptchas();
    
    const code = generateCaptcha();
    const token = generateCaptchaToken();
    const svg = generateCaptchaSVG(code);
    
    captchaStore.set(token, {
      code: code.toLowerCase(),
      timestamp: Date.now()
    });
    
    const svgBuffer = new TextEncoder().encode(svg);
    const base64 = btoa(String.fromCharCode(...svgBuffer));
    const imageUrl = `data:image/svg+xml;base64,${base64}`;
    
    return this.success({ imageUrl, captchaToken: token });
  }

  // 登录处理
  async login(request, url) {
    const { username, password, captcha, captchaToken } = await this.parseRequestData(request, url);
    
    // 验证码检查
    const captchaData = captchaStore.get(captchaToken);
    if (!captchaData || captchaData.code !== captcha.toLowerCase()) {
      captchaStore.delete(captchaToken);
      return this.error("验证码错误");
    }
    
    if (Date.now() - captchaData.timestamp > 5 * 60 * 1000) {
      captchaStore.delete(captchaToken);
      return this.error("验证码已过期");
    }
    
    captchaStore.delete(captchaToken);
    
    // 用户验证
    if (username === this.env.ADMIN_USERNAME && password === this.env.ADMIN_PASSWORD) {
      const token = btoa(`${username}:${Date.now()}`);
      return this.success({ token, admin_key: this.env.ADMIN_KEY });
    } else {
      return this.error("用户名或密码错误", 401);
    }
  }

  cleanExpiredCaptchas() {
    const now = Date.now();
    for (const [token, data] of captchaStore.entries()) {
      if (now - data.timestamp > 5 * 60 * 1000) {
        captchaStore.delete(token);
      }
    }
  }
}

// 笔记处理器（继承CRUD功能）
export class NotesHandler extends CrudHandler {
  constructor(env, corsHeaders) {
    super(env, corsHeaders, 'notes', {
      softDelete: false,
      defaultFilters: { is_share_copy: 0 }
    });
  }

  // 重写创建方法，添加分类处理
  async create(request, url) {
    const data = await this.parseRequestData(request, url);
    const { category = 'default' } = data;
    
    // 确保分类存在
    await this.ensureCategory(category);
    
    data.category_code = category;
    return super.create({ json: () => data }, url);
  }

  // 确保分类存在
  async ensureCategory(categoryCode) {
    if (categoryCode === 'default') {
      await this.dbRun(
        `INSERT OR IGNORE INTO categories (code, name) VALUES ('default', '默认分类')`
      );
    } else {
      await this.dbRun(
        `INSERT OR IGNORE INTO categories (code, name) VALUES (?, ?)`,
        [categoryCode, categoryCode]
      );
    }
  }
}

// 分类处理器
export class CategoriesHandler extends CrudHandler {
  constructor(env, corsHeaders) {
    super(env, corsHeaders, 'categories');
  }

  // 重写创建方法，自动生成code
  async create(request, url) {
    const data = await this.parseRequestData(request, url);
    const { name } = data;
    const code = name.toLowerCase().replace(/\s+/g, '_');
    
    data.code = code;
    return super.create({ json: () => data }, url);
  }

  // 重写删除方法，检查关联笔记
  async delete(request, url) {
    const data = await this.parseRequestData(request, url);
    const { code } = data;
    
    const noteCount = await this.dbFirst(
      `SELECT COUNT(*) as count FROM notes WHERE category_code = ? AND is_share_copy = 0`,
      [code]
    );
    
    if (noteCount.count > 0) {
      return this.error("该分类下有笔记，无法删除", 400, { count: noteCount.count });
    }
    
    return super.delete(request, url);
  }

  // 分类统计
  async stats(request, url) {
    const { results } = await this.dbQuery(`
      SELECT c.code, c.name, COUNT(n.id) as count 
      FROM categories c 
      LEFT JOIN notes n ON c.code = n.category_code AND n.is_share_copy = 0
      GROUP BY c.code, c.name
      ORDER BY c.created_at DESC
    `);
    
    return this.success({ categories: results });
  }
}

// 分享处理器
export class ShareHandler extends BaseHandler {
  async create(request, url) {
    const { content, viewLimit = -1 } = await this.parseRequestData(request, url);
    
    const result = await this.dbRun(
      `INSERT INTO notes (content, category_code, is_share_copy, view_limit, view_count) 
       VALUES (?, 'share', 1, ?, 0)`,
      [content, viewLimit]
    );
    
    const shareId = result.meta.last_row_id;
    const shareUrl = `${new URL(request.url).origin}?share=${shareId}`;
    
    return this.success({ shareUrl, shareId });
  }

  async get(request, url) {
    const { shareId } = await this.parseRequestData(request, url);
    
    const note = await this.dbFirst(
      `SELECT * FROM notes WHERE id = ? AND is_share_copy = 1`,
      [shareId]
    );
    
    if (!note) {
      return this.error("分享链接不存在或已失效", 404);
    }
    
    if (note.view_limit > 0 && note.view_count >= note.view_limit) {
      await this.dbRun(`DELETE FROM notes WHERE id = ?`, [shareId]);
      return this.error("分享链接已达到访问次数限制", 410);
    }
    
    const newViewCount = note.view_count + 1;
    const isLastView = note.view_limit > 0 && newViewCount >= note.view_limit;
    
    await this.dbRun(`UPDATE notes SET view_count = ? WHERE id = ?`, [newViewCount, shareId]);
    
    if (isLastView) {
      await this.dbRun(`DELETE FROM notes WHERE id = ?`, [shareId]);
    }
    
    return this.success({
      content: note.content,
      view_count: newViewCount,
      view_limit: note.view_limit,
      is_last_view: isLastView
    });
  }
}

// AI处理器
export class AIHandler extends BaseHandler {
  async summary(request, url) {
    const { text } = await this.parseRequestData(request, url);
    
    const aiRes = await this.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: '你是一个笔记摘要助手，请用简洁的中文总结用户输入的内容。' },
        { role: 'user', content: text.slice(0, 2000) }
      ]
    });
    
    return this.success({ summary: aiRes.response });
  }
}