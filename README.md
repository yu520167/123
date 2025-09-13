# 班费管理系统

一个现代化的班级财务管理平台，帮助班级管理员轻松管理班费收支。

## 功能特性

### 🔐 用户管理
- 用户登录/注册系统
- 角色权限管理（管理员/普通成员）
- 安全的密码加密存储

### 💰 班费管理
- 收入/支出记录
- 分类管理
- 详细描述和备注
- 实时余额计算

### 📊 数据统计
- 收支统计图表
- 时间范围筛选
- 详细报表生成
- 数据导出功能

### 🎨 现代化界面
- 响应式设计，支持移动端
- 美观的渐变色彩搭配
- 直观的操作界面
- 流畅的动画效果

## 技术栈

### 后端
- **Node.js** - 服务器运行环境
- **Express.js** - Web应用框架
- **SQLite** - 轻量级数据库
- **JWT** - 用户认证
- **bcryptjs** - 密码加密

### 前端
- **原生JavaScript** - 无框架依赖
- **CSS3** - 现代化样式
- **Font Awesome** - 图标库
- **响应式设计** - 移动端适配

## 快速开始

### 环境要求
- Node.js 14.0 或更高版本
- npm 或 yarn 包管理器

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/您的用户名/banfei-management.git
   cd banfei-management
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动服务器**
   ```bash
   npm start
   ```

4. **访问应用**
   打开浏览器访问：http://localhost:3000

### 默认账户
- **管理员账户**：admin / admin123
- 首次登录后建议修改默认密码

## 使用指南

### 管理员功能
1. **用户管理**
   - 创建新用户账户
   - 设置用户角色权限
   - 管理用户列表

2. **班费记录**
   - 添加收入/支出记录
   - 编辑记录详情
   - 删除错误记录

3. **数据统计**
   - 查看收支统计
   - 生成时间范围报表
   - 导出数据

### 普通成员功能
1. **查看记录**
   - 浏览所有班费记录
   - 按类型和时间筛选
   - 查看统计信息

2. **添加记录**
   - 记录班费收支
   - 添加详细描述
   - 选择分类标签

## 项目结构

```
banfei/
├── server.js              # 服务器主文件
├── package.json           # 项目配置
├── banfei.db             # SQLite数据库文件
├── public/               # 前端文件
│   ├── index.html        # 主页面
│   ├── styles.css        # 样式文件
│   └── app.js           # 前端逻辑
└── README.md            # 项目说明
```

## API 接口

### 认证接口
- `POST /api/login` - 用户登录
- `POST /api/register` - 用户注册（管理员）

### 用户管理
- `GET /api/users` - 获取用户列表（管理员）
- `DELETE /api/users/:id` - 删除用户（管理员）

### 班费记录
- `GET /api/transactions` - 获取记录列表
- `POST /api/transactions` - 添加新记录
- `DELETE /api/transactions/:id` - 删除记录

### 统计数据
- `GET /api/statistics` - 获取收支统计

## 数据库设计

### 用户表 (users)
- `id` - 主键
- `username` - 用户名（唯一）
- `password` - 加密密码
- `role` - 用户角色
- `created_at` - 创建时间

### 记录表 (transactions)
- `id` - 主键
- `type` - 类型（income/expense）
- `amount` - 金额
- `description` - 描述
- `category` - 分类
- `user_id` - 操作用户ID
- `created_at` - 创建时间

## 部署说明

### 生产环境部署

1. **环境变量配置**
   ```bash
   export NODE_ENV=production
   export PORT=3000
   export JWT_SECRET=your_secret_key
   ```

2. **使用PM2管理进程**
   ```bash
   npm install -g pm2
   pm2 start server.js --name banfei
   pm2 startup
   pm2 save
   ```

3. **Nginx反向代理**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## 安全注意事项

1. **修改默认密码**
   - 首次部署后立即修改管理员密码
   - 使用强密码策略

2. **JWT密钥**
   - 生产环境使用复杂的JWT密钥
   - 定期更换密钥

3. **数据库安全**
   - 定期备份数据库文件
   - 限制数据库访问权限

4. **HTTPS部署**
   - 生产环境建议使用HTTPS
   - 配置SSL证书

## 常见问题

### Q: 如何重置管理员密码？
A: 可以通过数据库直接修改，或者重新初始化数据库。

### Q: 支持数据导出吗？
A: 当前版本支持查看统计，数据导出功能可以后续添加。

### Q: 如何备份数据？
A: 直接复制 `banfei.db` 文件即可完成备份。

### Q: 支持多班级管理吗？
A: 当前版本为单班级设计，多班级功能可以后续扩展。

## 开发计划

- [ ] 数据导出功能
- [ ] 多班级支持
- [ ] 移动端APP
- [ ] 微信小程序
- [ ] 邮件通知功能
- [ ] 数据可视化图表

## 贡献指南

欢迎提交Issue和Pull Request来改进这个项目！

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过以下方式联系：
- 提交Issue
- 发送邮件

---

**班费管理系统** - 让班级财务管理更简单！

