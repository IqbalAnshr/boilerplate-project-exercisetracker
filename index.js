const express = require('express');
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;


app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static('public'));


const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;


client.connect()
  .then(() => {
    db = client.db('exerciseTracker');
    console.log("Connected to MongoDB");
  })
  .catch(err => console.error("Failed to connect to MongoDB", err));

app.post('/api/users', async (req, res) => {
  try {
    const newUser = { username: req.body.username };
    const result = await db.collection('users').insertOne(newUser);
    res.json({ username: newUser.username, _id: result.insertedId });
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.get('/api/users', async (req, res) => {
  try {
    const users = await db.collection('users').find().toArray();
    res.json(users.map(user => ({ username: user.username, _id: user._id })));
  } catch (err) {
    res.status(500).send(err);
  }
});

// Add exercise for a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const userId = req.params._id;
    const { description, duration, date } = req.body;
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(404).send('User not found');

    const newExercise = {
      userId: new ObjectId(userId),
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date(),
    };
    await db.collection('exercises').insertOne(newExercise);
    res.json({
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString(),
      _id: user._id,
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

// Get exercise logs of a user
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userId = req.params._id;
    const { from, to, limit } = req.query;

    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(404).send('User not found');

    let filter = { userId: new ObjectId(userId) };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    let query = db.collection('exercises').find(filter);
    if (limit) query = query.limit(parseInt(limit));

    const exercises = await query.toArray();
    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map(exercise => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString(),
      })),
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
