const GroupMessage = require('../models/GroupMessage');
const Group = require('../models/Group');

exports.sendGroupMessage = async (req, res, next) => {
  try {
    const { groupId, text } = req.body;

    if (!groupId || !text) {
      return res.status(400).json({ error: 'groupId and text are required' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some((member) => member.toString() === req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'You must be a member to send messages' });
    }

    const message = new GroupMessage({ group: groupId, sender: req.user.id, text });
    await message.save();

    const populated = await GroupMessage.findById(message._id).populate('sender', 'username');
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

exports.getGroupMessages = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some((member) => member.toString() === req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'You must be a member to view messages' });
    }

    const messages = await GroupMessage.find({ group: req.params.groupId })
      .populate('sender', 'username')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    next(error);
  }
};
