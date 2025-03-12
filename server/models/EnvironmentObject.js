const mongoose = require('mongoose');

const environmentObjectSchema = new mongoose.Schema({
  CompanyID: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  CategoryID: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  Name: { type: String, required: true },
  Description: String,
  Location: String,
  QRCode: String,
  Status: { type: String, enum: ['Active', 'Inactive', 'Under Maintenance'], default: 'Active' },
  LastEventDate: Date,
  RegistrationDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EnvironmentObject', environmentObjectSchema);