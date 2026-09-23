const mongoose = require('mongoose');

/** One question and answer, kept so the conversation survives a reload. */
const assistantTurnSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    intent: { type: String, default: null },
    confidence: { type: Number, default: 0 },
    ok: { type: Boolean, default: false },
    rated: { type: String, enum: ['up', 'down', null], default: null },
    taughtId: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AssistantTurn', assistantTurnSchema);
