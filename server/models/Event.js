const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: String,
  description: String,
  selectedEvent: String, // This will store the list of events as a string for simplicity
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', eventSchema);