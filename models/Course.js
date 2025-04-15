import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
      enum: ['mathematics', 'science', 'english', 'social', 'art', 'music', 'physical-education'],
    },
    grade: {
      type: Number,
      required: true,
      min: 1,
      max: 4, // For primary school grades 1-4 (age 6-9)
    },
    imageUrl: {
      type: String,
      default: 'default-course.png',
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    units: [{
      title: {
        type: String,
        required: true,
      },
      description: {
        type: String,
      },
      completedLessons:[{
        type: String,
      }],
      lessons: [{
        title: {
          type: String,
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        resources: [{
          type: {
            type: String,
            enum: ['video', 'pdf', 'image', 'link', 'text'],
          },
          url: String,
          content: String,
        }],
        quizzes: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Quiz',
        }],
        duration: {
          type: Number, // in minutes
          default: 15,
        },
        isCompleted: {
          type: Boolean,
          default: false,
        },
        completedAt: {
          type: Date,
          default: null,
        },
        completedBy: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',}],
        progress: {
          type: Number,
          default: 0,
        },
      }],
    }],
    duration: {
      type: Number, // total course duration in minutes
      default: 0,
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    enrolledStudents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    ratings: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      value: {
        type: Number,
        min: 1,
        max: 5,
      },
      review: String,
      date: {
        type: Date,
        default: Date.now,
      },
    }],
    averageRating: {
      type: Number,
      default: 0,
    },
    tags: [{
      type: String,
    }],
    gamification: {
      hasPersonalization: {
        type: Boolean,
        default: false,
      },
      rewardsAvailable: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reward',
      }],
      pointsToEarn: {
        type: Number,
        default: 100,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Calculate total duration based on all lessons
courseSchema.pre('save', function (next) {
  if (this.units && this.units.length > 0) {
    let totalDuration = 0;
    for (const unit of this.units) {
      if (unit.lessons && unit.lessons.length > 0) {
        for (const lesson of unit.lessons) {
          totalDuration += lesson.duration || 0;
        }
      }
    }
    this.duration = totalDuration;
  }
  next();
});

const Course = mongoose.model('Course', courseSchema);

export default Course;
