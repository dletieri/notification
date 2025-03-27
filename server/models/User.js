const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  Email: { type: String, required: true, unique: true },
  Password: { type: String, required: true },
  Name: { type: String, required: true },
  Phone: { type: String },
  Role: { type: String }, // Campo de texto existente (pode ser mantido ou removido, dependendo da sua necessidade)
  IsAdmin: { type: Boolean, default: false },
  DefaultCompanyID: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  Companies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Company' }],
  Roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }], // Novo campo array de Roles
  RegistrationDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);