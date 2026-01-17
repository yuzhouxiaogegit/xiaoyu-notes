/**
 * 小宇笔记 - 分类API处理
 * 作者：宇宙小哥
 */

// 处理分类创建
export async function handleCreateCategory(request, env, corsHeaders, getRequestData) {
  try {
    const { name } = await getRequestData();
    const code = name.toLowerCase().replace(/\s+/g, '_');
    
    await env.DB.prepare(`
      INSERT INTO categories (code, name) VALUES (?, ?)
    `).bind(code, name).run();
    
    return Response.json({ status: "OK", code: code }, { headers: corsHeaders });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  }
}

// 处理分类更新
export async function handleUpdateCategory(request, env, corsHeaders, getRequestData) {
  try {
    const { code, name } = await getRequestData();
    
    await env.DB.prepare(`
      UPDATE categories SET name = ? WHERE code = ?
    `).bind(name, code).run();
    
    return Response.json({ status: "OK" }, { headers: corsHeaders });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  }
}

// 处理分类删除
export async function handleDeleteCategory(request, env, corsHeaders, getRequestData) {
  try {
    const { code } = await getRequestData();
    
    // 检查是否有笔记使用此分类
    const noteCount = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM notes WHERE category_code = ? AND is_share_copy = 0
    `).bind(code).first();
    
    if (noteCount.count > 0) {
      return Response.json({ 
        error: "该分类下有笔记，无法删除", 
        count: noteCount.count 
      }, { status: 400, headers: corsHeaders });
    }
    
    await env.DB.prepare(`DELETE FROM categories WHERE code = ?`).bind(code).run();
    
    return Response.json({ status: "OK" }, { headers: corsHeaders });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  }
}

// 处理分类列表获取
export async function handleGetCategories(request, env, corsHeaders) {
  try {
    const { results } = await env.DB.prepare(`
      SELECT * FROM categories ORDER BY created_at DESC
    `).all();
    
    return Response.json({ categories: results }, { headers: corsHeaders });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  }
}

// 处理分类统计获取
export async function handleGetCategoryStats(request, env, corsHeaders) {
  try {
    const { results } = await env.DB.prepare(`
      SELECT c.code, c.name, COUNT(n.id) as count 
      FROM categories c 
      LEFT JOIN notes n ON c.code = n.category_code AND n.is_share_copy = 0
      GROUP BY c.code, c.name
      ORDER BY c.created_at DESC
    `).all();
    
    return Response.json({ categories: results }, { headers: corsHeaders });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  }
}