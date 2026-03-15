const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = 'your-secret-key-change-in-production';

const db = new sqlite3.Database('./bubble_game.db', (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to SQLite database');
        initDatabase();
    }
});

function initDatabase() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            mode TEXT NOT NULL,
            score INTEGER NOT NULL,
            level INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        db.run(`CREATE INDEX IF NOT EXISTS idx_scores_mode ON scores(mode)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC)`);
    });
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password || username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: '用户名长度必须在3-20个字符之间' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: '密码长度至少6个字符' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, hashedPassword],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint')) {
                    return res.status(400).json({ error: '用户名已存在' });
                }
                return res.status(500).json({ error: '注册失败' });
            }
            res.json({ success: true, message: '注册成功' });
        }
    );
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        async (err, user) => {
            if (err) {
                return res.status(500).json({ error: '登录失败' });
            }

            if (!user) {
                return res.status(401).json({ error: '用户名或密码错误' });
            }

            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return res.status(401).json({ error: '用户名或密码错误' });
            }

            const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

            res.json({
                success: true,
                token,
                user: { id: user.id, username: user.username }
            });
        }
    );
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '未提供认证令牌' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: '无效的认证令牌' });
        }
        req.userId = decoded.userId;
        req.username = decoded.username;
        next();
    });
};

app.post('/api/scores', authenticateToken, (req, res) => {
    const { mode, score, level } = req.body;

    if (!mode || !score || score < 0) {
        return res.status(400).json({ error: '无效的分数数据' });
    }

    if (!['timed', 'endless'].includes(mode)) {
        return res.status(400).json({ error: '无效的游戏模式' });
    }

    db.serialize(() => {
        db.run(
            'DELETE FROM scores WHERE user_id = ? AND mode = ? AND score < ?',
            [req.userId, mode, score],
            function (err) {
                if (err) {
                    console.error('删除旧分数失败:', err);
                }
            }
        );

        db.get(
            'SELECT score FROM scores WHERE user_id = ? AND mode = ? ORDER BY score DESC LIMIT 1',
            [req.userId, mode],
            (err, row) => {
                if (err) {
                    console.error('查询最高分失败:', err);
                    return res.status(500).json({ error: '保存分数失败' });
                }

                if (!row || score > row.score) {
                    const createdAt = new Date().toISOString();
                    db.run(
                        'INSERT INTO scores (user_id, mode, score, level, created_at) VALUES (?, ?, ?, ?, ?)',
                        [req.userId, mode, score, level || 1, createdAt],
                        function (err) {
                            if (err) {
                                console.error('保存分数失败:', err);
                                return res.status(500).json({ error: '保存分数失败' });
                            }
                            console.log('分数保存成功:', { userId: req.userId, mode, score, level, createdAt });
                            res.json({ success: true, message: '分数保存成功' });
                        }
                    );
                } else {
                    console.log('分数未超过最高分，不保存:', { userId: req.userId, mode, score, currentMax: row.score });
                    res.json({ success: true, message: '分数未超过最高分' });
                }
            }
        );
    });
});

app.get('/api/leaderboard', authenticateToken, (req, res) => {
    const mode = req.query.mode || 'timed';

    if (!['timed', 'endless'].includes(mode)) {
        return res.status(400).json({ error: '无效的游戏模式' });
    }

    db.all(
        `SELECT s.*, u.username, 
                (SELECT COUNT(*) + 1 FROM scores s2 WHERE s2.mode = ? AND (
                    (s2.level > s.level) OR 
                    (s2.level = s.level AND s2.score > s.score)
                )) as rank
         FROM scores s
         JOIN users u ON s.user_id = u.id
         WHERE s.mode = ?
         ORDER BY s.level DESC, s.score DESC, s.created_at ASC
         LIMIT 50`,
        [mode, mode],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: '获取排行榜失败' });
            }

            const leaderboard = rows.map(row => {
                const date = new Date(row.created_at);
                return {
                    ...row,
                    created_at: date.getTime()
                };
            });

            res.json({ success: true, leaderboard });
        }
    );
});

app.get('/api/my-rank', authenticateToken, (req, res) => {
    const mode = req.query.mode || 'timed';

    if (!['timed', 'endless'].includes(mode)) {
        return res.status(400).json({ error: '无效的游戏模式' });
    }

    db.get(
        `SELECT s.*, u.username,
                (SELECT COUNT(*) + 1 FROM scores s2 WHERE s2.mode = ? AND (
                    (s2.level > s.level) OR 
                    (s2.level = s.level AND s2.score > s.score)
                )) as rank
         FROM scores s
         JOIN users u ON s.user_id = u.id
         WHERE s.mode = ? AND s.user_id = ?
         ORDER BY s.level DESC, s.score DESC
         LIMIT 1`,
        [mode, mode, req.userId],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: '获取排名失败' });
            }

            const myRank = row ? {
                ...row,
                created_at: new Date(row.created_at).getTime()
            } : null;

            res.json({ success: true, myRank });
        }
    );
});

app.get('/api/user-info', authenticateToken, (req, res) => {
    db.get(
        'SELECT id, username, created_at FROM users WHERE id = ?',
        [req.userId],
        (err, user) => {
            if (err) {
                return res.status(500).json({ error: '获取用户信息失败' });
            }
            res.json({ success: true, user });
        }
    );
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});