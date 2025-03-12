const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Submission = require('../models/Submission');

// Submit form data
router.post('/submit', async (req, res) => {
  try {
    const { name, description, selectedEvent } = req.body;
    const submission = new Submission({ name, description, selectedEvent });
    await submission.save();
    res.status(201).json({ message: 'Submission saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save submission' });
  }
});

// Create new event
router.post('/events', async (req, res) => {
  try {
    const { name, description, selectedEvent } = req.body;
    const event = new Event({ name, description, selectedEvent });
    await event.save();
    res.status(201).json({ message: 'Object created successfully', id: event._id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create object' });
  }
});

// Update event
router.put('/events/:id', async (req, res) => {
  try {
    const { name, description, selectedEvent } = req.body;
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { name, description, selectedEvent },
      { new: true, runValidators: true }
    );
    if (!updatedEvent) {
      return res.status(404).json({ error: 'Object not found' });
    }
    res.json({ message: 'Object updated successfully', id: updatedEvent._id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update object' });
  }
});

// Delete event
router.delete('/events/:id', async (req, res) => {
  try {
    const deletedEvent = await Event.findByIdAndDelete(req.params.id);
    if (!deletedEvent) {
      return res.status(404).json({ error: 'Object not found' });
    }
    res.json({ message: 'Object deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete object' });
  }
});

module.exports = router;