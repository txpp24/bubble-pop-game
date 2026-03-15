# 气泡消消乐 (Bubble Pop Game)

一个有趣的Web气泡消除游戏，支持关卡挑战和无限模式，具有完整的用户系统和在线排行榜。

![Game Preview](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-14%2B-green.svg)
![License](https://img.shields.io/badge/license-MIT-yellow.svg)

## 功能特点

### 游戏模式
- **关卡挑战模式**：无限关卡设计，难度随关卡递增，在限定时间内消除指定数量的气泡
- **无限模式**：无时间限制，自由挑战，支持全屏炸弹道具

### 核心功能
- **消除机制**：点击气泡消除，支持连击系统和同色相邻气泡消除
- **道具系统**：
  - ⏰ 增加时间道具：+10秒
  - ⚡ 减少时间道具：-5秒
  - ✨ 双倍分数道具：10秒内双倍得分
  - ❄️ 冻结气泡道具：3秒内气泡停止移动
  - 💥 全屏炸弹道具：消除所有气泡（仅无限模式）
- **用户系统**：支持用户注册、登录、游客模式
- **在线排行榜**：支持关卡挑战和无限模式排行榜
- **音效系统**：消除、连击、道具、倒计时等音效

### 技术特点
- **响应式设计**：完美适配PC、平板、手机等多种设备
- **流畅动画**：使用requestAnimationFrame实现流畅的游戏动画
- **前后端分离**：前端采用单页应用模式，后端提供RESTful API
- **安全认证**：使用JWT进行身份验证，密码加密存储

## 技术栈

### 前端
- HTML5
- CSS3
- JavaScript (ES6+)

### 后端
- Node.js
- Express.js
- SQLite
- JWT (jsonwebtoken)
- bcryptjs

## 快速开始

### 环境要求
- Node.js 14.0 或更高版本
- npm 或 yarn

### 安装步骤

1. 克隆项目
```bash
git clone https://github.com/yourusername/bubble-pop-game.git
cd bubble-pop-game
```

2. 安装依赖
```bash
npm install
```

3. 启动服务器
```bash
npm start
```

4. 访问游戏
在浏览器中打开 `http://localhost:3000`

### 开发模式
```bash
npm run dev
```

## 游戏玩法

### 基础玩法
- 点击气泡即可消除
- 点击同色相邻气泡可一次消除多个
- 消除越多分数越高
- 连续消除可获得连击加成

### 关卡挑战模式
- 在限定时间内消除指定数量的气泡
- 每通过一关难度自动提升
- 气泡数量增加、移动速度加快

### 无限模式
- 无时间限制，自由挑战
- 消除气泡累积分数
- 可以使用全屏炸弹道具

## 项目结构

```
bubble-pop-game/
├── start.html          # 首页
├── game.html           # 游戏页面
├── login.html          # 登录页面
├── leaderboard.html    # 排行榜页面
├── result.html         # 结果页面
├── game.js             # 游戏逻辑
├── style.css           # 样式文件
├── server.js           # 后端服务器
├── package.json        # 项目配置
└── bubble_game.db      # SQLite数据库
```

## API接口

### 用户相关
- `POST /api/register` - 用户注册
- `POST /api/login` - 用户登录
- `GET /api/user` - 获取用户信息

### 游戏成绩
- `POST /api/score` - 提交游戏成绩
- `GET /api/leaderboard/:mode` - 获取排行榜

## 部署

### 本地部署
按照"快速开始"部分的步骤即可在本地运行

### 服务器部署
1. 准备云服务器（如阿里云、腾讯云、AWS等）
2. 安装Node.js环境
3. 上传项目代码到服务器
4. 安装依赖：`npm install`
5. 启动服务器：`npm start`
6. 配置域名和SSL证书（可选）

### 使用PM2管理进程（推荐）
```bash
npm install -g pm2
pm2 start server.js --name bubble-game
pm2 save
pm2 startup
```

## 浏览器支持

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT License

## 联系方式

如有问题或建议，欢迎通过以下方式联系：
- 提交Issue
- 发送邮件

---

**享受游戏乐趣！🎮**
