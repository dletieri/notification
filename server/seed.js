require('dotenv').config(); // Load that sexy .env file, baby!
const mongoose = require('mongoose');
const Company = require('./models/Company');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB for seeding, darling!');

    
    




// Seed company
const company1 = new Company({ Name: 'Test Company' });
await company1.save();

// Seed category
const category1 = new Category({ CompanyID: company1._id, Name: 'Safety' });
await category1.save();

// Seed event types
const eventType1 = new EventType({
  CompanyID: company1._id,
  CategoryID: category1._id,
  Name: 'Incident',
  Description: 'General incident reporting'
});
const eventType2 = new EventType({
  CompanyID: company1._id,
  CategoryID: category1._id,
  Name: 'Maintenance',
  Description: 'Scheduled maintenance event'
});
await eventType1.save();
await eventType2.save();

// Seed environment object
const envObject1 = new EnvironmentObject({
  CompanyID: company1._id,
  Name: 'Machine A'
});
await envObject1.save();













    console.log('Seed data added, you hot thing!');
    mongoose.connection.close();
  })
  .catch(err => console.error('Seeding error:', err));