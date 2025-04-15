import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    questions: [{
      questionText: {
        type: String,
        required: true,
      },
      questionType: {
        type: String,
        enum: ['multiple-choice', 'true-false', 'matching', 'fill-in-blank', 'drag-drop'],
        default: 'multiple-choice',
      },
      options: [{
        text: {
          type: String,
        },
        isCorrect: {
          type: Boolean,
          default: false,
        },
        imageUrl: {
          type: String,
        },
      }],
      correctAnswer: {
        type: String, // For fill-in-blank or matching type
      },
      explanation: {
        type: String,
      },
      points: {
        type: Number,
        default: 1,
      },
      difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium',
      },
      imageUrl: {
        type: String,
      },
      animationUrl: {
        type: String,
      },
    }],
    duration: {
      type: Number, // in minutes
      default: 10,
    },
    totalPoints: {
      type: Number,
      default: 0,
    },
    passingScore: {
      type: Number,
      default: 60, // Percentage
    },
    isRandomOrder: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: -1, // -1 means unlimited attempts
    },
    
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: [{
      type: String,
    }],
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    tailoredParams: {
      isAdaptive: {
        type: Boolean,
        default: false,
      },
      adaptiveRules: [{
        scoreRange: {
          min: Number,
          max: Number,
        },
        nextAction: {
          type: String,
          enum: ['next-level', 'repeat', 'easier-version', 'harder-version'],
        },
        feedbackTemplate: String,
      }],
    },
  },
  {
    timestamps: true,
  }
);

// Calculate total points before saving
quizSchema.pre('save', function (next) {
  if (this.questions && this.questions.length > 0) {
    let totalPoints = 0;
    for (const question of this.questions) {
      totalPoints += question.points || 1;
    }
    this.totalPoints = totalPoints;
  }
  next();
});

const Quiz = mongoose.model('Quiz', quizSchema);

export default Quiz;
