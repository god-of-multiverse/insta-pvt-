const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    console.log('📝 Signup attempt:', { username, email });

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Please provide username, email and password' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    if (existingUser) {
      console.log('❌ User already exists');
      return res.status(400).json({ 
        error: 'Username or email already exists' 
      });
    }

    // Create user
    const user = new User({ username, email, password });
    await user.save();
    console.log('✅ User saved:', user._id);

    // Create token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET || 'my_secret_key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created! 🎉',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isPrivate: user.isPrivate
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    console.log('📝 Login attempt:', { email });

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Wrong password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'my_secret_key',
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful');
    res.json({
      message: 'Login successful! ✅',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isPrivate: user.isPrivate
      }
    });
  } catch (error) {
    next(error);
  }
};
