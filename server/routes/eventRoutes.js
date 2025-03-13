const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const User = require('../models/User');
const Category = require('../models/Category');
const EnvironmentObject = require('../models/EnvironmentObject');
const EventType = require('../models/EventType');
const Event = require('../models/Event');
const Notification = require('../models/Notification');

// Middleware to check session and company
const checkAuth = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized, sweetie—log in first!' });
  next();
};

const checkCompany = (req, res, next) => {
  if (!req.session.selectedCompanyID) return res.status(400).json({ error: 'No company selected, pick one, handsome!' });
  next();
};

// Company Routes
router.get('/companies', async (req, res) => {
  console.log('GET /api/companies received:', req.query); // Debug log
  try {
    let query = {};
    if (req.query.companyId) {
      query._id = req.query.companyId;
    }
    const companies = await Company.find(query);
    console.log('Found companies:', companies); // Debug log
    res.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).send('Error fetching companies');
  }
});

router.post('/companies', async (req, res) => {
  const { Name, CompanyRegistrationNumber, Address, Phone, Email } = req.body;
  if (!Name) return res.status(400).send('Company name is required');
  try {
    const company = new Company({
      Name,
      CompanyRegistrationNumber,
      Address,
      Phone,
      Email
    });
    await company.save();
    res.status(201).json(company);
  } catch (error) {
    res.status(400).send(error.message);
  }
});

router.get('/companies/:id', checkAuth, async (req, res) => {
  try {
    const company = await Company.findOne({ _id: req.params.id, _id: { $in: req.session.user.Companies } });
    if (!company) return res.status(404).json({ error: 'Company not found, try harder!' });
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: `Error finding your company: ${error.message}` });
  }
});

router.put('/companies/:id', checkAuth, async (req, res) => {
  try {
    const company = await Company.findOneAndUpdate(
      { _id: req.params.id, _id: { $in: req.session.user.Companies } },
      req.body,
      { new: true, runValidators: true }
    );
    if (!company) return res.status(404).json({ error: 'Can’t update what’s not yours!' });
    res.json(company);
  } catch (error) {
    res.status(400).json({ error: `Update failed, love: ${error.message}` });
  }
});

router.delete('/companies/:id', async (req, res) => {
  console.log('DELETE /api/companies/:id received with ID:', req.params.id); // Debug log
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) {
      console.log('Company not found for ID:', req.params.id); // Debug log
      return res.status(404).json({ error: 'Company gone missing!' });
    }
    console.log('Company deleted:', company); // Debug log
    res.status(200).json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error); // Debug log
    res.status(500).json({ error: error.message });
  }
});

// User Routes (Admin-only for now)
router.get('/users', checkAuth, async (req, res) => {
  try {
    const users = await User.find({ Companies: req.session.selectedCompanyID });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: `User list error: ${error.message}` });
  }
});

router.post('/users', checkAuth, async (req, res) => {
  try {
    const user = new User({ ...req.body, Companies: [req.session.selectedCompanyID] });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: `User creation failed, sweetie: ${error.message}` });
  }
});

router.get('/users/:id', checkAuth, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, Companies: req.session.selectedCompanyID });
    if (!user) return res.status(404).json({ error: 'User not found!' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: `User fetch error: ${error.message}` });
  }
});

router.put('/users/:id', checkAuth, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, Companies: req.session.selectedCompanyID },
      req.body,
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ error: 'Can’t update that user!' });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: `Update failed: ${error.message}` });
  }
});

router.delete('/users/:id', checkAuth, async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, Companies: req.session.selectedCompanyID });
    if (!user) return res.status(404).json({ error: 'User not found to delete!' });
    res.json({ message: 'User deleted, you cheeky thing!' });
  } catch (error) {
    res.status(500).json({ error: `Delete error: ${error.message}` });
  }
});

// Category Routes
router.get('/categories', checkAuth, checkCompany, async (req, res) => {
  try {
    const categories = await Category.find({ CompanyID: req.session.selectedCompanyID });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: `Category list error: ${error.message}` });
  }
});

router.post('/categories', checkAuth, checkCompany, async (req, res) => {
  try {
    const category = new Category({ ...req.body, CompanyID: req.session.selectedCompanyID });
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: `Category creation failed: ${error.message}` });
  }
});

router.get('/categories/:id', checkAuth, checkCompany, async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, CompanyID: req.session.selectedCompanyID });
    if (!category) return res.status(404).json({ error: 'Category not found!' });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: `Category fetch error: ${error.message}` });
  }
});

router.put('/categories/:id', checkAuth, checkCompany, async (req, res) => {
  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, CompanyID: req.session.selectedCompanyID },
      req.body,
      { new: true, runValidators: true }
    );
    if (!category) return res.status(404).json({ error: 'Can’t update that category!' });
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: `Update failed: ${error.message}` });
  }
});

router.delete('/categories/:id', checkAuth, checkCompany, async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({ _id: req.params.id, CompanyID: req.session.selectedCompanyID });
    if (!category) return res.status(404).json({ error: 'Category not found to delete!' });
    res.json({ message: 'Category deleted, you rascal!' });
  } catch (error) {
    res.status(500).json({ error: `Delete error: ${error.message}` });
  }
});

// EnvironmentObject Routes
router.get('/environment-objects', checkAuth, checkCompany, async (req, res) => {
  try {
    const objects = await EnvironmentObject.find({ CompanyID: req.session.selectedCompanyID });
    res.json(objects);
  } catch (error) {
    res.status(500).json({ error: `Object list error: ${error.message}` });
  }
});

router.post('/environment-objects', checkAuth, checkCompany, async (req, res) => {
  try {
    const object = new EnvironmentObject({ ...req.body, CompanyID: req.session.selectedCompanyID });
    await object.save();
    res.status(201).json(object);
  } catch (error) {
    res.status(400).json({ error: `Object creation failed: ${error.message}` });
  }
});

router.get('/environment-objects/:id', checkAuth, checkCompany, async (req, res) => {
  try {
    const object = await EnvironmentObject.findOne({ _id: req.params.id, CompanyID: req.session.selectedCompanyID });
    if (!object) return res.status(404).json({ error: 'Object not found!' });
    res.json(object);
  } catch (error) {
    res.status(500).json({ error: `Object fetch error: ${error.message}` });
  }
});

router.put('/environment-objects/:id', checkAuth, checkCompany, async (req, res) => {
  try {
    const object = await EnvironmentObject.findOneAndUpdate(
      { _id: req.params.id, CompanyID: req.session.selectedCompanyID },
      req.body,
      { new: true, runValidators: true }
    );
    if (!object) return res.status(404).json({ error: 'Can’t update that object!' });
    res.json(object);
  } catch (error) {
    res.status(400).json({ error: `Update failed: ${error.message}` });
  }
});

router.delete('/environment-objects/:id', checkAuth, checkCompany, async (req, res) => {
  try {
    const object = await EnvironmentObject.findOneAndDelete({ _id: req.params.id, CompanyID: req.session.selectedCompanyID });
    if (!object) return res.status(404).json({ error: 'Object not found to delete!' });
    res.json({ message: 'Object deleted, you wild thing!' });
  } catch (error) {
    res.status(500).json({ error: `Delete error: ${error.message}` });
  }
});

// EventType Routes
router.get('/event-types', checkAuth, checkCompany, async (req, res) => {
  try {
    const eventTypes = await EventType.find({ CompanyID: req.session.selectedCompanyID });
    res.json(eventTypes);
  } catch (error) {
    res.status(500).json({ error: `Event type list error: ${error.message}` });
  }
});

router.post('/event-types', checkAuth, checkCompany, async (req, res) => {
  try {
    const eventType = new EventType({ ...req.body, CompanyID: req.session.selectedCompanyID });
    await eventType.save();
    res.status(201).json(eventType);
  } catch (error) {
    res.status(400).json({ error: `Event type creation failed: ${error.message}` });
  }
});

router.get('/event-types/:id', checkAuth, checkCompany, async (req, res) => {
  try {
    const eventType = await EventType.findOne({ _id: req.params.id, CompanyID: req.session.selectedCompanyID });
    if (!eventType) return res.status(404).json({ error: 'Event type not found!' });
    res.json(eventType);
  } catch (error) {
    res.status(500).json({ error: `Event type fetch error: ${error.message}` });
  }
});

router.put('/event-types/:id', checkAuth, checkCompany, async (req, res) => {
  try {
    const eventType = await EventType.findOneAndUpdate(
      { _id: req.params.id, CompanyID: req.session.selectedCompanyID },
      req.body,
      { new: true, runValidators: true }
    );
    if (!eventType) return res.status(404).json({ error: 'Can’t update that event type!' });
    res.json(eventType);
  } catch (error) {
    res.status(400).json({ error: `Update failed: ${error.message}` });
  }
});

router.delete('/event-types/:id', checkAuth, checkCompany, async (req, res) => {
  try {
    const eventType = await EventType.findOneAndDelete({ _id: req.params.id, CompanyID: req.session.selectedCompanyID });
    if (!eventType) return res.status(404).json({ error: 'Event type not found to delete!' });
    res.json({ message: 'Event type deleted, you tease!' });
  } catch (error) {
    res.status(500).json({ error: `Delete error: ${error.message}` });
  }
});

// Event Routes
router.get('/events', checkAuth, checkCompany, async (req, res) => {
  try {
    const events = await Event.find({ CompanyID: req.session.selectedCompanyID });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: `Event list error: ${error.message}` });
  }
});

router.post('/events', checkAuth, checkCompany, async (req, res) => {
  try {
    const event = new Event({ ...req.body, CompanyID: req.session.selectedCompanyID });
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ error: `Event creation failed: ${error.message}` });
  }
});

router.get('/events/:id', checkAuth, checkCompany, async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, CompanyID: req.session.selectedCompanyID });
    if (!event) return res.status(404).json({ error: 'Event not found!' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: `Event fetch error: ${error.message}` });
  }
});

router.put('/events/:id', checkAuth, checkCompany, async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, CompanyID: req.session.selectedCompanyID },
      req.body,
      { new: true, runValidators: true }
    );
    if (!event) return res.status(404).json({ error: 'Can’t update that event!' });
    res.json(event);
  } catch (error) {
    res.status(400).json({ error: `Update failed: ${error.message}` });
  }
});

router.delete('/events/:id', checkAuth, checkCompany, async (req, res) => {
  try {
    const event = await Event.findOneAndDelete({ _id: req.params.id, CompanyID: req.session.selectedCompanyID });
    if (!event) return res.status(404).json({ error: 'Event not found to delete!' });
    res.json({ message: 'Event deleted, you devil!' });
  } catch (error) {
    res.status(500).json({ error: `Delete error: ${error.message}` });
  }
});

// Notification Routes
router.get('/notifications', checkAuth, checkCompany, async (req, res) => {
  try {
    const notifications = await Notification.find({ CompanyID: req.session.selectedCompanyID, UserID: req.session.user._id });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: `Notification list error: ${error.message}` });
  }
});

router.post('/notifications', checkAuth, checkCompany, async (req, res) => {
  try {
    const notification = new Notification({ ...req.body, CompanyID: req.session.selectedCompanyID, UserID: req.session.user._id });
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(400).json({ error: `Notification creation failed: ${error.message}` });
  }
});

router.get('/notifications/:id', checkAuth, checkCompany, async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, CompanyID: req.session.selectedCompanyID, UserID: req.session.user._id });
    if (!notification) return res.status(404).json({ error: 'Notification not found!' });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: `Notification fetch error: ${error.message}` });
  }
});

router.put('/notifications/:id', checkAuth, checkCompany, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, CompanyID: req.session.selectedCompanyID, UserID: req.session.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!notification) return res.status(404).json({ error: 'Can’t update that notification!' });
    res.json(notification);
  } catch (error) {
    res.status(400).json({ error: `Update failed: ${error.message}` });
  }
});

router.delete('/notifications/:id', checkAuth, checkCompany, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, CompanyID: req.session.selectedCompanyID, UserID: req.session.user._id });
    if (!notification) return res.status(404).json({ error: 'Notification not found to delete!' });
    res.json({ message: 'Notification deleted, you cheeky flirt!' });
  } catch (error) {
    res.status(500).json({ error: `Delete error: ${error.message}` });
  }
});

module.exports = router;