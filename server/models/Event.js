const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  CompanyID: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  CategoryID: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  EventTypeID: { type: mongoose.Schema.Types.ObjectId, ref: 'EventType', required: true },
  EnvironmentObjectID: { type: mongoose.Schema.Types.ObjectId, ref: 'EnvironmentObject', required: true },
  UserID: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Removed required: true
  Date: { type: Date, required: true },
  Details: Object,
  SubmissionID: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' }
});

module.exports = mongoose.model('Event', eventSchema);