const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});

module.exports = (connection) => {
    return connection.models.Counter || connection.model('Counter', counterSchema);
};
