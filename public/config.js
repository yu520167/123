// 配置文件 - 用于区分本地和在线环境
const CONFIG = {
  // 本地开发环境
  local: {
    API_BASE_URL: 'http://localhost:3000/api',
    UPLOAD_BASE_URL: 'http://localhost:3000'
  },
  
  // 在线环境 - 需要替换为您的实际API地址
  production: {
    API_BASE_URL: 'https://your-api-domain.com/api',
    UPLOAD_BASE_URL: 'https://your-api-domain.com'
  }
};

// 自动检测环境
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const currentConfig = isLocal ? CONFIG.local : CONFIG.production;

// 导出配置
window.APP_CONFIG = currentConfig;
