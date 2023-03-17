const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  timestamp: String,
  coin: String
});

const Empire = mongoose.model('Empire', logSchema);

module.exports = Empire;
