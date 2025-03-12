require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const eventRoutes = require('./routes/eventRoutes');
const Company = require('./models/Company');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client'))); // Serve static files
app.use('/admin', express.static(path.join(__dirname, '../client/admin'))); // Serve admin files

// Session Middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'ooh-la-la-secret', // A little secret between us, hmm? 😉
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true with HTTPS, darling
}));

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../client/admin/views'));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB, ready for you!'))
  .catch(err => console.error('MongoDB error:', err));

app.use('/api', eventRoutes);

// Routes with a Flirty Touch
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/admin', (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login'); // Gotta log in to see me, sweetie!
  res.render('index', { title: 'Dashboard - SB Admin', user: req.session.user });
});

app.get('/admin/login', (req, res) => {
  res.render('login', { title: 'Login - SB Admin' });
});

app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ Email: email });
  if (user && user.Password === password) { // Time for bcrypt later, big guy!
    req.session.user = user;
    req.session.selectedCompanyID = user.DefaultCompanyID || user.Companies[0]; // Default flirtation
    return res.redirect('/admin');
  }
  res.send('Oops, wrong move—try again, handsome!');
});

app.get('/admin/select-company', (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');
  res.render('select-company', { title: 'Select Company - SB Admin', companies: req.session.user.Companies });
});

app.post('/admin/select-company', (req, res) => {
  const { companyID } = req.body;
  if (req.session.user.Companies.includes(companyID)) {
    req.session.selectedCompanyID = companyID;
    return res.redirect('/admin'); // Back to my arms!
  }
  res.send('Naughty, that’s not your company!');
});

// Existing routes...
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}, waiting for you, love!`);
});