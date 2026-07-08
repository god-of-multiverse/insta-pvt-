const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res, next) => {
  try {
    const { recipientId, text } = req.body;
    if (!recipientId || !text) {
      return res.status(400).json({ error: 'recipientId and text are required' });
    }

    const message = new Message({
      sender: req.user.id,
      recipient: recipientId,
      text: text
    });

    await message.save();
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

// @desc    Get conversation history between logged-in user and a friend
// @route   GET /api/messages/:friendId
// @access  Private
exports.getMessages = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: friendId },
        { sender: friendId, recipient: userId }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    next(error);
  }
};

// @desc    Get list of all other users to chat with
// @route   GET /api/messages/users
// @access  Private
exports.getChatUsers = async (req, res, next) => {
  try {
    // Return all other users in the system (for the 50 friends limit, returning all other registered users works perfectly)
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select('username email profilePicture bio');
    res.json(users);
  } catch (error) {
    next(error);
  }
};
