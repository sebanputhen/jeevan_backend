const mongoose = require('mongoose');

const familyMovementSchema = new mongoose.Schema({
  family: {
    type: String,
    ref: 'Family',
    required: true
  },
  familyName: {
    type: String,
    required: true
  },
  familyNumber: {
    type: String,
    required: true
  },
  sourceParish: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  sourceParishName: {
    type: String,
    required: true
  },
  sourceKoottayma: {
    type: String,  // Using the koottaymaId directly
    required: true
  },
  sourceKoottaymaName: {
    type: String,
    required: true
  },
  destinationParish: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  destinationParishName: {
    type: String,
    required: true
  },
  destinationKoottayma: {
    type: String,  // Using the koottaymaId directly
    required: true
  },
  destinationKoottaymaName: {
    type: String,
    required: true
  },
  movedDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('FamilyMovement', familyMovementSchema);