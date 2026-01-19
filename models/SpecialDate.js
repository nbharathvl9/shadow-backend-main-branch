const mongoose = require('mongoose');

const SpecialDateSchema = new mongoose.Schema({
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ['exam', 'holiday'], required: true },
    title: { type: String, required: true }
}, { timestamps: true });

// Index for efficient querying
SpecialDateSchema.index({ classId: 1, date: 1 });

module.exports = mongoose.model('SpecialDate', SpecialDateSchema);
