/**
 * 小宇笔记 - AI功能API处理
 * 作者：宇宙小哥
 */

// 处理AI智能总结
export async function handleAISummary(request, env, corsHeaders, getRequestData) {
  try {
    const { text } = await getRequestData();
    
    const aiRes = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: '你是一个笔记摘要助手，请用简洁的中文总结用户输入的内容。' },
        { role: 'user', content: text.slice(0, 2000) }
      ]
    });
    
    return Response.json({ 
      summary: aiRes.response 
    }, { headers: corsHeaders });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  }
}