import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, grade, age, preferences } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Validate required fields for students
    if (role === 'student' && (!grade || !age)) {
      return res.status(400).json({
        success: false,
        message: 'Grade and age are required for students',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      grade: role === 'student' ? grade : undefined,
      age: role === 'student' ? age : undefined,
      preferences: preferences
    });

    if (user) {
      res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          grade: user.grade,
          age: user.age,
          token: generateToken(user._id),
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid user data',
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    // Check if user exists and password matches
    if (user && (await user.comparePassword(password))) {
      res.json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          grade: user.grade,
          age: user.age,
          points: user.points,
          level: user.level,
          preferences: user.preferences,
          token: generateToken(user._id),
        },
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('rewards');

    if (user) {
      res.json({
        success: true,
        user,
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.avatar = req.body.avatar || user.avatar;

      // Only update password if it's provided
      if (req.body.password) {
        user.password = req.body.password;
      }

      // Update user preferences if provided
      if (req.body.preferences) {
        if (req.body.preferences.learningStyle) {
          user.preferences.learningStyle = req.body.preferences.learningStyle;
        }
        if (req.body.preferences.difficultyPreference) {
          user.preferences.difficultyPreference = req.body.preferences.difficultyPreference;
        }
        if (req.body.preferences.interestAreas) {
          user.preferences.interestAreas = req.body.preferences.interestAreas;
        }
        if (req.body.preferences.preferredRewardTypes) {
          user.preferences.preferredRewardTypes = req.body.preferences.preferredRewardTypes;
        }
      }

      const updatedUser = await user.save();

      res.json({
        success: true,
        user: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          avatar: updatedUser.avatar,
          grade: updatedUser.grade,
          age: updatedUser.age,
          points: updatedUser.points,
          level: updatedUser.level,
          preferences: updatedUser.preferences,
          token: generateToken(updatedUser._id),
        },
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};
