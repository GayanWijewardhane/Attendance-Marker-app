const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance';
let db;

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db();
  console.log('[OK] Connected to MongoDB');

  // Create index for faster queries
  await db.collection('attendance').createIndex({ date: -1 });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============ API ROUTES ============

// GET all attendance records (with optional filters)
app.get('/api/tasks', async (req, res) => {
  try {
    const { date, status, assigned_by } = req.query;
    const filter = {};

    if (date) filter.date = date;
    if (status) filter.status = status;
    if (assigned_by) filter.assigned_by = { $regex: assigned_by, $options: 'i' };

    const records = await db.collection('attendance')
      .find(filter)
      .sort({ date: -1, created_at: -1 })
      .toArray();

    // Map _id to id for frontend compatibility
    const result = records.map(r => ({ ...r, id: r._id.toString() }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load records' });
  }
});

// GET single record
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const record = await db.collection('attendance').findOne({ _id: new ObjectId(req.params.id) });
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json({ ...record, id: record._id.toString() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load record' });
  }
});

// POST create attendance record
app.post('/api/tasks', async (req, res) => {
  try {
    const { date, task, assigned_by, status, notes } = req.body;

    if (!date || !task || !assigned_by || !status) {
      return res.status(400).json({ error: 'Date, Task, Assigned By, and Status are mandatory' });
    }

    if (!['Present', 'Absent', 'Holiday'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Present, Absent, or Holiday' });
    }

    const now = new Date().toISOString();
    const doc = { date, task, assigned_by, status, notes: notes || '', created_at: now, updated_at: now };

    const result = await db.collection('attendance').insertOne(doc);
    res.status(201).json({ ...doc, id: result.insertedId.toString(), _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create record' });
  }
});

// PUT update attendance record
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { date, task, assigned_by, status, notes } = req.body;

    if (!date || !task || !assigned_by || !status) {
      return res.status(400).json({ error: 'Date, Task, Assigned By, and Status are mandatory' });
    }

    if (!['Present', 'Absent', 'Holiday'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Present, Absent, or Holiday' });
    }

    const update = {
      $set: { date, task, assigned_by, status, notes: notes || '', updated_at: new Date().toISOString() }
    };

    const result = await db.collection('attendance').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      update,
      { returnDocument: 'after' }
    );

    if (!result) return res.status(404).json({ error: 'Record not found' });
    res.json({ ...result, id: result._id.toString() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update record' });
  }
});

// DELETE attendance record
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const result = await db.collection('attendance').deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

// GET sync status
app.get('/api/sync', async (req, res) => {
  try {
    const latest = await db.collection('attendance')
      .find().sort({ updated_at: -1 }).limit(1).toArray();
    const count = await db.collection('attendance').countDocuments();
    res.json({
      last_update: latest.length > 0 ? latest[0].updated_at : null,
      total: count
    });
  } catch (err) {
    res.json({ last_update: null, total: 0 });
  }
});

// ============ START ============
async function start() {
  await connectDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('==============================================');
    console.log('  ATTENDANCE MARKER - Network Engineer');
    console.log('==============================================');
    console.log(`  Running on port ${PORT}`);
    console.log('==============================================');
    console.log('');
  });
}

start().catch(err => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
