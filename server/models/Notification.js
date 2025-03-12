const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  CompanyID: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  UserID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  EventID: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  DateTime: { type: Date, default: Date.now },
  Message: String,
  Type: { type: String, enum: ['Alert', 'Update', 'Resolution'], default: 'Alert' },
  Status: { type: String, enum: ['Unread', 'Read'], default: 'Unread' }
});

module.exports = mongoose.model('Notification', notificationSchema);