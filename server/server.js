require('dotenv').config(); // Add this line to load .env file

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const path = require('path');
const eventRoutes = require('./routes/eventRoutes');

const app = express();

// Import models
const Company = require('./models/Company');
const User = require('./models/User');
const Category = require('./models/Category');
const EnvironmentObject = require('./models/EnvironmentObject');
const Event = require('./models/Event');
const EventType = require('./models/EventType');
const Notification = require('./models/Notification');
const Submission = require('./models/Submission');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../client/admin/views'));
app.use(express.static(path.join(__dirname, '../client/admin')));

const staticPath = path.join(__dirname, '../client/admin');
console.log('Serving static files from:', staticPath);
app.use(express.static(staticPath));

// Session setup
const store = new MongoDBStore({
  uri: process.env.MONGO_URI,
  collection: 'sessions'
});

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
}));

// Routes
app.get('/', (req, res) => {
  res.redirect('/admin');
});

app.get('/admin', async (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');

  // Populate user.Companies with full company objects
  const user = await User.findById(req.session.user._id).populate('Companies').lean();
  if (!user) return res.redirect('/admin/login');

  // Fetch the selected company
  let selectedCompany = null;
  if (req.session.selectedCompanyID) {
    selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
  }

  res.render('index', {
    title: 'Dashboard - SB Admin',
    user: user,
    currentPage: 'dashboard',
    selectedCompanyID: req.session.selectedCompanyID || null,
    isAdmin: user.IsAdmin,
    selectedCompany: selectedCompany
  });
});

app.get('/admin/login', (req, res) => {
  console.log('Rendering login page, error:', null);
  console.log('Session on login GET:', req.session);
  res.render('login', { title: 'Login - SB Admin', error: null });
});

app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', { email, password });
  const user = await User.findOne({ Email: email });
  if (user && user.Password === password) {
    req.session.user = user;
    req.session.selectedCompanyID = user.DefaultCompanyID;
    console.log('Login successful, redirecting to /admin');
    res.redirect('/admin');
  } else {
    console.log('Login failed, error:', 'Invalid email or password');
    res.render('login', { title: 'Login - SB Admin', error: 'Invalid email or password' });
  }
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Error logging out');
    }
    res.redirect('/admin/login');
  });
});

app.get('/admin/companies', async (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');

  // Populate user.Companies with full company objects
  const user = await User.findById(req.session.user._id).populate('Companies').lean();
  if (!user) return res.redirect('/admin/login');

  // Fetch the selected company
  let selectedCompany = null;
  if (req.session.selectedCompanyID) {
    selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
  }

  res.render('companies', {
    title: 'Companies - SB Admin',
    user: user,
    currentPage: 'companies',
    selectedCompanyID: req.session.selectedCompanyID || null,
    isAdmin: user.IsAdmin,
    selectedCompany: selectedCompany
  });
});

app.get('/admin/categories', async (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');

  // Populate user.Companies with full company objects
  const user = await User.findById(req.session.user._id).populate('Companies').lean();
  if (!user) return res.redirect('/admin/login');

  // Fetch the selected company
  let selectedCompany = null;
  if (req.session.selectedCompanyID) {
    selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
  }

  res.render('categories', {
    title: 'Categories - SB Admin',
    user: user,
    currentPage: 'categories',
    selectedCompanyID: req.session.selectedCompanyID || null,
    isAdmin: user.IsAdmin,
    selectedCompany: selectedCompany
  });
});

app.get('/admin/categories/edit/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');

  // Populate user.Companies with full company objects
  const user = await User.findById(req.session.user._id).populate('Companies').lean();
  if (!user) return res.redirect('/admin/login');

  // Fetch the selected company
  let selectedCompany = null;
  if (req.session.selectedCompanyID) {
    selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
  }

  if (req.params.id === 'new') {
    res.render('category-edit', {
      title: 'Add Category - SB Admin',
      user: user,
      category: {},
      currentPage: 'categories',
      selectedCompanyID: req.session.selectedCompanyID || null,
      isAdmin: user.IsAdmin,
      isNew: true,
      selectedCompany: selectedCompany
    });
  } else {
    const category = await Category.findById(req.params.id).lean();
    if (!category) return res.status(404).send('Category not found');
    res.render('category-edit', {
      title: 'Edit Category - SB Admin',
      user: user,
      category: category,
      currentPage: 'categories',
      selectedCompanyID: req.session.selectedCompanyID || null,
      isAdmin: user.IsAdmin,
      isNew: false,
      selectedCompany: selectedCompany
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

app.get('/admin/select-company/:companyId', async (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');

  const companyId = req.params.companyId;
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    return res.status(400).send('Invalid company ID');
  }

  // Verify the company is in the user's Companies list
  const user = await User.findById(req.session.user._id).populate('Companies').lean();
  const company = user.Companies.find(c => c._id.toString() === companyId);
  if (!company) {
    return res.status(403).send('You are not authorized to select this company');
  }

  // Update the session's selectedCompanyID
  req.session.selectedCompanyID = companyId;
  await req.session.save();

  // Redirect back to the previous page or a default page
  const redirectUrl = req.headers.referer || '/admin/categories';
  res.redirect(redirectUrl);
});

app.get('/admin/environment-objects', async (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');

  // Populate user.Companies with full company objects
  const user = await User.findById(req.session.user._id).populate('Companies').lean();
  if (!user) return res.redirect('/admin/login');

  // Fetch the selected company
  let selectedCompany = null;
  if (req.session.selectedCompanyID) {
    selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
  }

  res.render('environment-objects', {
    title: 'Environment Objects - SB Admin',
    user: user,
    currentPage: 'environment-objects',
    selectedCompanyID: req.session.selectedCompanyID || null,
    isAdmin: user.IsAdmin,
    selectedCompany: selectedCompany
  });
});

app.use('/api', eventRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));