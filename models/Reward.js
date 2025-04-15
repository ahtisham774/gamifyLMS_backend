import mongoose from 'mongoose';

const rewardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['badge', 'certificate', 'virtual-item', 'level-up', 'points'],
      required: true,
    },
    imageUrl: {
      type: String,
      required: function() {
        return this.type === 'badge' || this.type === 'virtual-item';
      },
    },
    value: {
      type: Number,
      default: 0, // For points rewards
    },
    rarity: {
      type: String,
      enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
      default: 'common',
    },
    category: {
      type: String,
      enum: ['achievement', 'completion', 'milestone', 'special', 'seasonal'],
      default: 'achievement',
    },
    criteria: {
      type: {
        type: String,
        enum: ['course-completion', 'quiz-score', 'streak', 'time-spent', 'points-earned', 'custom'],
        
      },
      threshold: {
        type: Number,
        required: function() {
          return ['quiz-score', 'streak', 'time-spent', 'points-earned'].includes(this.criteria.type);
        },
      },
      courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: function() {
          return this.criteria.type === 'course-completion';
        },
      },
      quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        
      },
      customRule: {
        type: String,
        required: function() {
          return this.criteria.type === 'custom';
        },
      },
    },
    isLimited: {
      type: Boolean,
      default: false,
    },
    limitedQuantity: {
      type: Number,
      required: function() {
        return this.isLimited;
      },
    },
    expiresAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    awardedTo: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      awardedAt: {
        type: Date,
        default: Date.now,
      },
      awardedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reason: String,
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    tailoredParams: {
      personalizedText: {
        type: Boolean,
        default: false,
      },
      adaptiveRules: [{
        userPreference: String,
        alternateImage: String,
        alternateDescription: String,
      }],
    },
  },
  {
    timestamps: true,
  }
);

const Reward = mongoose.model('Reward', rewardSchema);

export default Reward;
