# Vercel 部署指南

## 步骤一：注册Vercel账户

1. 访问 https://vercel.com
2. 点击 "Sign Up" 注册账户
3. 选择 "Continue with GitHub" 使用GitHub账户登录

## 步骤二：导入项目

1. 登录Vercel后，点击 "New Project"
2. 在 "Import Git Repository" 中找到您的仓库 `yu520167/123`
3. 点击 "Import" 导入项目

## 步骤三：配置项目设置

在项目配置页面：

### 基本设置
- **Project Name**: `banfei-management` (或您喜欢的名称)
- **Framework Preset**: 选择 "Other" 或 "Static Site"

### 构建设置
- **Build Command**: `npm run vercel-build`
- **Output Directory**: `public`
- **Install Command**: `npm install`

### 环境变量（如果需要）
- 暂时不需要设置环境变量

## 步骤四：部署

1. 点击 "Deploy" 按钮
2. 等待部署完成（通常需要1-2分钟）
3. 部署成功后，您会得到一个类似这样的URL：
   `https://banfei-management-xxx.vercel.app`

## 步骤五：配置自定义域名（可选）

1. 在Vercel项目页面，点击 "Settings"
2. 选择 "Domains"
3. 添加您的自定义域名

## 重要说明

### 当前限制
由于Vercel主要支持静态网站，您的班费管理系统目前只能部署前端部分。后端API需要单独部署。

### 后端API部署选项
1. **Railway** (推荐)
   - 访问 https://railway.app
   - 连接GitHub仓库
   - 自动部署Node.js应用

2. **Render**
   - 访问 https://render.com
   - 创建Web Service
   - 连接GitHub仓库

3. **Heroku**
   - 访问 https://heroku.com
   - 创建新应用
   - 连接GitHub仓库

### 完整部署流程
1. 先在Vercel部署前端
2. 再在Railway/Render部署后端API
3. 更新 `public/config.js` 中的API地址
4. 重新部署前端

## 部署后访问

部署完成后，您可以通过以下方式访问：
- Vercel提供的默认域名
- 您配置的自定义域名

## 更新代码

每次您推送代码到GitHub的main分支时，Vercel会自动重新部署您的网站。

## 技术支持

如果遇到问题，可以：
1. 查看Vercel的部署日志
2. 检查GitHub仓库的代码
3. 参考Vercel官方文档
