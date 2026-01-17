/**
 * 路由管理器 - 高复用的路由处理
 */

export class RouteManager {
  constructor() {
    this.routes = new Map();
  }

  // 注册路由
  register(method, path, handler) {
    const key = `${method}:${path}`;
    this.routes.set(key, handler);
    return this;
  }

  // 批量注册路由
  registerBatch(routeConfig) {
    Object.entries(routeConfig).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, handler]) => {
        this.register(method, path, handler);
      });
    });
    return this;
  }

  // 路由匹配和执行
  async handle(request, env, corsHeaders) {
    const url = new URL(request.url);
    const key = `${request.method}:${url.pathname}`;
    
    const handler = this.routes.get(key);
    if (!handler) {
      return new Response("Not Found", { status: 404, headers: corsHeaders });
    }

    try {
      return await handler(request, env, corsHeaders, url);
    } catch (error) {
      return Response.json({ 
        error: "Server Error", 
        message: error.message 
      }, { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }

  // 获取所有注册的路由
  getRoutes() {
    return Array.from(this.routes.keys());
  }
}