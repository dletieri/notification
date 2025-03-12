const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  CompanyID: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  ObjectID: { type: mongoose.Schema.Types.ObjectId, ref: 'EnvironmentObject', required: true },
  UserID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  EventTypeID: { type: mongoose.Schema.Types.ObjectId, ref: 'EventType', required: true },
  DateTime: { type: Date, default: Date.now },
  Description: String,
  Photos: [{ url: String, type: { type: String, enum: ['photo'] } }],
  Status: { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open' },
  ResolutionDate: Date
});

module.exports = mongoose.model('Event', eventSchema);