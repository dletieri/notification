const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  Name: { type: String, required: true },
  CompanyRegistrationNumber: String,
  Address: String,
  Phone: String,
  Email: String,
  RegistrationDate: { type: Date, default: Date.now },
  ParentCompanyID: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null }
});

module.exports = mongoose.model('Company', companySchema);