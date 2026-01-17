/**
 * 小宇笔记 - 验证码生成工具
 * 作者：宇宙小哥
 */

// 生成验证码
export function generateCaptcha() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 生成验证码SVG图片
export function generateCaptchaSVG(code) {
  const width = 160;
  const height = 50;
  
  // 颜色数组
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
      ${lines}
      ${dots}
      ${chars_svg}
    </svg>
  `;
  
  return svg;
}

// 验证码token生成
export function generateCaptchaToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}