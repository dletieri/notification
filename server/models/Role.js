const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  CompanyID: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  Name: { type: String, required: true },
  Description: { type: String, required: false, default: '' },
  CreatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Role', roleSchema);