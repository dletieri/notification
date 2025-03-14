const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  name: String,
  description: String,
  selectedEvent: String,
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Submission', submissionSchema);