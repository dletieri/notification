require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./models/Event');
const EnvironmentObject = require('./models/EnvironmentObject');
const EventType = require('./models/EventType');

async function seedEvents() {
    await mongoose.connect(process.env.MONGO_URI, { 
        useNewUrlParser: true, 
        useUnifiedTopology: true 
    });

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

    const events = [];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const envObj of environmentObjects) {
        const categoryEventTypes = eventTypesByCategory[envObj.CategoryID] || eventTypes;
        
        // Para cada um dos 30 dias
        for (let day = 0; day < 30; day++) {
            // Gera número aleatório de eventos entre 5 e 35 para este dia
            const eventsPerDay = Math.floor(Math.random() * (35 - 5 + 1)) + 5;
            
            // Calcula a data base para este dia
            const baseDate = new Date(thirtyDaysAgo.getTime() + (day * 24 * 60 * 60 * 1000));

            // Gera os eventos para este dia
            for (let i = 0; i < eventsPerDay; i++) {
                const randomEventType = categoryEventTypes[Math.floor(Math.random() * categoryEventTypes.length)];
                // Adiciona variação randomica de até 24 horas a partir da data base
                const randomTimeOffset = Math.random() * 24 * 60 * 60 * 1000;
                const eventDate = new Date(baseDate.getTime() + randomTimeOffset);

                events.push({
                    CompanyID: envObj.CompanyID,
                    CategoryID: envObj.CategoryID,
                    EventTypeID: randomEventType._id,
                    EnvironmentObjectID: envObj._id,
                    Date: eventDate
                });
            }
        }
    }

    // Insert all events
    await Event.insertMany(events);
    console.log(`Seeded ${events.length} events (5-35 per day per environment object)`);
    mongoose.connection.close();
}

seedEvents().catch(err => {
    console.error('Error seeding events:', err);
    mongoose.connection.close();
});