require('dotenv').config(); // Add this line to load .env file

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const bcrypt = require('bcrypt');

const path = require('path');
const eventRoutes = require('./routes/eventRoutes');
const QRCode = require('qrcode');
const https = require('https');
const app = express();
const fs = require('fs');
// Import models
const Company = require('./models/Company');
const User = require('./models/User');
const Category = require('./models/Category');
const EnvironmentObject = require('./models/EnvironmentObject');
const Event = require('./models/Event');
const EventType = require('./models/EventType');
const Notification = require('./models/Notification');
const Submission = require('./models/Submission');
const Role = require('./models/Role'); // Novo modelo Role

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

// GET /report-event
// GET /
app.get('/', async (req, res) => {
  const objID = req.query.objID;
  const isAttend = req.query.isAttend;

  if (!objID || !mongoose.Types.ObjectId.isValid(objID)) {
    return res.status(400).send('Invalid or missing objID');
  }

  try {
    const environmentObject = await EnvironmentObject.findById(objID)
      .populate('CompanyID', 'Name')
      .lean();
    if (!environmentObject) {
      return res.status(404).send('Environment Object not found');
    }

    const categoryID = environmentObject.CategoryID;
    if (!categoryID) {
      return res.status(400).send('Environment Object has no associated category');
    }

    const eventTypes = await EventType.find({
      CompanyID: environmentObject.CompanyID._id,
      CategoryID: categoryID
    })
      .populate('CategoryID', 'Name')
      .lean();

    if (!eventTypes || eventTypes.length === 0) {
      return res.status(400).send('No event types available for this category');
    }

    const user = req.session.user; // Get logged-in user from session

    // Case 1: isAttend is true
    if (isAttend === 'true') {
      if (!user) {
        // Redirect to login if no user is logged in
        return res.redirect('/admin/login?returnTo=' + encodeURIComponent(req.originalUrl));
      }

      // Check if user has a role matching any eventType.RoleID
      const allowedRoleIds = eventTypes
        .filter(et => et.RoleID)
        .map(et => et.RoleID.toString());
      const userRoleIds = user.Roles.map(r => r.toString());
      const hasRequiredRole = allowedRoleIds.some(roleId => userRoleIds.includes(roleId));

      if (!hasRequiredRole) {
        return res.status(403).send('You do not have permission to report this event type');
      }

      // Render the page for authorized users
      return res.render('report-event', {
        title: 'Report Event',
        environmentObject,
        eventTypes,
        isAttend,
        user,
        requiresLogin: false
      });
    }

    // Case 2: isAttend is not true
    if (environmentObject.isPrivate === true) {
      if (!user) {
        // Redirect to login if no user is logged in and object is private
        return res.redirect('/admin/login?returnTo=' + encodeURIComponent(req.originalUrl));
      }
    }

    // Render the page (either logged in or public)
    res.render('report-event', {
      title: 'Report Event',
      environmentObject,
      eventTypes,
      isAttend,
      user,
      requiresLogin: environmentObject.isPrivate && !user
    });
  } catch (error) {
    console.error('Error loading event report page:', error);
    res.status(500).send('Error loading event report page');
  }
});

// POST /
app.post('/', async (req, res) => {
  const { objID, eventTypeID, isAttend } = req.body;

  if (!objID || !eventTypeID || !mongoose.Types.ObjectId.isValid(objID) || !mongoose.Types.ObjectId.isValid(eventTypeID)) {
    return res.status(400).send('Invalid or missing required fields');
  }

  try {
    const environmentObject = await EnvironmentObject.findById(objID).lean();
    if (!environmentObject) {
      return res.status(404).send('Environment Object not found');
    }

    const eventType = await EventType.findById(eventTypeID).lean();
    if (!eventType) {
      return res.status(404).send('Event Type not found');
    }

    const user = req.session.user;

    // Validation based on isAttend and isPrivate
    if (isAttend === 'true') {
      if (!user) {
        return res.status(401).send('Login required to report this event');
      }
      const allowedRoleIds = [eventType.RoleID?.toString()].filter(Boolean);
      const userRoleIds = user.Roles.map(r => r.toString());
      const hasRequiredRole = allowedRoleIds.some(roleId => userRoleIds.includes(roleId));
      if (!hasRequiredRole) {
        return res.status(403).send('You do not have permission to report this event type');
      }
    } else if (environmentObject.isPrivate === true && !user) {
      return res.status(401).send('Login required to report this event');
    }

    const newEvent = new Event({
      CompanyID: environmentObject.CompanyID,
      CategoryID: eventType.CategoryID,
      EventTypeID: new mongoose.Types.ObjectId(eventTypeID),
      EnvironmentObjectID: new mongoose.Types.ObjectId(objID),
      Date: new Date(),
      isAttend: isAttend === 'true',
      UserID: user ? new mongoose.Types.ObjectId(user._id) : null // Optional: Store user who reported
    });

    await newEvent.save();
    res.redirect('/thanks?objID=' + objID);
  } catch (error) {
    console.error('Error submitting event:', error);
    res.status(500).send('Error submitting event: ' + error.message);
  }
});

// GET /thanks - Render the thank you page
app.get('/thanks', (req, res) => {
  const objID = req.query.objID;
  if (!objID || !mongoose.Types.ObjectId.isValid(objID)) {
    return res.status(400).send('Invalid or missing objID');
  }
  res.render('thanks', {
    title: 'Thank You',
    query: { objID: objID }
  });
});

// GET /admin - Render the dashboard
app.get('/admin', async (req, res) => {
  if (!req.session.user) return res.status(401).redirect('/admin/login');
  if (!req.session.user.IsAdmin) return res.status(403).send('Access denied: Admins only');

  const user = await User.findById(req.session.user._id).populate('Companies').lean();
  if (!user) return res.status(401).redirect('/admin/login');

  const selectedCompanyID = req.session.selectedCompanyID || user.DefaultCompanyID;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    // Account Information Metrics
    const objectCount = await EnvironmentObject.countDocuments({ CompanyID: selectedCompanyID });
    const totalObjectCount = await EnvironmentObject.countDocuments({ CompanyID: { $in: user.Companies } });
    const categoryCount = (await EventType.distinct('CategoryID', { CompanyID: selectedCompanyID })).length;
    const totalCategoryCount = (await EventType.distinct('CategoryID', { CompanyID: { $in: user.Companies } })).length;
    const companyCount = await Company.countDocuments();
    const eventCount = await Event.countDocuments({ CompanyID: selectedCompanyID });
    const totalEventCount = await Event.countDocuments({ CompanyID: { $in: user.Companies } });

    // Pie Chart Data: Events per Environment Object Type
    console.log('selectedCompanyID :', selectedCompanyID); // Debug log
    const companyId = typeof selectedCompanyID === 'string' 
      ? new mongoose.Types.ObjectId(selectedCompanyID) 
      : selectedCompanyID;

    const envObjectEvents = await Event.aggregate([
      { $match: { CompanyID: companyId } },
      {
        $group: {
          _id: '$EnvironmentObjectID',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'environmentobjects',
          localField: '_id',
          foreignField: '_id',
          as: 'object'
        }
      },
      { $unwind: '$object' },
      { $project: { name: '$object.Name', count: 1 } }
    ]).exec().then(results => {
      console.log('envObjectEvents :', results); // Debug log
      return results.map(result => ({ ...result, count: result.count || 0 }));
    });

    // Pie Chart Data: Events per Event Type
    const eventTypeEvents = await Event.aggregate([
      { $match: { CompanyID: companyId } },
      {
        $group: {
          _id: '$EventTypeID',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'eventtypes',
          localField: '_id',
          foreignField: '_id',
          as: 'type'
        }
      },
      { $unwind: '$type' },
      { $project: { name: '$type.Name', count: 1 } }
    ]).exec().then(results => results.map(result => ({ ...result, count: result.count || 0 })));

    // List of Objects with Events (Last Month)
    const objectsWithEvents = await Event.aggregate([
      { $match: { CompanyID: companyId, Date: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$EnvironmentObjectID',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'environmentobjects',
          localField: '_id',
          foreignField: '_id',
          as: 'object'
        }
      },
      { $unwind: '$object' },
      { $project: { name: '$object.Name', count: 1 } }
    ]).exec().then(results => results.map(result => ({ ...result, count: result.count || 0 })));

    // Bar Chart Data: Events by Object Type
    const barChartData = await Event.aggregate([
      { $match: { CompanyID: companyId } },
      {
        $group: {
          _id: '$EnvironmentObjectID',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'environmentobjects',
          localField: '_id',
          foreignField: '_id',
          as: 'object'
        }
      },
      { $unwind: '$object' },
      { $project: { name: '$object.Name', count: 1 } }
    ]).exec().then(results => results.map(result => ({ ...result, count: result.count || 0 })));

    // Line Chart Data: Events per Day by Category (Last 30 Days)
    const dailyEventsByCategoryRaw = await Event.aggregate([
      { $match: { CompanyID: companyId, Date: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$Date' } },
            category: '$CategoryID'
          },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id.category',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $project: {
          date: '$_id.date',
          categoryId: '$_id.category',
          categoryName: '$category.Name',
          count: 1
        }
      },
      { $sort: { 'date': 1 } }
    ]).exec();

    // Transform the raw data into a format suitable for Chart.js
    const dates = [...new Set(dailyEventsByCategoryRaw.map(e => e.date))].sort();
    const categories = [...new Set(dailyEventsByCategoryRaw.map(e => e.categoryName))];

    // Create datasets for each category
    const dailyEventsByCategory = categories.map((category, index) => {
      const data = dates.map(date => {
        const entry = dailyEventsByCategoryRaw.find(e => e.date === date && e.categoryName === category);
        return entry ? entry.count : 0;
      });
      return {
        label: category,
        data: data,
        fill: false,
        borderColor: ['#1cc88a', '#4e73df', '#36b9cc', '#f6c23e', '#e74a3b', '#858796'][index % 6],
        tension: 0.1
      };
    });

    // Calculate the maximum value for the Y-axis
    const maxEventCount = Math.max(...dailyEventsByCategory.flatMap(dataset => dataset.data));
    const yAxisMax = Math.ceil(maxEventCount * 1.2); // Add 20% padding above the max value

    // Debug logs
    console.log('dailyEventsByCategoryRaw:', dailyEventsByCategoryRaw);
    console.log('dates:', dates);
    console.log('categories:', categories);
    console.log('dailyEventsByCategory:', dailyEventsByCategory);
    console.log('maxEventCount:', maxEventCount);
    console.log('yAxisMax:', yAxisMax);

    let selectedCompany = null;
    if (selectedCompanyID) {
      selectedCompany = await Company.findById(selectedCompanyID).lean();
    }

    // Pass yAxisMax to the template
    res.render('admin', {
      title: 'Dashboard - UPfy.me',
      user: user,
      currentPage: 'admin',
      selectedCompanyID: selectedCompanyID,
      isAdmin: user.IsAdmin,
      selectedCompany: selectedCompany,
      metrics: {
        objectCount,
        totalObjectCount,
        categoryCount,
        totalCategoryCount,
        companyCount,
        eventCount,
        totalEventCount
      },
      envObjectEvents,
      eventTypeEvents,
      objectsWithEvents,
      barChartData,
      dates,
      dailyEventsByCategory,
      yAxisMax // Add yAxisMax to the template data
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Error loading dashboard: ' + error.message);
  }
});

app.get('/admin/login', (req, res) => {
  console.log('Rendering login page, error:', null);
  console.log('Session on login GET:', req.session);
  res.render('login', { title: 'Login - UPfy.ME', 
      error: null,
      returnTo: req.query.returnTo || '' // Pass returnTo from query string
   });
});
app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', { email, password });

  try {
    const user = await User.findOne({ Email: email });
    if (user && user.Password === password) {
      req.session.user = user;
      req.session.selectedCompanyID = user.DefaultCompanyID;
      console.log('Login successful');

      // Get the returnTo parameter from the query string (passed from the redirect)
      const returnTo = req.query.returnTo || '/admin'; // Default to /admin if no returnTo is provided

      console.log('Redirecting to (441):', returnTo);
      res.redirect(returnTo);
    } else {
      console.log('Login failed, error:', 'Invalid email or password');
      res.status(401).render('login', {
        title: 'Login - UPfy.me',
        error: 'Invalid email or password'
      });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).render('login', {
      title: 'Login - Notify.ME',
      error: 'An error occurred during login'
    });
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
  if (!user) return res.status(401).redirect('/admin/login');

  // Fetch the selected company
  let selectedCompany = null;
  if (req.session.selectedCompanyID) {
    selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
  }

  res.render('companies', {
    title: 'Companies - UPfy.me',
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
  if (!user) return res.status(401).redirect('/admin/login');

  // Fetch the selected company
  let selectedCompany = null;
  if (req.session.selectedCompanyID) {
    selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
  }

  // Fetch categories for the selected company
  const categories = req.session.selectedCompanyID
    ? await Category.find({ CompanyID: req.session.selectedCompanyID }).lean()
    : [];

  res.render('categories', {
    title: 'Categories - UPfy.me',
    user: user,
    currentPage: 'categories',
    selectedCompanyID: req.session.selectedCompanyID || null,
    isAdmin: user.IsAdmin,
    selectedCompany: selectedCompany,
    categories: categories
  });
});

app.get('/admin/categories/edit/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');

  // Populate user.Companies with full company objects
  const user = await User.findById(req.session.user._id).populate('Companies').lean();
  if (!user) return res.status(401).redirect('/admin/login');

  // Fetch the selected company
  let selectedCompany = null;
  if (req.session.selectedCompanyID) {
    selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
  }

  if (req.params.id === 'new') {
    res.render('category-edit', {
      title: 'Add Category - UPfy.me',
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
      title: 'Edit Category - UPfy.me',
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
  if (!req.session.user.IsAdmin) return res.status(403).send('Access denied: Admins only');

  const user = await User.findById(req.session.user._id).populate('Companies').lean();
  if (!user) return res.status(401).redirect('/admin/login');

  // Fetch environment objects for the selected company
  const envObjects = req.session.selectedCompanyID
    ? await EnvironmentObject.find({ CompanyID: req.session.selectedCompanyID })
      .populate('CompanyID', 'Name')
      .lean()
    : [];

  let selectedCompany = null;
  if (req.session.selectedCompanyID) {
    selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
  }

  res.render('environment-objects', {
    title: 'Environment Objects - UPfy.me',
    user: user,
    envObjects: envObjects,
    currentPage: 'environment-objects',
    selectedCompanyID: req.session.selectedCompanyID || null,
    isAdmin: user.IsAdmin,
    selectedCompany: selectedCompany
  });
});

app.get('/admin/environment-objects/edit/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');

  // Populate user.Companies with full company objects
  const user = await User.findById(req.session.user._id).populate('Companies').lean();
  if (!user) return res.status(401).redirect('/admin/login');

  // Fetch the selected company
  let selectedCompany = null;
  if (req.session.selectedCompanyID) {
    selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
  }

  // Fetch categories for the dropdown
  let categories = [];
  if (req.session.selectedCompanyID) {
    categories = await Category.find({ CompanyID: req.session.selectedCompanyID }).lean();
  }

  if (req.params.id === 'new') {
    res.render('environment-object-edit', {
      title: 'Add Environment Object - UPfy.me',
      user: user,
      environmentObject: {},
      categories: categories,
      currentPage: 'environment-objects',
      selectedCompanyID: req.session.selectedCompanyID || null,
      isAdmin: user.IsAdmin,
      isNew: true,
      selectedCompany: selectedCompany
    });
  } else {
    const environmentObject = await EnvironmentObject.findById(req.params.id).lean();
    if (!environmentObject) return res.status(404).send('Environment object not found');
    res.render('environment-object-edit', {
      title: 'Edit Environment Object - UPfy.me',
      user: user,
      environmentObject: environmentObject,
      categories: categories,
      currentPage: 'environment-objects',
      selectedCompanyID: req.session.selectedCompanyID || null,
      isAdmin: user.IsAdmin,
      isNew: false,
      selectedCompany: selectedCompany
    });
  }
});

app.post('/admin/environment-objects/edit/:id', async (req, res) => {
  const { name, description, companyId, categoryId } = req.body;
  try {
    const updateData = {
      Name: name,
      Description: description,
      CompanyID: companyId || req.session.selectedCompanyID,
      CategoryID: categoryId
    };
    const environmentObject = await EnvironmentObject.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!environmentObject) return res.status(404).send('Environment object not found');
    res.redirect('/admin/environment-objects');
  } catch (error) {
    res.status(500).send('Error updating environment object: ' + error.message);
  }
});

app.post('/admin/environment-objects/add', async (req, res) => {
  const { name, description, companyId, categoryId } = req.body;
  try {
    const environmentObject = new EnvironmentObject({
      Name: name,
      Description: description,
      CompanyID: companyId || req.session.selectedCompanyID,
      CategoryID: categoryId
    });
    await environmentObject.save();
    res.redirect('/admin/environment-objects');
  } catch (error) {
    res.status(500).send('Error creating environment object: ' + error.message);
  }
});

// GET /admin/event-types
app.get('/admin/event-types', async (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');

  // Populate user.Companies with full company objects
  const user = await User.findById(req.session.user._id).populate('Companies').lean();
  if (!user) return res.status(401).redirect('/admin/login');

  // Fetch the selected company
  let selectedCompany = null;
  if (req.session.selectedCompanyID) {
    selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
  }

  // Fetch event types for the selected company with enforced filtering and debugging
  let eventTypes = [];
  if (req.session.selectedCompanyID && mongoose.Types.ObjectId.isValid(req.session.selectedCompanyID)) {
    const companyId = new mongoose.Types.ObjectId(req.session.selectedCompanyID); // Explicit type conversion
    eventTypes = await EventType.find({ CompanyID: companyId })
      .populate('CategoryID', 'Name')
      .lean();
    console.log(`Querying EventTypes for CompanyID: ${companyId}, Results:`, eventTypes);
  } else {
    console.log('No valid selectedCompanyID in session:', req.session.selectedCompanyID);
  }

  res.render('event-types', {
    title: 'Event Types - UPfy.me',
    user: user,
    currentPage: 'event-types',
    selectedCompanyID: req.session.selectedCompanyID || null,
    isAdmin: user.IsAdmin,
    selectedCompany: selectedCompany,
    eventTypes: eventTypes
  });
});

// GET /admin/event-types/edit/:id
app.get('/admin/event-types/edit/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');

  // Populate user.Companies with full company objects
  const user = await User.findById(req.session.user._id).populate('Companies').lean();
  if (!user) return res.status(401).redirect('/admin/login');

  // Fetch the selected company
  let selectedCompany = null;
  if (req.session.selectedCompanyID) {
    selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
  }

  // Fetch categories for the dropdown (filtered by selected company)
  let categories = [];
  if (req.session.selectedCompanyID) {
    categories = await Category.find({ CompanyID: req.session.selectedCompanyID }).lean();
  }

  // Fetch roles for the dropdown (filtered by selected company)
  let roles = [];
  if (req.session.selectedCompanyID) {
    roles = await Role.find({ CompanyID: req.session.selectedCompanyID }).lean();
  }

  if (req.params.id === 'new') {
    res.render('event-type-edit', {
      title: 'Add Event Type - UPfy.me',
      user: user,
      eventType: {},
      categories: categories,
      roles: roles, // Passa os roles para o template
      currentPage: 'event-types',
      selectedCompanyID: req.session.selectedCompanyID || null,
      isAdmin: user.IsAdmin,
      isNew: true,
      selectedCompany: selectedCompany
    });
  } else {
    const eventType = await EventType.findById(req.params.id).lean();
    if (!eventType) return res.status(404).send('Event Type not found');
    res.render('event-type-edit', {
      title: 'Edit Event Type - UPfy.me',
      user: user,
      eventType: eventType,
      categories: categories,
      roles: roles, // Passa os roles para o template
      currentPage: 'event-types',
      selectedCompanyID: req.session.selectedCompanyID || null,
      isAdmin: user.IsAdmin,
      isNew: false,
      selectedCompany: selectedCompany
    });
  }
});

// POST /admin/event-types/edit/:id
app.post('/admin/event-types/edit/:id', async (req, res) => {
  const { name, description, categoryId, roleId, attend } = req.body; // Add attend
  try {
    const updateData = {
      Name: name,
      Description: description,
      CompanyID: req.session.selectedCompanyID, // Uses session CompanyID
      CategoryID: categoryId,
      RoleID: roleId || null,
      attend // Add attend to update
    };
    const eventType = await EventType.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!eventType) return res.status(404).send('Event Type not found');
    res.redirect('/admin/event-types');
  } catch (error) {
    res.status(500).send('Error updating event type: ' + error.message);
  }
});

// POST /admin/event-types/add
app.post('/admin/event-types/add', async (req, res) => {
  const { name, description, categoryId, roleId, attend } = req.body; // Add attend
  try {
    const eventType = new EventType({
      Name: name,
      Description: description,
      CompanyID: req.session.selectedCompanyID, // Uses session CompanyID
      CategoryID: categoryId,
      RoleID: roleId || null,
      attend // Add attend to new document
    });
    await eventType.save();
    res.redirect('/admin/event-types');
  } catch (error) {
    res.status(500).send('Error creating event type: ' + error.message);
  }
});

// GET /admin/users
app.get('/admin/users', async (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');
  if (!req.session.user.IsAdmin) return res.status(403).send('Access denied: Admins only');

  const user = await User.findById(req.session.user._id).populate('Companies').lean();
  if (!user) return res.status(401).redirect('/admin/login');

  const users = req.session.selectedCompanyID && mongoose.Types.ObjectId.isValid(req.session.selectedCompanyID)
    ? await User.find({ Companies: req.session.selectedCompanyID })
        .populate('Companies', 'Name')
        .populate('DefaultCompanyID', 'Name')
        .lean()
    : [];

  let selectedCompany = null;
  if (req.session.selectedCompanyID) {
    selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
  }

  res.render('users', {
    title: 'Users - UPfy.me',
    user: user,
    users: users,
    currentPage: 'users',
    selectedCompanyID: req.session.selectedCompanyID || null,
    isAdmin: user.IsAdmin,
    selectedCompany: selectedCompany
  });
});

// GET /admin/users/edit/:id
app.get('/admin/users/edit/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');
  if (!req.session.user.IsAdmin) return res.status(403).send('Access denied: Admins only');

  const user = await User.findById(req.session.user._id).populate('Companies').lean();
  if (!user) return res.status(401).redirect('/admin/login');

  const companies = await Company.find().lean();
  let roles = [];
  if (req.session.selectedCompanyID) {
    roles = await Role.find({ CompanyID: req.session.selectedCompanyID }).lean(); // Filtra roles pela empresa da sessão
  }

  let selectedCompany = null;
  if (req.session.selectedCompanyID) {
    selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
  }

  if (req.params.id === 'new') {
    res.render('user-edit', {
      title: 'Add User - UPfy.me',
      user: user,
      editUser: {},
      companies: companies,
      roles: roles, // Passa os roles para o template
      currentPage: 'users',
      selectedCompanyID: req.session.selectedCompanyID || null,
      isAdmin: user.IsAdmin,
      isNew: true,
      selectedCompany: selectedCompany,
      error: null
    });
  } else {
    const editUser = await User.findById(req.params.id).populate('Companies', 'Name').populate('Roles', 'Name').lean();
    if (!editUser) return res.status(404).send('User not found');
    res.render('user-edit', {
      title: 'Edit User - UPfy.me',
      user: user,
      editUser: editUser,
      companies: companies,
      roles: roles, // Passa os roles para o template
      currentPage: 'users',
      selectedCompanyID: req.session.selectedCompanyID || null,
      isAdmin: user.IsAdmin,
      isNew: false,
      selectedCompany: selectedCompany,
      error: null
    });
  }
});

// POST /admin/users/edit/:id
app.post('/admin/users/edit/:id', async (req, res) => {
  if (!req.session.user.IsAdmin) return res.status(403).send('Access denied: Admins only');

  const { email, name, phone, role, isAdmin, defaultCompanyID, companies, roles } = req.body; // Adiciona roles

  try {
    const existingUser = await User.findOne({ Email: email, _id: { $ne: req.params.id } });
    if (existingUser) {
      const user = await User.findById(req.session.user._id).populate('Companies').lean();
      const companiesList = await Company.find().lean();
      const rolesList = await Role.find({ CompanyID: req.session.selectedCompanyID }).lean();
      let selectedCompany = null;
      if (req.session.selectedCompanyID) {
        selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
      }
      return res.render('user-edit', {
        title: 'Edit User - UPfy.me',
        user: user,
        editUser: { Email: email, Name: name, Phone: phone, Role: role, IsAdmin: isAdmin === 'on', DefaultCompanyID: defaultCompanyID, Companies: companies, Roles: roles },
        companies: companiesList,
        roles: rolesList,
        currentPage: 'users',
        selectedCompanyID: req.session.selectedCompanyID || null,
        isAdmin: user.IsAdmin,
        isNew: false,
        selectedCompany: selectedCompany,
        error: 'Email is already in use'
      });
    }

    const updateData = {
      Email: email,
      Name: name,
      Phone: phone,
      Role: role || '', // Pode ser removido se não for mais necessário
      IsAdmin: isAdmin === 'on',
      DefaultCompanyID: defaultCompanyID ? new mongoose.Types.ObjectId(defaultCompanyID) : null,
      Companies: companies ? (Array.isArray(companies) ? companies : [companies]).map(id => new mongoose.Types.ObjectId(id)) : [],
      Roles: roles ? (Array.isArray(roles) ? roles : [roles]).map(id => new mongoose.Types.ObjectId(id)) : [] // Adiciona o array de Roles
    };
    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!updatedUser) return res.status(404).send('User not found');
    res.redirect('/admin/users');
  } catch (error) {
    const user = await User.findById(req.session.user._id).populate('Companies').lean();
    const companiesList = await Company.find().lean();
    const rolesList = await Role.find({ CompanyID: req.session.selectedCompanyID }).lean();
    let selectedCompany = null;
    if (req.session.selectedCompanyID) {
      selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
    }
    res.render('user-edit', {
      title: 'Edit User - UPfy.me',
      user: user,
      editUser: { Email: email, Name: name, Phone: phone, Role: role, IsAdmin: isAdmin === 'on', DefaultCompanyID: defaultCompanyID, Companies: companies, Roles: roles },
      companies: companiesList,
      roles: rolesList,
      currentPage: 'users',
      selectedCompanyID: req.session.selectedCompanyID || null,
      isAdmin: user.IsAdmin,
      isNew: false,
      selectedCompany: selectedCompany,
      error: 'Error updating user: ' + error.message
    });
  }
});

// POST /admin/users/add
app.post('/admin/users/add', async (req, res) => {
  if (!req.session.user.IsAdmin) return res.status(403).send('Access denied: Admins only');

  const { email, password, name, phone, role, isAdmin, defaultCompanyID, companies, roles } = req.body; // Adiciona roles

  try {
    const existingUser = await User.findOne({ Email: email });
    if (existingUser) {
      const user = await User.findById(req.session.user._id).populate('Companies').lean();
      const companiesList = await Company.find().lean();
      const rolesList = await Role.find({ CompanyID: req.session.selectedCompanyID }).lean();
      let selectedCompany = null;
      if (req.session.selectedCompanyID) {
        selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
      }
      return res.render('user-edit', {
        title: 'Add User - UPfy.me',
        user: user,
        editUser: { Email: email, Name: name, Phone: phone, Role: role, IsAdmin: isAdmin === 'on', DefaultCompanyID: defaultCompanyID, Companies: companies, Roles: roles },
        companies: companiesList,
        roles: rolesList,
        currentPage: 'users',
        selectedCompanyID: req.session.selectedCompanyID || null,
        isAdmin: user.IsAdmin,
        isNew: true,
        selectedCompany: selectedCompany,
        error: 'Email is already in use'
      });
    }

    const newUser = new User({
      Email: email,
      Password: password, // Note: Should be hashed with bcrypt in a real app
      Name: name,
      Phone: phone,
      Role: role || '', // Pode ser removido se não for mais necessário
      IsAdmin: isAdmin === 'on',
      DefaultCompanyID: defaultCompanyID ? new mongoose.Types.ObjectId(defaultCompanyID) : null,
      Companies: companies ? (Array.isArray(companies) ? companies : [companies]).map(id => new mongoose.Types.ObjectId(id)) : [],
      Roles: roles ? (Array.isArray(roles) ? roles : [roles]).map(id => new mongoose.Types.ObjectId(id)) : [], // Adiciona o array de Roles
      RegistrationDate: new Date()
    });
    await newUser.save();
    res.redirect('/admin/users');
  } catch (error) {
    const user = await User.findById(req.session.user._id).populate('Companies').lean();
    const companiesList = await Company.find().lean();
    const rolesList = await Role.find({ CompanyID: req.session.selectedCompanyID }).lean();
    let selectedCompany = null;
    if (req.session.selectedCompanyID) {
      selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
    }
    res.render('user-edit', {
      title: 'Add User - UPfy.me',
      user: user,
      editUser: { Email: email, Name: name, Phone: phone, Role: role, IsAdmin: isAdmin === 'on', DefaultCompanyID: defaultCompanyID, Companies: companies, Roles: roles },
      companies: companiesList,
      roles: rolesList,
      currentPage: 'users',
      selectedCompanyID: req.session.selectedCompanyID || null,
      isAdmin: user.IsAdmin,
      isNew: true,
      selectedCompany: selectedCompany,
      error: 'Error creating user: ' + error.message
    });
  }
});

app.post('/admin/users/delete/:id', async (req, res) => {
  if (!req.session.user.IsAdmin) return res.status(403).send('Access denied: Admins only');

  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).send('User not found');
    if (user._id.toString() === req.session.user._id.toString()) {
      req.session.destroy(() => res.redirect('/admin/login'));
    } else {
      res.redirect('/admin/users');
    }
  } catch (error) {
    res.status(500).send('Error deleting user: ' + error.message);
  }
});

// GET /admin/roles - List all roles
app.get('/admin/roles', async (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');
  if (!req.session.user.IsAdmin) return res.status(403).send('Access denied: Admins only');

  const user = await User.findById(req.session.user._id).populate('Companies').lean();
  if (!user) return res.status(401).redirect('/admin/login');

  let roles = [];
  if (req.session.selectedCompanyID && mongoose.Types.ObjectId.isValid(req.session.selectedCompanyID)) {
    roles = await Role.find({ CompanyID: req.session.selectedCompanyID })
      .populate('CompanyID', 'Name')
      .lean();
  }

  let selectedCompany = null;
  if (req.session.selectedCompanyID) {
    selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
  }

  res.render('roles', {
    title: 'Roles - UPfy.me',
    user: user,
    roles: roles,
    currentPage: 'roles',
    selectedCompanyID: req.session.selectedCompanyID || null,
    isAdmin: user.IsAdmin,
    selectedCompany: selectedCompany
  });
});

// GET /admin/roles/edit/:id - Render role edit form
app.get('/admin/roles/edit/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');
  if (!req.session.user.IsAdmin) return res.status(403).send('Access denied: Admins only');

  const user = await User.findById(req.session.user._id).populate('Companies').lean();
  if (!user) return res.status(401).redirect('/admin/login');

  let selectedCompany = null;
  if (req.session.selectedCompanyID) {
    selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
  }

  if (req.params.id === 'new') {
    res.render('role-edit', {
      title: 'Add Role - UPfy.me',
      user: user,
      role: {},
      currentPage: 'roles',
      selectedCompanyID: req.session.selectedCompanyID || null,
      isAdmin: user.IsAdmin,
      isNew: true,
      selectedCompany: selectedCompany,
      error: null
    });
  } else {
    const role = await Role.findById(req.params.id).populate('CompanyID', 'Name').lean();
    if (!role) return res.status(404).send('Role not found');
    res.render('role-edit', {
      title: 'Edit Role - UPfy.me',
      user: user,
      role: role,
      currentPage: 'roles',
      selectedCompanyID: req.session.selectedCompanyID || null,
      isAdmin: user.IsAdmin,
      isNew: false,
      selectedCompany: selectedCompany,
      error: null
    });
  }
});

// POST /admin/roles/edit/:id - Update an existing role
app.post('/admin/roles/edit/:id', async (req, res) => {
  if (!req.session.user.IsAdmin) return res.status(403).send('Access denied: Admins only');

  const { name, description } = req.body;

  try {
    const updateData = {
      Name: name,
      Description: description || '',
      CompanyID: req.session.selectedCompanyID ? new mongoose.Types.ObjectId(req.session.selectedCompanyID) : null
    };
    const updatedRole = await Role.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!updatedRole) return res.status(404).send('Role not found');
    res.redirect('/admin/roles');
  } catch (error) {
    const user = await User.findById(req.session.user._id).populate('Companies').lean();
    let selectedCompany = null;
    if (req.session.selectedCompanyID) {
      selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
    }
    res.render('role-edit', {
      title: 'Edit Role - UPfy.me',
      user: user,
      role: { Name: name, Description: description, CompanyID: req.session.selectedCompanyID },
      currentPage: 'roles',
      selectedCompanyID: req.session.selectedCompanyID || null,
      isAdmin: user.IsAdmin,
      isNew: false,
      selectedCompany: selectedCompany,
      error: 'Error updating role: ' + error.message
    });
  }
});

// POST /admin/roles/add - Create a new role
app.post('/admin/roles/add', async (req, res) => {
  if (!req.session.user.IsAdmin) return res.status(403).send('Access denied: Admins only');

  const { name, description } = req.body;

  try {
    const newRole = new Role({
      Name: name,
      Description: description || '',
      CompanyID: req.session.selectedCompanyID ? new mongoose.Types.ObjectId(req.session.selectedCompanyID) : null,
      CreatedAt: new Date()
    });
    await newRole.save();
    res.redirect('/admin/roles');
  } catch (error) {
    const user = await User.findById(req.session.user._id).populate('Companies').lean();
    let selectedCompany = null;
    if (req.session.selectedCompanyID) {
      selectedCompany = await Company.findById(req.session.selectedCompanyID).lean();
    }
    res.render('role-edit', {
      title: 'Add Role - UPfy.me',
      user: user,
      role: { Name: name, Description: description, CompanyID: req.session.selectedCompanyID },
      currentPage: 'roles',
      selectedCompanyID: req.session.selectedCompanyID || null,
      isAdmin: user.IsAdmin,
      isNew: true,
      selectedCompany: selectedCompany,
      error: 'Error creating role: ' + error.message
    });
  }
});

// POST /admin/roles/delete/:id - Delete a role
app.post('/admin/roles/delete/:id', async (req, res) => {
  if (!req.session.user.IsAdmin) return res.status(403).send('Access denied: Admins only');

  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) return res.status(404).send('Role not found');
    res.redirect('/admin/roles');
  } catch (error) {
    res.status(500).send('Error deleting role: ' + error.message);
  }
});

// GET /admin/generate-qr/:id - Generate QR code for an EnvironmentObject
app.get('/admin/generate-qr/:id', async (req, res) => {
  if (!req.session.user) return res.status(403).json({ error: 'Unauthorized' });
  if (!req.session.user.IsAdmin) return res.status(403).json({ error: 'Admins only' });

  const envObjectId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(envObjectId)) {
    return res.status(400).json({ error: 'Invalid Environment Object ID' });
  }

  try {
    const envObject = await EnvironmentObject.findById(envObjectId).lean();
    if (!envObject) {
      return res.status(404).json({ error: 'Environment Object not found' });
    }

    // Generate the QR code URL
    const qrUrl = `${process.env.BASE_URL}/?objID=${envObjectId}`;

    // Generate QR code as a base64 data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl);
    res.json({ qrCode: qrCodeDataUrl, qrUrl: qrUrl });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Error generating QR code' });
  }
});

// Updated GET /admin/companies/edit/:id - Edit or create a new Company
app.get('/admin/companies/edit/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/admin/login');
  if (!req.session.user.IsAdmin) return res.status(403).send('Access denied: Admins only');

  const companyId = req.params.id;
  let company = { Name: '', CompanyRegistrationNumber: '', Address: '', Phone: '', Email: '' }; // Default for new company

  if (companyId !== 'new') {
    company = await Company.findById(companyId).lean();
    if (!company) return res.status(404).send('Company not found');
  }

  // Fetch selected company based on session or default
  let selectedCompany = null;
  const selectedCompanyID = req.session.selectedCompanyID || req.session.user.DefaultCompanyID;
  if (selectedCompanyID) {
    selectedCompany = await Company.findById(selectedCompanyID).lean();
  }

  res.render('company-edit', {
    title: companyId === 'new' ? 'Add Company - UPfy.me' : 'Edit Company - UPfy.me',
    user: req.session.user,
    company: company,
    currentPage: 'companies',
    selectedCompanyID: selectedCompanyID,
    isAdmin: req.session.user.IsAdmin,
    isNew: companyId === 'new',
    selectedCompany: selectedCompany || { Name: 'No company selected' } // Fallback if null
  });
});

// Updated POST /admin/companies/edit/:id - Save Company
app.post('/admin/companies/edit/:id', async (req, res) => {
  if (!req.session.user || !req.session.user.IsAdmin) {
    return res.status(403).send('Access denied: Admins only');
  }

  const companyId = req.params.id === 'new' ? null : req.params.id;
  const { name, registrationNumber, address, phone, email } = req.body;

  // Validate input
  const errors = [];
  if (!name || name.trim() === '') errors.push('Name is required');

  if (errors.length > 0) {
    let selectedCompany = null;
    const selectedCompanyID = req.session.selectedCompanyID || req.session.user.DefaultCompanyID;
    if (selectedCompanyID) {
      selectedCompany = await Company.findById(selectedCompanyID).lean();
    }
    return res.render('company-edit', {
      title: 'Add Company - UPfy.me',
      user: req.session.user,
      company: { Name: name, CompanyRegistrationNumber: registrationNumber, Address: address, Phone: phone, Email: email },
      currentPage: 'companies',
      selectedCompanyID: selectedCompanyID,
      isAdmin: req.session.user.IsAdmin,
      isNew: true,
      selectedCompany: selectedCompany || { Name: 'No company selected' },
      errors: errors
    });
  }

  try {
    let company;
    if (companyId) {
      company = await Company.findByIdAndUpdate(companyId, {
        Name: name,
        CompanyRegistrationNumber: registrationNumber,
        Address: address,
        Phone: phone,
        Email: email
      }, { new: true, runValidators: true }).lean();
      if (!company) return res.status(404).send('Company not found');
    } else {
      company = await Company.create({
        Name: name,
        CompanyRegistrationNumber: registrationNumber,
        Address: address,
        Phone: phone,
        Email: email
      });
    }
    res.redirect('/admin/companies');
  } catch (error) {
    console.error('Error saving company:', error);
    let selectedCompany = null;
    const selectedCompanyID = req.session.selectedCompanyID || req.session.user.DefaultCompanyID;
    if (selectedCompanyID) {
      selectedCompany = await Company.findById(selectedCompanyID).lean();
    }
    res.render('company-edit', {
      title: 'Add Company - UPfy.me',
      user: req.session.user,
      company: { Name: name, CompanyRegistrationNumber: registrationNumber, Address: address, Phone: phone, Email: email },
      currentPage: 'companies',
      selectedCompanyID: selectedCompanyID,
      isAdmin: req.session.user.IsAdmin,
      isNew: true,
      selectedCompany: selectedCompany || { Name: 'No company selected' },
      errors: [error.message]
    });
  }
});

app.post('/admin/companies/add', async (req, res) => {
  const { name, registrationNumber, address, phone, email } = req.body;
  try {
    // Create a new company
    const company = new Company({
      Name: name,
      CompanyRegistrationNumber: registrationNumber,
      Address: address,
      Phone: phone,
      Email: email
    });
    await company.save();

    // Update the current user to include the new company in their Companies array
    await User.findByIdAndUpdate(req.session.user._id, {
      $push: { Companies: company._id }
    });

    res.redirect('/admin/companies');
  } catch (error) {
    res.status(500).send('Error creating company: ' + error.message);
  }
});



// GET /signup - Render the signup page
app.get('/signup', (req, res) => {
  res.render('signup', {
    title: 'Register',
    error: null // No error initially
  });
});

// POST /signup - Handle user and company registration
app.post('/signup', async (req, res) => {
  const {
    userName,
    userEmail,
    userPassword,
    userConfirmPassword,
    userPhone,
    companyName,
    companyRegistrationNumber,
    companyAddress,
    companyPhone,
    companyEmail
  } = req.body;

  // Validate required fields
  if (!userName || !userEmail || !userPassword || !userConfirmPassword || !companyName) {
    return res.render('signup', {
      title: 'Register',
      error: 'All required fields must be filled'
    });
  }

  // Validate password match
  if (userPassword !== userConfirmPassword) {
    return res.render('signup', {
      title: 'Register',
      error: 'Passwords do not match'
    });
  }

  try {
    // Check if user email already exists
    const existingUser = await User.findOne({ Email: userEmail }).lean();
    if (existingUser) {
      return res.render('signup', {
        title: 'Register',
        error: 'Email is already registered'
      });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userPassword, saltRounds);

    // Create new Company
    const newCompany = new Company({
      Name: companyName,
      CompanyRegistrationNumber: companyRegistrationNumber || null,
      Address: companyAddress || null,
      Phone: companyPhone || null,
      Email: companyEmail || null
    });

    const savedCompany = await newCompany.save();

    // Create new User with reference to Company (assuming you might want to link them later)
    const newUser = new User({
      Email: userEmail,
      Password: hashedPassword,
      Name: userName,
      Phone: userPhone || null
      // You could add a CompanyID field here if you want to link User to Company
      // CompanyID: savedCompany._id
    });

    await newUser.save();

    // Redirect to a thank you page or login page
    res.redirect('/admin/login?signup=success');
  } catch (error) {
    console.error('Error during registration:', error);
    res.render('signup', {
      title: 'Register',
      error: 'Error during registration: ' + error.message
    });
  }
});








app.use('/api', eventRoutes);

// Configuração do certificado autoassinado
const options = {
  key: fs.readFileSync(process.env.SSL_KEY),
  cert: fs.readFileSync(process.env.SSL_CERT)
};

// Start server
const PORT = process.env.PORT || 3000;
https.createServer(options, app).listen(3000, () => {
  console.log('Servidor rodando em HTTPS na porta 3000');
});