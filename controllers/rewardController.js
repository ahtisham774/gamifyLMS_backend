import Reward from '../models/Reward.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';

// @desc    Create a new reward
// @route   POST /api/rewards
// @access  Private (Teachers and Admins only)
export const createReward = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      imageUrl,
      value,
      rarity,
      category,
      criteria,
      isLimited,
      limitedQuantity,
      expiresAt,
      tailoredParams,
    } = req.body;

    // Validate course ID if criteria type is course-completion
    if (criteria && criteria.type === 'course-completion') {
      const course = await Course.findById(criteria.courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }
    }

    // Validate quiz ID if criteria type is quiz-score
    if (criteria && criteria.type === 'quiz-score') {
      const quiz = await Quiz.findById(criteria.quizId);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found',
        });
      }
    }

    // Create reward
    const reward = await Reward.create({
      name,
      description,
      type,
      imageUrl,
      value: value || 0,
      rarity: rarity || 'common',
      category: category || 'achievement',
      criteria,
      isLimited: isLimited || false,
      limitedQuantity: isLimited ? limitedQuantity : undefined,
      expiresAt: expiresAt || null,
      createdBy: req.user._id,
      tailoredParams: tailoredParams || {
        personalizedText: false,
        adaptiveRules: [],
      },
    });

    // If course criteria, add reward to course's available rewards
    if (criteria && criteria.type === 'course-completion') {
      const course = await Course.findById(criteria.courseId);
      if (!course.gamification.rewardsAvailable) {
        course.gamification.rewardsAvailable = [];
      }
      course.gamification.rewardsAvailable.push(reward._id);
      await course.save();
    }

    // If quiz criteria, add reward to course's available rewards
    if (criteria && criteria.type === 'quiz-score') {
      const quiz = await Quiz.findById(criteria.quizId);
      const course = await Course.findById(quiz.course);

      if (course) {
        if (!course.gamification.rewardsAvailable) {
          course.gamification.rewardsAvailable = [];
        }
        course.gamification.rewardsAvailable.push(reward._id);
        await course.save();
      }
    }

    res.status(201).json({
      success: true,
      reward,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};

// @desc    Get all rewards
// @route   GET /api/rewards
// @access  Private (Teachers and Admins only)
export const getAllRewards = async (req, res) => {
  try {
    // Query parameters
    const { type, category, rarity, search } = req.query;

    // Build query
    const query = { isActive: true };

    // Filter by type if provided
    if (type) {
      query.type = type;
    }

    // Filter by category if provided
    if (category) {
      query.category = category;
    }

    // Filter by rarity if provided
    if (rarity) {
      query.rarity = rarity;
    }

    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const rewards = await Reward.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: rewards.length,
      rewards,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};

// @desc    Get a single reward
// @route   GET /api/rewards/:id
// @access  Private
export const getRewardById = async (req, res) => {
  try {
    const reward = await Reward.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('awardedTo.user', 'name email avatar');

    if (!reward) {
      return res.status(404).json({
        success: false,
        message: 'Reward not found',
      });
    }

    res.json({
      success: true,
      reward,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};

// @desc    Update a reward
// @route   PUT /api/rewards/:id
// @access  Private (Reward Creator or Admin only)
export const updateReward = async (req, res) => {
  try {
    const reward = await Reward.findById(req.params.id);

    if (!reward) {
      return res.status(404).json({
        success: false,
        message: 'Reward not found',
      });
    }

    // Check if user is the reward creator or an admin
    if (
      reward.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this reward',
      });
    }

    // Update reward fields
    reward.name = req.body.name || reward.name;
    reward.description = req.body.description || reward.description;
    reward.imageUrl = req.body.imageUrl || reward.imageUrl;
    reward.value = req.body.value !== undefined ? req.body.value : reward.value;
    reward.rarity = req.body.rarity || reward.rarity;
    reward.category = req.body.category || reward.category;
    reward.isLimited = req.body.isLimited !== undefined ? req.body.isLimited : reward.isLimited;

    if (req.body.isLimited && req.body.limitedQuantity) {
      reward.limitedQuantity = req.body.limitedQuantity;
    }

    reward.expiresAt = req.body.expiresAt || reward.expiresAt;
    reward.isActive = req.body.isActive !== undefined ? req.body.isActive : reward.isActive;

    // Update criteria if provided
    if (req.body.criteria) {
      reward.criteria = req.body.criteria;
    }

    // Update tailored parameters if provided
    if (req.body.tailoredParams) {
      reward.tailoredParams = req.body.tailoredParams;
    }

    const updatedReward = await reward.save();

    res.json({
      success: true,
      reward: updatedReward,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};

// @desc    Delete a reward
// @route   DELETE /api/rewards/:id
// @access  Private (Reward Creator or Admin only)
export const deleteReward = async (req, res) => {
  try {
    const reward = await Reward.findById(req.params.id);

    if (!reward) {
      return res.status(404).json({
        success: false,
        message: 'Reward not found',
      });
    }

    // Check if user is the reward creator or an admin
    if (
      reward.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this reward',
      });
    }

    // Remove reward from any courses that have it
    if (reward.criteria &&
        (reward.criteria.type === 'course-completion' || reward.criteria.type === 'quiz-score')) {

      let courseIds = [];

      if (reward.criteria.type === 'course-completion') {
        courseIds = [reward.criteria.courseId];
      } else if (reward.criteria.type === 'quiz-score') {
        const quiz = await Quiz.findById(reward.criteria.quizId);
        if (quiz) {
          courseIds = [quiz.course];
        }
      }

      for (const courseId of courseIds) {
        const course = await Course.findById(courseId);
        if (course && course.gamification.rewardsAvailable) {
          course.gamification.rewardsAvailable = course.gamification.rewardsAvailable.filter(
            id => id.toString() !== reward._id.toString()
          );
          await course.save();
        }
      }
    }

    // Remove reward from users who have earned it
    const usersWithReward = await User.find({ rewards: reward._id });

    for (const user of usersWithReward) {
      user.rewards = user.rewards.filter(id => id.toString() !== reward._id.toString());
      await user.save();
    }

    await reward.deleteOne();

    res.json({
      success: true,
      message: 'Reward removed',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};

// @desc    Award a reward to a user
// @route   POST /api/rewards/:id/award/:userId
// @access  Private (Teachers and Admins only)
export const awardRewardToUser = async (req, res) => {
  try {
    const rewardId = req.params.id;
    const userId = req.params.userId;
    const { reason } = req.body;

    // Find the reward
    const reward = await Reward.findById(rewardId);
    if (!reward) {
      return res.status(404).json({
        success: false,
        message: 'Reward not found',
      });
    }

    // Check if reward is active
    if (!reward.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This reward is not currently active',
      });
    }

    // Check if reward has expired
    if (reward.expiresAt && new Date(reward.expiresAt) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'This reward has expired',
      });
    }

    // Check limited quantity
    if (reward.isLimited) {
      const awardedCount = reward.awardedTo.length;

      if (awardedCount >= reward.limitedQuantity) {
        return res.status(400).json({
          success: false,
          message: 'All available rewards of this type have been awarded',
        });
      }
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user already has this reward
    const alreadyAwarded = user.rewards.some(r => r.toString() === rewardId);

    if (alreadyAwarded) {
      return res.status(400).json({
        success: false,
        message: 'User already has this reward',
      });
    }

    // Add reward to user
    user.rewards.push(rewardId);

    // Add to reward's awarded list
    reward.awardedTo.push({
      user: userId,
      awardedAt: Date.now(),
      awardedBy: req.user._id,
      reason: reason || 'Awarded by teacher/admin',
    });

    // Add activity log
    user.activityLog.push({
      activity: `Awarded the "${reward.name}" ${reward.type}`,
      timestamp: Date.now(),
    });

    // Add points if it's a points reward
    if (reward.type === 'points' && reward.value > 0) {
      user.points += reward.value;

      // Check if user leveled up
      const newLevel = Math.floor(user.points / 100) + 1;

      if (newLevel > user.level) {
        user.level = newLevel;

        // Add activity log for level up
        user.activityLog.push({
          activity: `Leveled up to Level ${newLevel}!`,
          timestamp: Date.now(),
        });
      }
    }

    await user.save();
    await reward.save();

    res.json({
      success: true,
      message: `Reward "${reward.name}" successfully awarded to ${user.name}`,
      awardedReward: {
        reward: {
          _id: reward._id,
          name: reward.name,
          type: reward.type,
          description: reward.description,
          imageUrl: reward.imageUrl,
          rarity: reward.rarity,
        },
        awardedAt: reward.awardedTo[reward.awardedTo.length - 1].awardedAt,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};

// @desc    Get user rewards
// @route   GET /api/rewards/user/:userId
// @access  Private
export const getUserRewards = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Check if user has permission to view these rewards
    if (
      userId !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      req.user.role !== 'teacher'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to view these rewards',
      });
    }

    const user = await User.findById(userId).populate('rewards');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      count: user.rewards.length,
      rewards: user.rewards,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};
