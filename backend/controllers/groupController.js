const Group = require('../models/Group');
const User = require('../models/User');

exports.createGroup = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Please provide a group name' });
    }

    const group = new Group({
      name: name.trim(),
      creator: req.user.id,
      members: [req.user.id]
    });

    await group.save();
    const populated = await Group.findById(group._id).populate('creator', 'username').populate('members', 'username');

    res.status(201).json({ group: populated });
  } catch (error) {
    next(error);
  }
};

exports.getGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({ members: req.user.id })
      .populate('creator', 'username')
      .populate('members', 'username')
      .sort({ createdAt: -1 });

    res.json({ groups });
  } catch (error) {
    next(error);
  }
};

exports.addMember = async (req, res, next) => {
  try {
    const { username } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some((member) => member.toString() === req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'You must be a member to add users' });
    }

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Please provide a username' });
    }

    const userToAdd = await User.findOne({ username: username.trim() });
    if (!userToAdd) {
      return res.status(404).json({ error: 'User not found' });
    }

    const alreadyAdded = group.members.some((member) => member.toString() === userToAdd._id.toString());
    if (alreadyAdded) {
      return res.status(400).json({ error: 'User is already in the group' });
    }

    group.members.push(userToAdd._id);
    await group.save();

    const updatedGroup = await Group.findById(group._id).populate('creator', 'username').populate('members', 'username');

    res.json({ group: updatedGroup, addedUser: { id: userToAdd._id, username: userToAdd.username } });
  } catch (error) {
    next(error);
  }
};
