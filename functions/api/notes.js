/**
 * 小宇笔记 - 笔记API处理
 * 作者：宇宙小哥
 */

// 处理笔记保存
export async function handleSaveNote(request, env, corsHeaders, getRequestData) {
  try {
    const { content, category } = await getRequestData();
    const categoryCode = category || 'default';
    
    // 确保默认分类存在
    await env.DB.prepare(`
      INSERT OR IGNORE INTO categories (code, name) VALUES ('default', '默认分类')
    `).run();
    
    // 确保指定分类存在
    if (categoryCode !== 'default') {
      await env.DB.prepare(`
        INSERT OR IGNORE INTO categories (code, name) VALUES (?, ?)
      `).bind(categoryCode, categoryCode).run();
    }
    
    const result = await env.DB.prepare(`
      INSERT INTO notes (content, category_code) VALUES (?, ?)
    `).bind(content, categoryCode).run();
    
    return Response.json({ 
      status: "OK", 
      id: result.meta.last_row_id 
    }, { headers: corsHeaders });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  }
}

// 处理笔记更新
export async function handleUpdateNote(request, env, corsHeaders, getRequestData) {
  try {
    const { id, content, category } = await getRequestData();
    const categoryCode = category || 'default';
    
    // 确保分类存在
    if (categoryCode !== 'default') {
      await env.DB.prepare(`
        INSERT OR IGNORE INTO categories (code, name) VALUES (?, ?)
      `).bind(categoryCode, categoryCode).run();
    }
    
    await env.DB.prepare(`
      UPDATE notes SET content = ?, category_code = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(content, categoryCode, id).run();
    
    return Response.json({ status: "OK" }, { headers: corsHeaders });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  }
}

// 处理笔记分类更新
export async function handleUpdateNoteCategory(request, env, corsHeaders, getRequestData) {
  try {
    const { id, category } = await getRequestData();
    const categoryCode = category || 'default';
    
    // 确保分类存在
    if (categoryCode !== 'default') {
      await env.DB.prepare(`
        INSERT OR IGNORE INTO categories (code, name) VALUES (?, ?)
      `).bind(categoryCode, categoryCode).run();
    }
    
    await env.DB.prepare(`
      UPDATE notes SET category_code = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(categoryCode, id).run();
    
    return Response.json({ status: "OK" }, { headers: corsHeaders });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  }
}

// 处理笔记列表获取
export async function handleGetNotes(request, env, corsHeaders, getRequestData) {
  try {
    const { page = 1, category } = await getRequestData();
    const limit = 10;
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

    return Response.json({
      data: results,
      total: countRes.total,
      page: page,
      limit: limit
    }, { headers: corsHeaders });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  }
}

// 处理笔记删除（支持批量）
export async function handleDeleteNotes(request, env, corsHeaders, getRequestData) {
  try {
    const { ids } = await getRequestData();
    const idArray = Array.isArray(ids) ? ids : [ids];
    const placeholders = idArray.map(() => '?').join(',');
    
    await env.DB.prepare(`DELETE FROM notes WHERE id IN (${placeholders})`).bind(...idArray).run();
    
    return Response.json({ 
      status: "Deleted", 
      count: idArray.length 
    }, { headers: corsHeaders });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  }
}