/**
 * 通用CRUD处理器 - 高复用的数据操作
 */

import { BaseHandler } from '../core/base-handler.js';

export class CrudHandler extends BaseHandler {
  constructor(env, corsHeaders, tableName, config = {}) {
    super(env, corsHeaders);
    this.table = tableName;
    this.config = {
      idField: 'id',
      timestampFields: ['created_at', 'updated_at'],
      softDelete: false,
      ...config
    };
  }

  // 通用创建
  async create(request, url) {
    const data = await this.parseRequestData(request, url);
    const { fields, values, placeholders } = this.buildInsertQuery(data);
    
    const sql = `INSERT INTO ${this.table} (${fields}) VALUES (${placeholders})`;
    const result = await this.dbRun(sql, values);
    
    return this.success({ 
      [this.config.idField]: result.meta.last_row_id 
    });
  }

  // 通用读取（支持分页和过滤）
  async read(request, url) {
    const data = await this.parseRequestData(request, url);
    const { page = 1, limit = 10, ...filters } = data;
    
    const baseQuery = `SELECT * FROM ${this.table} WHERE 1=1`;
    const countQuery = `SELECT COUNT(*) as total FROM ${this.table} WHERE 1=1`;
    
    const { query, countQuery: cQuery, params, countParams } = 
      this.buildPaginationQuery(baseQuery, countQuery, page, limit, filters);
    
    const { results } = await this.dbQuery(query, params);
    const countRes = await this.dbFirst(cQuery, countParams);
    
    return this.success({
      data: results,
      total: countRes.total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  }

  // 通用更新
  async update(request, url) {
    const data = await this.parseRequestData(request, url);
    const { [this.config.idField]: id, ...updateData } = data;
    
    if (!id) {
      return this.error(`缺少${this.config.idField}参数`);
    }
    
    const { fields, values } = this.buildUpdateQuery(updateData);
    const sql = `UPDATE ${this.table} SET ${fields} WHERE ${this.config.idField} = ?`;
    
    await this.dbRun(sql, [...values, id]);
    return this.success();
  }

  // 通用删除
  async delete(request, url) {
    const data = await this.parseRequestData(request, url);
    const { ids, [this.config.idField]: singleId } = data;
    
    const targetIds = ids || [singleId];
    if (!targetIds || targetIds.length === 0) {
      return this.error('缺少删除目标');
    }
    
    const result = await this.batchOperation(this.table, targetIds, 'DELETE');
    return this.success(result);
  }

  // 构建插入查询
  buildInsertQuery(data) {
    const fields = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');
    
    return { fields, values, placeholders };
  }

  // 构建更新查询
  buildUpdateQuery(data) {
    // 自动添加更新时间戳
    if (this.config.timestampFields.includes('updated_at')) {
      data.updated_at = new Date().toISOString();
    }
    
    const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = Object.values(data);
    
    return { fields, values };
  }
}