/**
 * 小宇笔记 - 分享API处理
 * 作者：宇宙小哥
 */

// 处理分享链接创建
export async function handleCreateShare(request, env, corsHeaders, getRequestData) {
  try {
    const { content, viewLimit = -1 } = await getRequestData();
    
    const result = await env.DB.prepare(`
      INSERT INTO notes (content, category_code, is_share_copy, view_limit, view_count) 
      VALUES (?, 'share', 1, ?, 0)
    `).bind(content, viewLimit).run();
    
    const shareId = result.meta.last_row_id;
    const shareUrl = `${new URL(request.url).origin}?share=${shareId}`;
    
    return Response.json({ 
      status: "OK", 
      shareUrl: shareUrl,
      shareId: shareId
    }, { headers: corsHeaders });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  }
}

// 处理分享内容获取
export async function handleGetShare(request, env, corsHeaders, getRequestData) {
  try {
    const { shareId } = await getRequestData();
    
    const note = await env.DB.prepare(`
      SELECT * FROM notes WHERE id = ? AND is_share_copy = 1
    `).bind(shareId).first();
    
    if (!note) {
      return Response.json({ error: "分享链接不存在或已失效" }, { status: 404, headers: corsHeaders });
    }
    
    // 检查访问次数限制
    if (note.view_limit > 0 && note.view_count >= note.view_limit) {
      // 删除已达到访问限制的分享
      await env.DB.prepare(`DELETE FROM notes WHERE id = ?`).bind(shareId).run();
      return Response.json({ error: "分享链接已达到访问次数限制" }, { status: 410, headers: corsHeaders });
    }
    
    // 增加访问次数
    const newViewCount = note.view_count + 1;
    const isLastView = note.view_limit > 0 && newViewCount >= note.view_limit;
    
    await env.DB.prepare(`
      UPDATE notes SET view_count = ? WHERE id = ?
    `).bind(newViewCount, shareId).run();
    
    // 如果是最后一次查看，标记删除
    if (isLastView) {
      await env.DB.prepare(`DELETE FROM notes WHERE id = ?`).bind(shareId).run();
    }
    
    return Response.json({
      content: note.content,
      view_count: newViewCount,
      view_limit: note.view_limit,
      is_last_view: isLastView
    }, { headers: corsHeaders });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  }
}