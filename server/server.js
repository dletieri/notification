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

// Add express.urlencoded middleware
app.use(express.json()); // For JSON requests
app.use(express.urlencoded({ extended: true })); // For form submissions

app.use(express.static(path.join(__dirname, '../client')));
app.use('/admin', express.static(path.join(__dirname, '../client/admin')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../client/admin/views'));

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api', eventRoutes);

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../client/index.html')));
app.get('/admin', (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');
  res.render('index', { title: 'Dashboard - SB Admin', user: req.session.user });
});
app.get('/admin/login', (req, res) => res.render('login', { title: 'Login - SB Admin' }));

app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', { email, password });
  const user = await User.findOne({ Email: { $regex: new RegExp(`^${email}$`, 'i') } });
  console.log('User found:', user);
  if (user && user.Password === password) {
    console.log('Password match! Logging in...');
    req.session.user = user;
    req.session.selectedCompanyID = user.DefaultCompanyID || user.Companies[0];
    return res.redirect('/admin');
  }
  res.render('login', { title: 'Login - SB Admin', error: 'Invalid email or password' });
});

app.get('/admin/select-company', (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');
  res.render('select-company', { title: 'Select Company - SB Admin', companies: req.session.user.Companies });
});

app.post('/admin/select-company', (req, res) => {
  const { companyID } = req.body;
  if (req.session.user.Companies.includes(companyID)) {
    req.session.selectedCompanyID = companyID;
    return res.redirect('/admin');
  }
  res.status(400).send('Invalid company');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));