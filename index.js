const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect('mongodb://localhost:27017/exerciseTracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}, (err) => {
  if (err) return console.error(err);
  console.log('Connected to MongoDB');
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
});

const Exercise = mongoose.model('Exercise', exerciseSchema);


app.post('/api/users', (req, res) => {
  const newUser = new User({ username: req.body.username });
  newUser.save((err, savedUser) => {
    if (err) return res.status(500).send(err);
    res.json({ username: savedUser.username, _id: savedUser._id });
  });
});


app.get('/api/users', (req, res) => {
  User.find({}, (err, users) => {
    if (err) return res.status(500).send(err);
    res.json(users.map(user => ({ username: user.username, _id: user._id })));
  });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  User.findById(userId, (err, user) => {
    if (err || !user) return res.status(404).send('User not found');

    const newExercise = new Exercise({
      userId,
      description,
      duration,
      date: date ? new Date(date) : new Date(),
    });

    newExercise.save((err, savedExercise) => {
      if (err) return res.status(500).send(err);
      res.json({
        username: user.username,
        description: savedExercise.description,
        duration: savedExercise.duration,
        date: savedExercise.date.toDateString(),
        _id: user._id,
      });
    });
  });
});

app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  User.findById(userId, (err, user) => {
    if (err || !user) return res.status(404).send('User not found');

    let filter = { userId };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    let query = Exercise.find(filter);
    if (limit) query = query.limit(parseInt(limit));

    query.exec((err, exercises) => {
      if (err) return res.status(500).send(err);

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
    });
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
