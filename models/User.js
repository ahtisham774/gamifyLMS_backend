import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['student', 'teacher', 'admin'],
      default: 'student',
    },
    grade: {
      type: Number,
      min: 1,
      max: 4, // For primary school grades 1-4 (age 6-9)
      required: function() {
        return this.role === 'student';
      },
    },
    age: {
      type: Number,
      min: 6,
      max: 9,
      required: function() {
        return this.role === 'student';
      },
    },
    avatar: {
      type: String,
      default: 'https://imgs.search.brave.com/81-FRo5pOztm35zmmtXMNcHHIHPBK_Zi0t-t9lgxoIM/rs:fit:500:0:0:0/g:ce/aHR0cHM6Ly9pY29u/cy5pY29uYXJjaGl2/ZS5jb20vaWNvbnMv/b3h5Z2VuLWljb25z/Lm9yZy9veHlnZW4v/MTI4L1BsYWNlcy11/c2VyLWlkZW50aXR5/LWljb24ucG5n',
    },
    points: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 1,
    },
    rewards: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reward',
    }],
    enrolledCourses: [{
      course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
      progress: {
        type: Number,
        default: 0,
      },
      isCompleted: {
        type: Boolean,
        default: false,
      },
      enrolledAt: {
        type: Date,
        default: Date.now,
      },
    }],
    preferences: {
      learningStyle: {
        type: String,
        enum: ['visual', 'auditory', 'reading', 'kinesthetic'],
        default: 'visual',
      },
      difficultyPreference: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium',
      },
      interestAreas: [{
        type: String,
      }],
      preferredRewardTypes: [{
        type: String,
        enum: ['badges', 'points', 'certificates', 'virtual-items'],
      }],
      learningApproach: {
        type: String,
        enum: ['tailored', 'non-tailored'],
        default: 'tailored',
        required: function() {
          return this.role === 'student';
        }
      },
    },
    activityLog: [{
      activity: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  
  {
    timestamps: true,
  }
);

// Hash the password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
