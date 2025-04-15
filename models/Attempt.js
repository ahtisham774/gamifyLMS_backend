import mongoose from 'mongoose';

const attemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    answers: [{
      question: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      selectedAnswer: {
        type: mongoose.Schema.Types.Mixed, // Could be String, Number, Array, etc.
      },
      isCorrect: {
        type: Boolean,
        default: false,
      },
      pointsEarned: {
        type: Number,
        default: 0,
      },
      timeSpent: {
        type: Number, // in seconds
        default: 0,
      },
    }],
    score: {
      type: Number,
      default: 0,
    },
    totalPossibleScore: {
      type: Number,
      required: true,
    },
    percentageScore: {
      type: Number,
      default: 0,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    timeSpent: {
      type: Number, // in seconds
      default: 0,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    feedback: {
      type: String,
    },
    difficultyRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    attemptsCount: {
      type: Number,
      default: 1,
    },
    pointsAwarded: {
      type: Number,
      default: 0,
    },
    badgesAwarded: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reward',
    }],
    adaptiveDifficulty: {
      startingDifficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
      },
      endingDifficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
      },
      adjustmentsMade: [{
        questionIndex: Number,
        oldDifficulty: String,
        newDifficulty: String,
        reason: String,
      }],
    },
    metadata: {
      device: String,
      browser: String,
      os: String,
      ipAddress: String,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate percentage score and passed status
attemptSchema.pre('save', function (next) {
  if (this.isCompleted && this.score !== undefined && this.totalPossibleScore > 0) {
    this.percentageScore = (this.score / this.totalPossibleScore) * 100;

    // Calculate time spent if end time is set
    if (this.endTime && this.startTime) {
      this.timeSpent = Math.floor((this.endTime - this.startTime) / 1000);
    }
  }
  next();
});

const Attempt = mongoose.model('Attempt', attemptSchema);

export default Attempt;
