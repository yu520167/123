# 班费管理系统 - 部署指南

## 部署方式

### 方式一：GitHub Pages（推荐 - 免费）

1. **启用GitHub Pages**
   - 进入您的GitHub仓库：https://github.com/yu520167/123
   - 点击 "Settings" 标签
   - 滚动到 "Pages" 部分
   - 在 "Source" 下选择 "GitHub Actions"
   - 保存设置

2. **自动部署**
   - 每次推送到main分支时，GitHub Actions会自动构建和部署
   - 部署完成后，您的网站将在以下地址可用：
     `https://yu520167.github.io/123`

### 方式二：Vercel（推荐 - 免费）

1. **注册Vercel账户**
   - 访问 https://vercel.com
   - 使用GitHub账户登录

2. **导入项目**
   - 点击 "New Project"
   - 选择您的GitHub仓库 `yu520167/123`
   - 点击 "Import"

3. **配置部署**
   - Framework Preset: 选择 "Other"
   - Build Command: `npm run build`
   - Output Directory: `public`
   - 点击 "Deploy"

### 方式三：Netlify（推荐 - 免费）

1. **注册Netlify账户**
   - 访问 https://netlify.com
   - 使用GitHub账户登录

2. **导入项目**
   - 点击 "New site from Git"
   - 选择您的GitHub仓库
   - 配置构建设置：
     - Build command: `npm run build`
     - Publish directory: `public`

## 后端API部署

由于前端是静态文件，您还需要部署后端API。推荐使用：

### 1. Railway（免费额度）
- 访问 https://railway.app
- 连接GitHub仓库
- 自动部署Node.js应用

### 2. Render（免费额度）
- 访问 https://render.com
- 创建新的Web Service
- 连接GitHub仓库

### 3. Heroku（需要信用卡验证）
- 访问 https://heroku.com
- 创建新应用
- 连接GitHub仓库

## 配置说明

部署完成后，需要更新 `public/config.js` 文件中的API地址：

```javascript
production: {
  API_BASE_URL: 'https://your-api-domain.com/api',
  UPLOAD_BASE_URL: 'https://your-api-domain.com'
}
```

## 注意事项

1. **数据库**：在线部署时，SQLite数据库文件会重置，需要重新创建用户
2. **文件上传**：需要配置持久化存储（如AWS S3、Cloudinary等）
3. **HTTPS**：确保API和前端都使用HTTPS协议
4. **CORS**：确保后端API允许前端域名的跨域请求

## 快速开始

最简单的部署方式：

1. 启用GitHub Pages（方式一）
2. 使用Railway部署后端API
3. 更新config.js中的API地址
4. 推送代码到GitHub

您的网站就可以在线访问了！
