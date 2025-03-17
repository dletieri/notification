const mongoose = require('mongoose');

const eventTypeSchema = new mongoose.Schema({
  CompanyID: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  CategoryID: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  Name: { type: String, required: true },
  Description: String
  // Form field is ignored as per request
});

module.exports = mongoose.model('EventType', eventTypeSchema);