const express = require('express');
const auth = require('../middleware/auth');
const assistant = require('../lib/assistant');
const AssistantMemory = require('../models/AssistantMemory');
const AssistantTurn = require('../models/AssistantTurn');

const router = express.Router();

/** The brain is a single shared document, created on first use. */
async function loadMemory() {
  let doc = await AssistantMemory.findOne();
  if (!doc) doc = await AssistantMemory.create({ data: assistant.emptyMemory() });
  return doc;
}

const adminOnly = (req, res, next) =>
  req.user?.role === 'admin'
    ? next()
    : res.status(403).json({ error: 'Admins only.' });

/** POST /api/assistant/ask */
router.post('/ask', auth, async (req, res, next) => {
  try {
    const question = String(req.body?.question || '').trim();
    if (!question) return res.status(400).json({ error: 'Ask me something.' });
    if (question.length > 500) return res.status(400).json({ error: 'That question is too long.' });

    const doc = await loadMemory();
    let mem = assistant.normalizeMemory(doc.data);
    const result = assistant.ask(question, mem);

    mem.stats.asked += 1;
    if (result.ok) mem.stats.answered += 1;
    else mem = assistant.noteUnanswered(mem, question, req.user.id);

    doc.data = mem;
    doc.markModified('data');
    await doc.save();

    const turn = await AssistantTurn.create({
      user: req.user.id,
      question,
      answer: result.answer,
      intent: result.intent,
      confidence: result.confidence,
      ok: result.ok,
    });

    res.json(turn);
  } catch (error) {
    next(error);
  }
});

/** GET /api/assistant/history */
router.get('/history', auth, async (req, res, next) => {
  try {
    const turns = await AssistantTurn.find({ user: req.user.id })
      .sort({ createdAt: 1 })
      .limit(50);
    res.json(turns);
  } catch (error) {
    next(error);
  }
});

/** POST /api/assistant/feedback */
router.post('/feedback', auth, async (req, res, next) => {
  try {
    const { turnId, helpful, correction } = req.body || {};
    const turn = await AssistantTurn.findOne({ _id: turnId, user: req.user.id });
    if (!turn) return res.status(404).json({ error: 'No such answer.' });

    const doc = await loadMemory();
    const { memory, taught } = assistant.learn(assistant.normalizeMemory(doc.data), {
      question: turn.question,
      intent: turn.intent,
      helpful: !!helpful,
      correction,
      userId: req.user.id,
    });

    doc.data = memory;
    doc.markModified('data');
    await doc.save();

    turn.rated = helpful ? 'up' : 'down';
    if (taught) turn.taughtId = taught.id;
    await turn.save();

    res.json({ ok: true, rated: turn.rated, taught: !!taught });
  } catch (error) {
    next(error);
  }
});

/** DELETE /api/assistant/history */
router.delete('/history', auth, async (req, res, next) => {
  try {
    await AssistantTurn.deleteMany({ user: req.user.id });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/** GET /api/assistant/insights — admin only. */
router.get('/insights', auth, adminOnly, async (req, res, next) => {
  try {
    const doc = await loadMemory();
    res.json(assistant.insights(doc.data));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
