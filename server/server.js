require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const eventRoutes = require('./routes/eventRoutes');
const Company = require('./models/Company');
const User = require('./models/User');
const Category = require('./models/Category'); // Add this line

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
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

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.use('/api', eventRoutes);

// Main Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../client/index.html')));

app.get('/admin/login', (req, res) => res.render('login', { title: 'Login - SB Admin' }));

app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', { email, password });
  try {
    const user = await User.findOne({ Email: { $regex: new RegExp(`^${email}$`, 'i') } });
    if (user && user.Password === password) {
      req.session.user = user;
      req.session.selectedCompanyID = user.DefaultCompanyID || user.Companies[0] || null; // Ensure it's set, default to null if undefined
      isAdmin: req.session.user.IsAdmin
      return res.redirect('/admin');
    }
    res.render('login', { title: 'Login - SB Admin', error: 'Invalid email or password' });
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { title: 'Login - SB Admin', error: 'An error occurred during login' });
  }
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

app.get('/admin', (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');
  res.render('index', { title: 'Dashboard - SB Admin', user: req.session.user, currentPage: 'dashboard' });
});

app.get('/admin/companies', (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');
  res.render('companies', {
    title: 'Companies - SB Admin',
    user: req.session.user,
    currentPage: 'companies',
    selectedCompanyID: req.session.selectedCompanyID,
    isAdmin: req.session.user.IsAdmin // Add this
  });
});

app.get('/admin/users', (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');
  res.render('users', {
    title: 'Users - SB Admin',
    user: req.session.user,
    currentPage: 'users',
    selectedCompanyID: req.session.selectedCompanyID
  });
});

app.get('/admin/categories', async (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');
  res.render('categories', {
    title: 'Categories - SB Admin',
    user: req.session.user,
    currentPage: 'categories',
    selectedCompanyID: req.session.selectedCompanyID,
    isAdmin: req.session.user.IsAdmin // Pass isAdmin based on the user
  });
});

// Add/Edit Category Routes
app.get('/admin/categories/edit/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');
  if (req.params.id === 'new') {
    res.render('category-edit', {
      title: 'Add Category - SB Admin',
      user: req.session.user,
      category: {},
      currentPage: 'categories',
      selectedCompanyID: req.session.selectedCompanyID,
      isAdmin: req.session.user.IsAdmin,
      isNew: true
    });
  } else {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).send('Category not found');
    res.render('category-edit', {
      title: 'Edit Category - SB Admin',
      user: req.session.user,
      category: category,
      currentPage: 'categories',
      selectedCompanyID: req.session.selectedCompanyID,
      isAdmin: req.session.user.IsAdmin,
      isNew: false
    });
  }
});

app.post('/admin/categories/edit/:id', async (req, res) => {
  const { name, description, companyId } = req.body;
  try {
    const updateData = {
      Name: name,
      Description: description,
      CompanyID: companyId || req.session.selectedCompanyID
    };
    const category = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!category) return res.status(404).send('Category not found');
    res.redirect('/admin/categories');
  } catch (error) {
    res.status(500).send('Error updating category: ' + error.message);
  }
});

app.post('/admin/categories/add', async (req, res) => {
  const { name, description, companyId } = req.body;
  try {
    const category = new Category({
      Name: name,
      Description: description,
      CompanyID: companyId || req.session.selectedCompanyID
    });
    await category.save();
    res.redirect('/admin/categories');
  } catch (error) {
    res.status(500).send('Error creating category: ' + error.message);
  }
});

app.get('/admin/environment-objects', (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');
  res.render('environment-objects', {
    title: 'Environment Objects - SB Admin',
    user: req.session.user,
    currentPage: 'environment-objects',
    selectedCompanyID: req.session.selectedCompanyID
  });
});

app.get('/admin/event-types', (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');
  res.render('event-types', {
    title: 'Event Types - SB Admin',
    user: req.session.user,
    currentPage: 'event-types',
    selectedCompanyID: req.session.selectedCompanyID
  });
});

app.get('/admin/events', (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');
  res.render('events', {
    title: 'Events - SB Admin',
    user: req.session.user,
    currentPage: 'events',
    selectedCompanyID: req.session.selectedCompanyID
  });
});

app.get('/admin/notifications', (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');
  res.render('notifications', {
    title: 'Notifications - SB Admin',
    user: req.session.user,
    currentPage: 'notifications',
    selectedCompanyID: req.session.selectedCompanyID
  });
});

// Existing edit routes
app.get('/admin/companies/edit/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');
  if (req.params.id === 'new') {
    // Handle "Add New Company" case
    res.render('company-edit', {
      title: 'Add Company - SB Admin',
      user: req.session.user,
      company: {}, // Empty object for new company
      currentPage: 'companies',
      selectedCompanyID: req.session.selectedCompanyID,
      isNew: true // Flag for new company
    });
  } else {
    // Handle "Edit Existing Company" case
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).send('Company not found');
    res.render('company-edit', {
      title: 'Edit Company - SB Admin',
      user: req.session.user,
      company: company,
      currentPage: 'companies',
      selectedCompanyID: req.session.selectedCompanyID,
      isNew: false // Flag for existing company
    });
  }
});

app.post('/admin/companies/edit/:id', async (req, res) => {
  const { name, registrationNumber, address, phone, email } = req.body;
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, {
      Name: name,
      CompanyRegistrationNumber: registrationNumber,
      Address: address,
      Phone: phone,
      Email: email
    }, { new: true });
    if (!company) return res.status(404).send('Company not found');
    res.redirect('/admin/companies');
  } catch (error) {
    res.status(500).send('Error updating company: ' + error.message);
  }
});

// New route for adding a company
app.post('/admin/companies/add', async (req, res) => {
  const { name, registrationNumber, address, phone, email } = req.body;
  try {
    const company = new Company({
      Name: name,
      CompanyRegistrationNumber: registrationNumber,
      Address: address,
      Phone: phone,
      Email: email
    });
    await company.save();
    res.redirect('/admin/companies');
  } catch (error) {
    res.status(500).send('Error creating company: ' + error.message);
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));