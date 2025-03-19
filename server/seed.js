    require('dotenv').config(); 

    
          

          

              const mongoose = require('mongoose');
const Event = require('./models/Event');
const EnvironmentObject = require('./models/EnvironmentObject');
const EventType = require('./models/EventType');




  async function seedEvents() {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  


  // Fetch existing environment objects
  const environmentObjects = await EnvironmentObject.find().lean();
  if (environmentObjects.length !== 7) {
    console.error('Expected 7 environment objects, found:', environmentObjects.length);
    return;
  }

  // Fetch existing event types
  const eventTypes = await EventType.find().lean();
  if (eventTypes.length === 0) {
    console.error('No event types found. Please seed event types first.');
    return;
  }

  // Group event types by CategoryID for efficient filtering
  const eventTypesByCategory = {};
  eventTypes.forEach(et => {
    if (!eventTypesByCategory[et.CategoryID]) eventTypesByCategory[et.CategoryID] = [];
    eventTypesByCategory[et.CategoryID].push(et);
  });

  // Seed 40 events per environment object
  const events = [];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  for (const envObj of environmentObjects) {
    const categoryEventTypes = eventTypesByCategory[envObj.CategoryID] || eventTypes; // Fallback to all if category mismatch
    for (let i = 0; i < 40; i++) { // 40 events per object
      const randomEventType = categoryEventTypes[Math.floor(Math.random() * categoryEventTypes.length)];
      const randomDate = new Date(thirtyDaysAgo.getTime() + Math.random() * (30 * 24 * 60 * 60 * 1000));

      events.push({
        CompanyID: envObj.CompanyID,
        CategoryID: envObj.CategoryID,
        EventTypeID: randomEventType._id,
        EnvironmentObjectID: envObj._id,
        Date: randomDate
      });
    }
  }

  // Insert all events
  await Event.insertMany(events);
  console.log(`Seeded ${events.length} events (40 per environment object)`);
  mongoose.connection.close();
}

seedEvents().catch(err => {
  console.error('Error seeding events:', err);
  mongoose.connection.close();
});