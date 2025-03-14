const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  CompanyID: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  Name: { type: String, required: true },
  Description: String
});

module.exports = mongoose.model('Category', categorySchema);