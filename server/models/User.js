const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  Companies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }],
  DefaultCompanyID: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  Name: { type: String, required: true },
  Email: { type: String, required: true, unique: true },
  Password: { type: String, required: true }, // To be hashed later with bcrypt
  Role: String,
  IsAdmin: { type: Boolean, default: false }, // Add this if not present
  RegistrationDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);

