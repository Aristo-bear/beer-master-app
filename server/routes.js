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
        const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const breweryId = breweryName || 'default'; // In a real multi-tenant app, generate unique ID

        const stmt = db.prepare('INSERT INTO users (username, password, role, brewery_id) VALUES (?, ?, ?, ?)');
        const info = stmt.run(username, hashedPassword, role || 'admin', breweryId);

        // Create token
        const token = jwt.sign({ username, role: role || 'admin', breweryId }, SECRET_KEY);

        // Configure default data for new brewery if needed?
        // For now client initializes data

        res.json({ token, user: { username, role: role || 'admin', breweryId } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

router.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
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
router.get('/init/:breweryId', authenticateToken, (req, res) => {
    const { breweryId } = req.params;
    if (req.user.breweryId !== breweryId) return res.sendStatus(403);

    try {
        const inventory = db.prepare('SELECT * FROM inventory WHERE brewery_id = ?').all(breweryId);
        const recipes = db.prepare('SELECT * FROM recipes WHERE brewery_id = ?').all(breweryId).map(r => ({
            ...r,
            ingredients: JSON.parse(r.ingredients)
        }));
        const logs = db.prepare('SELECT * FROM logs WHERE brewery_id = ? ORDER BY index_num ASC').all(breweryId).map(l => ({
            ...l,
            data: JSON.parse(l.data),
            index: l.index_num // Remap for frontend compatibility
        }));
        const tasks = db.prepare('SELECT * FROM tasks WHERE brewery_id = ?').all(breweryId).map(t => ({
            ...t,
            completed: Boolean(t.completed),
            attachments: t.attachments ? JSON.parse(t.attachments) : undefined
        }));
        const scheduledBrews = db.prepare('SELECT * FROM scheduled_brews WHERE brewery_id = ?').all(breweryId);
        const workShifts = db.prepare('SELECT * FROM work_shifts WHERE brewery_id = ?').all(breweryId);
        const users = db.prepare('SELECT username, role FROM users WHERE brewery_id = ?').all(breweryId);

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
router.post('/inventory/batch', authenticateToken, (req, res) => {
    const { items } = req.body;
    const breweryId = req.user.breweryId;

    const insert = db.prepare(`
        INSERT OR REPLACE INTO inventory (id, name, category, quantity, unit, min_level, brewery_id)
        VALUES (@id, @name, @category, @quantity, @unit, @minLevel, @breweryId)
    `);

    const insertMany = db.transaction((items) => {
        for (const item of items) insert.run({ ...item, breweryId });
    });

    try {
        insertMany(items);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update inventory' });
    }
});

// Logs (Blockchain)
router.post('/logs', authenticateToken, (req, res) => {
    const { logs } = req.body; // Expecting array of logs or single log
    const breweryId = req.user.breweryId;

    const insert = db.prepare(`
        INSERT OR IGNORE INTO logs (index_num, timestamp, data, previous_hash, hash, brewery_id)
        VALUES (@index, @timestamp, @data, @previousHash, @hash, @breweryId)
    `);

    // We only want to append new logs. Since index is PK (with brewery_id), ignores duplicates.
    const insertMany = db.transaction((logs) => {
        for (const log of logs) {
            insert.run({
                index: log.index,
                timestamp: log.timestamp,
                data: JSON.stringify(log.data),
                previousHash: log.previousHash,
                hash: log.hash,
                breweryId
            });
        }
    });

    try {
        insertMany(Array.isArray(logs) ? logs : [logs]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to write logs' });
    }
});

// Generic batch updates (for simplicity in MVP)
router.post('/sync', authenticateToken, (req, res) => {
    const { recipes, tasks, scheduledBrews, workShifts } = req.body;
    const breweryId = req.user.breweryId;

    try {
        if (recipes) {
            const insertRecipe = db.prepare(`INSERT OR REPLACE INTO recipes (id, name, output_item_id, output_amount, ingredients, brewery_id) VALUES (@id, @name, @outputItemId, @outputAmount, @ingredients, @breweryId)`);
            const tx = db.transaction((items) => { items.forEach(i => insertRecipe.run({ ...i, ingredients: JSON.stringify(i.ingredients), breweryId })); });
            tx(recipes);
        }
        if (tasks) {
            const insertTask = db.prepare(`INSERT OR REPLACE INTO tasks (id, text, completed, priority, attachments, brewery_id) VALUES (@id, @text, @completed, @priority, @attachments, @breweryId)`);
            const tx = db.transaction((items) => { items.forEach(i => insertTask.run({ ...i, completed: i.completed ? 1 : 0, attachments: i.attachments ? JSON.stringify(i.attachments) : null, breweryId })); });
            tx(tasks);
        }
        if (scheduledBrews) {
            const insertBrew = db.prepare(`INSERT OR REPLACE INTO scheduled_brews (id, date, recipe_id, status, brewery_id) VALUES (@id, @date, @recipeId, @status, @breweryId)`);
            const tx = db.transaction((items) => { items.forEach(i => insertBrew.run({ ...i, breweryId })); });
            tx(scheduledBrews);
        }
        if (workShifts) {
            const insertShift = db.prepare(`INSERT OR REPLACE INTO work_shifts (id, date, username, type, brewery_id) VALUES (@id, @date, @username, @type, @breweryId)`);
            const tx = db.transaction((items) => { items.forEach(i => insertShift.run({ ...i, breweryId })); });
            tx(workShifts);
        }

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Sync failed' });
    }
});

// Delete endpoints
router.delete('/inventory/:id', authenticateToken, (req, res) => {
    db.prepare('DELETE FROM inventory WHERE id = ? AND brewery_id = ?').run(req.params.id, req.user.breweryId);
    res.json({ success: true });
});

router.delete('/recipes/:id', authenticateToken, (req, res) => {
    db.prepare('DELETE FROM recipes WHERE id = ? AND brewery_id = ?').run(req.params.id, req.user.breweryId);
    res.json({ success: true });
});

router.delete('/tasks/:id', authenticateToken, (req, res) => {
    db.prepare('DELETE FROM tasks WHERE id = ? AND brewery_id = ?').run(req.params.id, req.user.breweryId);
    res.json({ success: true });
});

router.delete('/schedule/:id', authenticateToken, (req, res) => {
    db.prepare('DELETE FROM scheduled_brews WHERE id = ? AND brewery_id = ?').run(req.params.id, req.user.breweryId);
    res.json({ success: true });
});

router.delete('/shifts/:id', authenticateToken, (req, res) => {
    db.prepare('DELETE FROM work_shifts WHERE id = ? AND brewery_id = ?').run(req.params.id, req.user.breweryId);
    res.json({ success: true });
});

router.delete('/users/:username', authenticateToken, (req, res) => {
    const { username } = req.params;
    // Prevent deleting self? Frontend handles it, but backend could too.
    if (req.user.username === username) return res.status(400).json({ error: 'Cannot delete yourself' });

    db.prepare('DELETE FROM users WHERE username = ? AND brewery_id = ?').run(username, req.user.breweryId);
    res.json({ success: true });
});

module.exports = router;
