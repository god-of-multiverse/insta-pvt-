const Post = require('../models/Post');

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
exports.createPost = async (req, res, next) => {
  try {
    console.log('📝 Creating post...');
    const { caption, circle } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const userId = req.user.id;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
    
    const post = new Post({
      user: userId,
      image: imageUrl,
      caption: caption || '',
      circle: circle || 'General'
    });

    await post.save();
    console.log('✅ Post created in circle:', post.circle);

    await post.populate('user', 'username');

    res.status(201).json({
      message: 'Post created!',
      post: {
        id: post._id,
        image: post.image,
        caption: post.caption,
        circle: post.circle,
        createdAt: post.createdAt,
        user: post.user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all posts (supports query filtering by circle)
// @route   GET /api/posts
// @access  Private/Public
exports.getPosts = async (req, res, next) => {
  try {
    const { circle } = req.query;
    const query = circle && circle !== 'All' ? { circle } : {};

    const posts = await Post.find(query)
      .populate('user', 'username')
      .sort({ createdAt: -1 });
    
    res.json(posts);
  } catch (error) {
    next(error);
  }
};

// @desc    Get posts by user id
// @route   GET /api/posts/user/:userId
// @access  Private/Public
exports.getUserPosts = async (req, res, next) => {
  try {
    const posts = await Post.find({ user: req.params.userId })
      .populate('user', 'username')
      .sort({ createdAt: -1 });
    
    res.json(posts);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await Post.deleteOne({ _id: req.params.id });

    res.json({ message: 'Post deleted', postId: req.params.id });
  } catch (error) {
    next(error);
  }
};
