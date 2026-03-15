# 气泡消消乐 - 在线排行榜系统

## 服务器设置

### 安装依赖
```bash
npm install
```

### 启动服务器
```bash
npm start
```

服务器将在 http://localhost:3000 运行

### API 接口

#### 用户注册
- **POST** `/api/register`
- **参数**: `{ username, password }`
- **返回**: `{ success, message, error }`

#### 用户登录
- **POST** `/api/login`
- **参数**: `{ username, password }`
- **返回**: `{ success, token, user, error }`

#### 提交分数
- **POST** `/api/scores`
- **需要认证**: Bearer Token
- **参数**: `{ mode, score, level }`
- **返回**: `{ success, message, error }`

#### 获取排行榜（前50名）
- **GET** `/api/leaderboard?mode=timed|endless`
- **需要认证**: Bearer Token
- **返回**: `{ success, leaderboard: [{ rank, username, score, level, date }] }`

#### 获取自己的排名
- **GET** `/api/my-rank?mode=timed|endless`
- **需要认证**: Bearer Token
- **返回**: `{ success, myRank: { rank, username, score, level, date } }`

#### 获取用户信息
- **GET** `/api/user-info`
- **需要认证**: Bearer Token
- **返回**: `{ success, user: { id, username, created_at } }`

## 数据库

使用 SQLite 数据库，自动创建 `bubble_game.db` 文件

### 表结构

#### users 表
- id: 用户ID
- username: 用户名（唯一）
- password: 加密密码
- created_at: 创建时间

#### scores 表
- id: 分数ID
- user_id: 用户ID（外键）
- mode: 游戏模式（timed/endless）
- score: 分数
- level: 关卡数
- created_at: 创建时间

## 安全

- 密码使用 bcrypt 加密
- 使用 JWT Token 进行身份验证
- CORS 已启用，允许跨域请求

## 环境变量

- `PORT`: 服务器端口（默认 3000）
- `JWT_SECRET`: JWT 密钥（生产环境请修改）