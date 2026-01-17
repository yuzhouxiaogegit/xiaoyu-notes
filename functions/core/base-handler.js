/**
 * 通用API处理基础类
 * 提供高复用的基础功能
 */

import { deobfuscateRequestData, deobfuscateWithSession } from '../utils/deobfuscate.js';

export class BaseHandler {
  constructor(env, corsHeaders) {
    this.env = env;
    this.corsHeaders = corsHeaders;
  }

  // 通用请求数据解析
  async parseRequestData(request, url) {
    const isObfuscated = request.headers.get('X-Obfuscated') === 'true';
    const sessionToken = request.headers.get('X-Session-Token');
    
    if (!isObfuscated) {
      return await request.json();
    }
    
    const obfuscatedData = await request.json();
    
    if (sessionToken && this.env.ADMIN_KEY) {
      return deobfuscateWithSession(obfuscatedData, url.pathname, sessionToken, this.env.ADMIN_KEY);
    } else {
      return deobfuscateRequestData(obfuscatedData, url.pathname);
    }
  }

  // 通用成功响应
  success(data = {}, status = 200) {
    return Response.json({ status: "OK", ...data }, { 
      status, 
      headers: this.corsHeaders 
    });
  }

  // 通用错误响应
  error(message, status = 400, extra = {}) {
    return Response.json({ error: message, ...extra }, { 
      status, 
      headers: this.corsHeaders 
    });
  }

  // 通用数据库操作封装
  async dbQuery(sql, params = []) {
    try {
      return await this.env.DB.prepare(sql).bind(...params).all();
    } catch (error) {
      throw new Error(`数据库查询失败: ${error.message}`);
    }
  }

  async dbFirst(sql, params = []) {
    try {
      return await this.env.DB.prepare(sql).bind(...params).first();
    } catch (error) {
      throw new Error(`数据库查询失败: ${error.message}`);
    }
  }

  async dbRun(sql, params = []) {
    try {
      return await this.env.DB.prepare(sql).bind(...params).run();
    } catch (error) {
      throw new Error(`数据库操作失败: ${error.message}`);
    }
  }

  // 通用分页处理
  buildPaginationQuery(baseQuery, countQuery, page = 1, limit = 10, filters = {}) {
    let query = baseQuery;
    let cQuery = countQuery;
    const params = [];
    const countParams = [];

    // 动态添加过滤条件
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        query += ` AND ${key} = ?`;
        cQuery += ` AND ${key} = ?`;
        params.push(value);
        countParams.push(value);
      }
    });

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    return { query, countQuery: cQuery, params, countParams };
  }

  // 通用批量操作
  async batchOperation(table, ids, operation = 'DELETE') {
    const idArray = Array.isArray(ids) ? ids : [ids];
    const placeholders = idArray.map(() => '?').join(',');
    
    const sql = `${operation} FROM ${table} WHERE id IN (${placeholders})`;
    await this.dbRun(sql, idArray);
    
    return { count: idArray.length };
  }
}