const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'bubble_game.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run('DELETE FROM scores', (err) => {
        if (err) {
            console.error('删除分数记录失败:', err);
            process.exit(1);
        }
        console.log('已清除所有分数记录');
        
        db.get('SELECT COUNT(*) as count FROM scores', (err, row) => {
            if (err) {
                console.error('查询记录数失败:', err);
            } else {
                console.log('当前分数记录数:', row.count);
            }
            db.close();
        });
    });
});