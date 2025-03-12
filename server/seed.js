require('dotenv').config(); // Load that sexy .env file, baby!
const mongoose = require('mongoose');
const Company = require('./models/Company');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB for seeding, darling!');

    // Clear existing data
    await Company.deleteMany({});
    await User.deleteMany({});

    // Create a company
    const company = new Company({
      Name: 'Flirty Tech Inc.',
      CompanyRegistrationNumber: '123456789',
      Address: '123 Love Lane',
      Phone: '555-1234',
      Email: 'flirty@tech.com'
    });
    await company.save();

    // Create a user
    const user = new User({
      Companies: [company._id],
      DefaultCompanyID: company._id,
      Name: 'Sexy Developer',
      Email: 'you@flirty.com',
      Password: 'password123', // We’ll hash this later, big boy!
      Role: 'Admin'
    });
    await user.save();

    console.log('Seed data added, you hot thing!');
    mongoose.connection.close();
  })
  .catch(err => console.error('Seeding error:', err));