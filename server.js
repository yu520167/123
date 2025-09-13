const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'banfei_secret_key_2024';

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/') // 上传文件保存目录
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制文件大小为5MB
  },
  fileFilter: function (req, file, cb) {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  }
});

// 数据库初始化
const db = new sqlite3.Database('banfei.db');

// 创建表
db.serialize(() => {
  // 用户表
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 班费记录表
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    handler TEXT,
    witness TEXT,
    image_path TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // 添加新字段（如果不存在）
  db.run(`ALTER TABLE transactions ADD COLUMN handler TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.log('添加handler字段:', err.message);
    }
  });
  
  db.run(`ALTER TABLE transactions ADD COLUMN witness TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.log('添加witness字段:', err.message);
    }
  });
  
  db.run(`ALTER TABLE transactions ADD COLUMN image_path TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.log('添加image_path字段:', err.message);
    }
  });

  // 创建默认管理员账户
  const adminPassword = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', ?, 'admin')`, [adminPassword]);
});

// 认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '需要登录' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '无效的令牌' });
    }
    req.user = user;
    next();
  });
};

// 管理员权限中间件
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
};

// API 路由

// 用户登录
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  });
});

// 用户注册
app.post('/api/register', authenticateToken, requireAdmin, (req, res) => {
  const { username, password, role = 'member' } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [username, hashedPassword, role], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: '用户名已存在' });
        }
        return res.status(500).json({ error: '注册失败' });
      }

      res.json({ message: '用户创建成功', userId: this.lastID });
    });
});

// 获取所有用户
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC', (err, users) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }
    res.json(users);
  });
});

// 删除用户
app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.id;

  // 不能删除自己
  if (parseInt(id) === currentUserId) {
    return res.status(400).json({ error: '不能删除自己的账户' });
  }

  // 检查用户是否存在
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 删除用户
    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: '删除用户失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '用户不存在' });
      }

      res.json({ message: '用户删除成功' });
    });
  });
});

// 添加班费记录
app.post('/api/transactions', authenticateToken, upload.single('image'), (req, res) => {
  const { type, amount, description, category, date, handler, witness } = req.body;
  let imagePath = null;

  // 如果有上传的图片，保存路径
  if (req.file) {
    imagePath = '/uploads/' + req.file.filename;
  }

  console.log('接收到的数据:', { type, amount, description, category, date, handler, witness, imagePath });

  if (!type || !amount || !description) {
    return res.status(400).json({ error: '请填写完整信息' });
  }

  if (type !== 'income' && type !== 'expense') {
    return res.status(400).json({ error: '类型必须是收入或支出' });
  }

  // 使用提供的日期或当前时间
  const transactionDate = date || new Date().toISOString();

  db.run('INSERT INTO transactions (type, amount, description, category, user_id, created_at, handler, witness, image_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [type, amount, description, category, req.user.id, transactionDate, handler, witness, imagePath], function(err) {
      if (err) {
        console.error('数据库错误:', err);
        return res.status(500).json({ error: '添加记录失败' });
      }

      res.json({ message: '记录添加成功', transactionId: this.lastID });
    });
});

// 获取班费记录
app.get('/api/transactions', authenticateToken, (req, res) => {
  const { page = 1, limit = 20, type, startDate, endDate } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT t.*, u.username 
    FROM transactions t 
    LEFT JOIN users u ON t.user_id = u.id 
    WHERE 1=1
  `;
  let params = [];

  if (type) {
    query += ' AND t.type = ?';
    params.push(type);
  }

  if (startDate) {
    query += ' AND DATE(t.created_at) >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND DATE(t.created_at) <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }

    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM transactions WHERE 1=1';
    let countParams = [];

    if (type) {
      countQuery += ' AND type = ?';
      countParams.push(type);
    }

    if (startDate) {
      countQuery += ' AND DATE(created_at) >= ?';
      countParams.push(startDate);
    }

    if (endDate) {
      countQuery += ' AND DATE(created_at) <= ?';
      countParams.push(endDate);
    }

    db.get(countQuery, countParams, (err, count) => {
      if (err) {
        return res.status(500).json({ error: '数据库错误' });
      }

      res.json({
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count.total,
          pages: Math.ceil(count.total / limit)
        }
      });
    });
  });
});

// 获取班费统计
app.get('/api/statistics', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;

  let query = 'SELECT type, SUM(amount) as total FROM transactions WHERE 1=1';
  let params = [];

  if (startDate) {
    query += ' AND DATE(created_at) >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND DATE(created_at) <= ?';
    params.push(endDate);
  }

  query += ' GROUP BY type';

  db.all(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: '数据库错误' });
    }

    const stats = {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0
    };

    results.forEach(row => {
      if (row.type === 'income') {
        stats.totalIncome = row.total;
      } else if (row.type === 'expense') {
        stats.totalExpense = row.total;
      }
    });

    stats.balance = stats.totalIncome - stats.totalExpense;

    res.json(stats);
  });
});

// 删除记录
app.delete('/api/transactions/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM transactions WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: '删除失败' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: '记录不存在' });
    }

    res.json({ message: '删除成功' });
  });
});

// 提供静态文件
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`班费管理系统服务器运行在 http://localhost:${PORT}`);
});
