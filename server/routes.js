const express = require('express');
const router = express.Router();
const { db } = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-key-change-this';

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- Auth Routes ---
router.get('/health', (req, res) => res.json({ status: 'ok' }));

router.post('/auth/register', async (req, res) => {
    const { username, password, role, breweryName } = req.body;

    try {
        const existingUser = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const breweryId = breweryName || 'default';

        await db.run('INSERT INTO users (username, password, role, brewery_id) VALUES (?, ?, ?, ?)', [username, hashedPassword, role || 'admin', breweryId]);

        // Create token
        const token = jwt.sign({ username, role: role || 'admin', breweryId }, SECRET_KEY);

        res.json({ token, user: { username, role: role || 'admin', breweryId } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

router.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        if (await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ username: user.username, role: user.role, breweryId: user.brewery_id }, SECRET_KEY);
            res.json({ token, user: { username: user.username, role: user.role, breweryId: user.brewery_id } });
        } else {
            res.status(403).json({ error: 'Invalid password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// --- Data Routes (Protected) ---

// Init Data (Fetch all)
router.get('/init/:breweryId', authenticateToken, async (req, res) => {
    const { breweryId } = req.params;
    if (req.user.breweryId !== breweryId) return res.sendStatus(403);

    try {
        const inventory = await db.all('SELECT * FROM inventory WHERE brewery_id = ?', [breweryId]);

        let recipes = await db.all('SELECT * FROM recipes WHERE brewery_id = ?', [breweryId]);
        recipes = recipes.map(r => ({ ...r, ingredients: JSON.parse(r.ingredients) }));

        let logs = await db.all('SELECT * FROM logs WHERE brewery_id = ? ORDER BY index_num ASC', [breweryId]);
        logs = logs.map(l => ({ ...l, data: JSON.parse(l.data), index: l.index_num }));

        let tasks = await db.all('SELECT * FROM tasks WHERE brewery_id = ?', [breweryId]);
        tasks = tasks.map(t => ({ ...t, completed: Boolean(t.completed), attachments: t.attachments ? JSON.parse(t.attachments) : undefined }));

        const scheduledBrews = await db.all('SELECT * FROM scheduled_brews WHERE brewery_id = ?', [breweryId]);
        const workShifts = await db.all('SELECT * FROM work_shifts WHERE brewery_id = ?', [breweryId]);
        const users = await db.all('SELECT username, role, brewery_id FROM users WHERE brewery_id = ?', [breweryId]);

        res.json({
            inventory,
            recipes,
            logs,
            tasks,
            scheduledBrews,
            workShifts,
            users
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch initial data' });
    }
});

// Inventory
router.post('/inventory/batch', authenticateToken, async (req, res) => {
    const { items } = req.body;
    const breweryId = req.user.breweryId;

    try {
        await db.transaction(async (tx) => {
            for (const item of items) {
                await tx.run(
                    'INSERT OR REPLACE INTO inventory (id, name, category, quantity, unit, min_level, brewery_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [item.id, item.name, item.category, item.quantity, item.unit, item.minLevel, breweryId]
                );
            }
        });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update inventory' });
    }
});

// Logs (Blockchain)
router.post('/logs', authenticateToken, async (req, res) => {
    const { logs } = req.body;
    const breweryId = req.user.breweryId;
    const logsArray = Array.isArray(logs) ? logs : [logs];

    try {
        await db.transaction(async (tx) => {
            for (const log of logsArray) {
                // SQLite: INSERT OR IGNORE, Postgres: ON CONFLICT DO NOTHING
                // Adapter could abstract this, or we use a more generic SQL if possible
                // "INSERT OR IGNORE" is SQLite specific. Postgres uses "ON CONFLICT DO NOTHING"
                // Let's standardise on "INSERT INTO ... ON CONFLICT (index_num, brewery_id) DO NOTHING"
                // But SQLite needs "INSERT OR IGNORE" or "ON CONFLICT" support (check version, better-sqlite3 usually supports ON CONFLICT)
                // Actually, standard SQL is "INSERT INTO ... VALUES ... ON CONFLICT DO NOTHING"

                // Let's try to detect DB type or use a raw try-catch for duplicates
                // Or better, update adapter to handle upsert/ignore?

                // For now, let's assume we can query check or just use specific SQL based on checking db.type (not cleanly exposed to router)
                // Let's just use INSERT and catch error? No, batch/transaction handles errors by rolling back.

                // Simpler: Use INSERT and specify ON CONFLICT DO NOTHING which works in PG and modern SQLite (3.24+)
                // better-sqlite3 bundles recent SQLite.

                await tx.run(`
                    INSERT INTO logs (index_num, timestamp, data, previous_hash, hash, brewery_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(index_num, brewery_id) DO NOTHING
                `, [log.index, log.timestamp, JSON.stringify(log.data), log.previousHash, log.hash, breweryId]);
            }
        });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to write logs' });
    }
});

// Generic batch updates
router.post('/sync', authenticateToken, async (req, res) => {
    const { recipes, tasks, scheduledBrews, workShifts } = req.body;
    const breweryId = req.user.breweryId;

    try {
        await db.transaction(async (tx) => {
            if (recipes) {
                for (const item of recipes) {
                    await tx.run(
                        'INSERT OR REPLACE INTO recipes (id, name, output_item_id, output_amount, ingredients, brewery_id) VALUES (?, ?, ?, ?, ?, ?)',
                        [item.id, item.name, item.outputItemId, item.outputAmount, JSON.stringify(item.ingredients), breweryId]
                    );
                }
            }
            if (tasks) {
                for (const item of tasks) {
                    await tx.run(
                        'INSERT OR REPLACE INTO tasks (id, text, completed, priority, attachments, brewery_id) VALUES (?, ?, ?, ?, ?, ?)',
                        [item.id, item.text, item.completed ? 1 : 0, item.priority, item.attachments ? JSON.stringify(item.attachments) : null, breweryId]
                    );
                }
            }
            if (scheduledBrews) {
                for (const item of scheduledBrews) {
                    await tx.run(
                        'INSERT OR REPLACE INTO scheduled_brews (id, date, recipe_id, status, brewery_id) VALUES (?, ?, ?, ?, ?)',
                        [item.id, item.date, item.recipeId, item.status, breweryId]
                    );
                }
            }
            if (workShifts) {
                for (const item of workShifts) {
                    await tx.run(
                        'INSERT OR REPLACE INTO work_shifts (id, date, username, type, brewery_id) VALUES (?, ?, ?, ?, ?)',
                        [item.id, item.date, item.username, item.type, breweryId]
                    );
                }
            }
        });

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Sync failed' });
    }
});

// Delete endpoints
router.delete('/inventory/:id', authenticateToken, async (req, res) => {
    await db.run('DELETE FROM inventory WHERE id = ? AND brewery_id = ?', [req.params.id, req.user.breweryId]);
    res.json({ success: true });
});

router.delete('/recipes/:id', authenticateToken, async (req, res) => {
    await db.run('DELETE FROM recipes WHERE id = ? AND brewery_id = ?', [req.params.id, req.user.breweryId]);
    res.json({ success: true });
});

router.delete('/tasks/:id', authenticateToken, async (req, res) => {
    await db.run('DELETE FROM tasks WHERE id = ? AND brewery_id = ?', [req.params.id, req.user.breweryId]);
    res.json({ success: true });
});

router.delete('/schedule/:id', authenticateToken, async (req, res) => {
    await db.run('DELETE FROM scheduled_brews WHERE id = ? AND brewery_id = ?', [req.params.id, req.user.breweryId]);
    res.json({ success: true });
});

router.delete('/shifts/:id', authenticateToken, async (req, res) => {
    await db.run('DELETE FROM work_shifts WHERE id = ? AND brewery_id = ?', [req.params.id, req.user.breweryId]);
    res.json({ success: true });
});

router.delete('/users/:username', authenticateToken, async (req, res) => {
    const { username } = req.params;
    if (req.user.username === username) return res.status(400).json({ error: 'Cannot delete yourself' });

    await db.run('DELETE FROM users WHERE username = ? AND brewery_id = ?', [username, req.user.breweryId]);
    res.json({ success: true });
});

module.exports = router;
