const mongoose = require('mongoose');

/**
 * The agent's learned state: feedback weights, taught answers, and the log of
 * questions it could not answer. One shared document — what one user teaches
 * it, everyone benefits from.
 */
const assistantMemorySchema = new mongoose.Schema(
  {
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AssistantMemory', assistantMemorySchema);
