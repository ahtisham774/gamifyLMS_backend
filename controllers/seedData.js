import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Course from '../models/Course.js'
import User from '../models/User.js'
import Reward from '../models/Reward.js'
import Attempt from '../models/Attempt.js'
import bcrypt from 'bcryptjs'
import Quiz from '../models/Quiz.js'

// Load environment variables
dotenv.config()

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB for seeding'))
  .catch(err => console.error('MongoDB connection error:', err))

// Sample Teachers
const teachers = [
  {
    name: 'Ms. Johnson',
    email: 'msjohnson@school.edu',
    password: 'teacher123',
    role: 'teacher',
    avatar: 'teacher1.png',
    bio: 'Mathematics specialist with 10 years of experience'
  },
  {
    name: 'Mr. Roberts',
    email: 'mrroberts@school.edu',
    password: 'teacher123',
    role: 'teacher',
    avatar: 'teacher2.png',
    bio: 'English and reading teacher passionate about literacy'
  },
  {
    name: 'Dr. Martinez',
    email: 'drmartinez@school.edu',
    password: 'teacher123',
    role: 'teacher',
    avatar: 'teacher3.png',
    bio: 'Science teacher with a PhD in Education'
  }
]

// Sample Students
const students = [
  {
    name: 'Emma Wilson',
    email: 'emma@student.edu',
    password: 'student123',
    role: 'student',
    grade: 2,
    age: 7,
    avatar: 'student1.png',
    preferences: {
      learningStyle: 'visual',
      difficultyPreference: 'medium',
      interestAreas: ['mathematics', 'art'],
      preferredRewardTypes: ['badges', 'points']
    },
    points: 150,
    streak: 5
  },
  {
    name: 'Liam Johnson',
    email: 'liam@student.edu',
    password: 'student123',
    role: 'student',
    grade: 3,
    age: 8,
    avatar: 'student2.png',
    preferences: {
      learningStyle: 'kinesthetic',
      difficultyPreference: 'easy',
      interestAreas: ['science', 'physical-education'],
      preferredRewardTypes: ['virtual-items']
    },
    points: 80,
    streak: 2
  }
]

// Sample Rewards
const rewards = [
  {
    name: 'Math Whiz Badge',
    description:
      'Awarded for completing the Fun with Numbers course with 90% or higher',
    type: 'badge',
    imageUrl: 'https://example.com/images/math-whiz-badge.png',
    rarity: 'uncommon',
    category: 'achievement',
    criteria: {
      type: 'course-completion',
      threshold: 90,
      courseId: null // Will be set after course creation
    },
    isLimited: false,
    createdBy: null // Will be set after teacher creation
  },
  {
    name: 'Reading Champion',
    description: 'Awarded for completing 3 reading lessons with perfect scores',
    type: 'badge',
    imageUrl: 'https://example.com/images/reading-champion.png',
    rarity: 'rare',
    category: 'milestone',
    criteria: {
      type: 'custom',
      customRule: 'Complete 3 reading lessons with 100% scores'
    },
    isLimited: true,
    limitedQuantity: 50,
    createdBy: null
  },
  {
    name: '100 Points Club',
    description: 'Awarded for earning 100 points in any subject',
    type: 'certificate',
    imageUrl: 'https://example.com/images/100-points-cert.png',
    rarity: 'common',
    category: 'milestone',
    criteria: {
      type: 'points-earned',
      threshold: 100
    },
    isLimited: false,
    createdBy: null
  }
]
const quizzes = [
  {
    _id: '65d4f5e8b1a2c3d4e5f6a7e1',
    title: 'Counting Quiz 1',
    description: 'Test your counting skills',
    creator: '67f6c252a21b2f2f0ae4c06a',
    questions: [
      {
        questionText: 'What number comes after 5?',
        questionType: 'multiple-choice',
        options: [
          { text: '6', isCorrect: true },
          { text: '7', isCorrect: false },
          { text: '5', isCorrect: false },
          { text: '4', isCorrect: false }
        ],
        correctAnswer: '6',
        explanation: 'The number that comes after 5 is 6.',
        points: 10,
        difficulty: 'easy'
      },
      {
        questionText: 'Count the stars: ★★★★★',
        questionType: 'multiple-choice',
        options: [
          { text: '3', isCorrect: false },
          { text: '4', isCorrect: false },
          { text: '5', isCorrect: true },
          { text: '6', isCorrect: false }
        ],
        correctAnswer: '5',
        explanation: 'There are 5 stars shown.',
        points: 10,
        difficulty: 'easy'
      }
    ],
    duration: 10,
    totalPoints: 20,
    passingScore: 60,
    isRandomOrder: false,
    attemptsAllowed: 3,
    course: '65d4f5e8b1a2c3d4e5f6a7a1' // Reference back to the course
  }
]
// Sample Courses
const courses = [
  {
    title: 'Fun with Numbers',
    description: 'Learn basic math concepts through games and activities',
    subject: 'mathematics',
    grade: 2,
    imageUrl:
      'https://img.freepik.com/free-vector/math-background-with-numbers_23-2148150517.jpg',
    creator: '65d4f5e8b1a2c3d4e5f6a7b8', // Sample creator ObjectId
    level: 'beginner',
    isPublished: true,
    enrolledStudents: ['65d4f5e8b1a2c3d4e5f6a7b9', '65d4f5e8b1a2c3d4e5f6a7c0'],
    ratings: [
      {
        user: '65d4f5e8b1a2c3d4e5f6a7b9',
        value: 5,
        review: 'My child loved this course!',
        date: new Date('2024-01-15')
      }
    ],
    averageRating: 4.8,
    tags: ['math', 'counting', 'beginner'],
    gamification: {
      hasPersonalization: true,
      pointsToEarn: 150,
      rewardsAvailable: ['65d4f5e8b1a2c3d4e5f6a7d1', '65d4f5e8b1a2c3d4e5f6a7d2']
    },
    units: [
      {
        title: 'Counting Basics',
        description: 'Learn to count from 1 to 100',
        lessons: [
          {
            title: 'Numbers 1-10',
            content: 'Introduction to basic numbers from 1 to 10',
            resources: [
              {
                type: 'video',
                url: 'https://example.com/videos/numbers1-10'
              },
              {
                type: 'pdf',
                url: 'https://example.com/pdfs/numbers-worksheet'
              }
            ],
            quizzes: ['65d4f5e8b1a2c3d4e5f6a7e1'], // Reference to quiz document
            duration: 15
          },
          {
            title: 'Numbers 11-20',
            content: 'Learn numbers from 11 to 20 with fun exercises',
            resources: [
              {
                type: 'video',
                url: 'https://example.com/videos/numbers11-20'
              }
            ],
            duration: 20
          }
        ]
      },
      {
        title: 'Simple Addition',
        description: 'Learn to add numbers up to 20',
        lessons: [
          {
            title: 'Adding with Pictures',
            content: 'Use pictures to understand addition concepts',
            resources: [
              {
                type: 'image',
                url: 'https://example.com/images/addition-pictures'
              }
            ],
            duration: 25
          }
        ]
      }
    ]
  },
  {
    title: 'Reading Adventures',
    description: 'Explore the wonderful world of reading with fun stories',
    subject: 'english',
    grade: 2,
    imageUrl:
      'https://img.freepik.com/free-vector/hand-drawn-world-book-day-illustration_23-2149291252.jpg',
    level: 'beginner',
    isPublished: true,
    tags: ['reading', 'stories', 'literacy'],
    gamification: {
      hasPersonalization: false,
      pointsToEarn: 120,
      rewardsAvailable: [] // Will be set after reward creation
    },
    units: [
      {
        title: 'Short Stories',
        description: 'Read and understand simple short stories',
        lessons: [
          {
            title: 'The Happy Cat',
            content:
              'Read a story about a cat and answer comprehension questions',
            resources: [
              {
                type: 'pdf',
                url: 'https://example.com/pdfs/happy-cat-story'
              }
            ],
            duration: 20
          }
        ]
      }
    ]
  },
  {
    title: 'Science Exploration',
    description:
      'Discover the wonders of science through interactive experiments',
    subject: 'science',
    grade: 1,
    imageUrl:
      'https://img.freepik.com/free-vector/scientist-kids-cartoon-characters-science-education-isolated_1308-45128.jpg',
    level: 'beginner',
    isPublished: true,
    tags: ['science', 'experiments', 'kids'],
    gamification: {
      hasPersonalization: true,
      pointsToEarn: 200,
      rewardsAvailable: [] // Will be set after reward creation
    }
  }
]

// Sample Quiz Attempts
const attempts = [
  {
    user: '67f6c8c6c9a12852851e3029', // Will be set after student creation
    quiz: '65d4f5e8b1a2c3d4e5f6a7e1', // Would be set if we had quiz data
    course: '67f6c252a21b2f2f0ae4c071', // Will be set after course creation
    answers: [
      {
        question: '65d4f5e8b1a2c3d4e5f6a7e1', // Sample question ID
        selectedAnswer: '6',
        isCorrect: true,
        pointsEarned: 10,
        timeSpent: 15
      }
    ],
    score: 10,
    totalPossibleScore: 10,
    percentageScore: 100,
    passed: true,
    startTime: new Date(Date.now() - 3600000), // 1 hour ago
    endTime: new Date(Date.now() - 3595000), // 5 seconds later
    isCompleted: true,
    feedback: 'Great job!',
    difficultyRating: 2,
    attemptsCount: 1,
    pointsAwarded: 15,
    badgesAwarded: [], // Will be set after reward creation
    adaptiveDifficulty: {
      startingDifficulty: 'easy',
      endingDifficulty: 'easy',
      adjustmentsMade: []
    },
    metadata: {
      device: 'iPad',
      browser: 'Safari',
      os: 'iOS 15',
      ipAddress: '192.168.1.1'
    }
  }
]

// Function to seed the database
export const seedDatabase = async () => {
  try {
    // Clear existing data
    // await Course.deleteMany({})
    // await User.deleteMany({})
    // await Quiz.deleteMany({})
    await Reward.deleteMany({})
    await Attempt.deleteMany({})
    console.log('Cleared existing data')

    // const createdQuizzes = await Quiz.insertMany(quizzes)
    // console.log(`Created ${createdQuizzes.length} quizzes`)

    // Create users
    // const createdTeachers = await User.insertMany(teachers)
    // console.log(`Created ${createdTeachers.length} teachers`)

    // const createdStudents = await User.insertMany(students)
    // console.log(`Created ${createdStudents.length} students`)

    

    // Create courses with the first teacher as creator
    // const coursesWithCreators = courses.map(course => ({
    //   ...course,
    //   creator: createdTeachers[0]._id
    // }))
    // const createdCourses = await Course.insertMany(coursesWithCreators)
    // console.log(`Created ${createdCourses.length} courses`)

    // Update rewards with course references and creators

    const createdCourses = await Course.find();
    const createdStudents = await User.find({ role: 'student' });
    const createdTeachers = await User.find({ role: 'teacher' });
    const createdQuizzes = await Quiz.find();

    // Update rewards with course references and creators
    rewards[0].criteria.courseId = createdCourses[0]._id;
    rewards[0].createdBy = createdTeachers[0]._id;
    rewards[1].createdBy = createdTeachers[1]._id;
    rewards[2].createdBy = createdTeachers[0]._id;

    const createdRewards = await Reward.insertMany(rewards);
    console.log(`Created ${createdRewards.length} rewards`);

    // Update courses with reward references
    await Course.findByIdAndUpdate(createdCourses[0]._id, {
      $push: { 'gamification.rewardsAvailable': createdRewards[0]._id }
    });
    await Course.findByIdAndUpdate(createdCourses[1]._id, {
      $push: { 'gamification.rewardsAvailable': createdRewards[1]._id }
    });

    // Create quiz attempts
    const attemptData = {
      user: createdStudents[0]._id,
      quiz: createdQuizzes[0]._id,
      course: createdCourses[0]._id,
      answers: attempts[0].answers,
      score: attempts[0].score,
      totalPossibleScore: attempts[0].totalPossibleScore,
      percentageScore: attempts[0].percentageScore,
      passed: attempts[0].passed,
      startTime: attempts[0].startTime,
      endTime: attempts[0].endTime,
      isCompleted: attempts[0].isCompleted,
      feedback: attempts[0].feedback,
      difficultyRating: attempts[0].difficultyRating,
      attemptsCount: attempts[0].attemptsCount,
      pointsAwarded: attempts[0].pointsAwarded,
      badgesAwarded: [createdRewards[0]._id],
      adaptiveDifficulty: attempts[0].adaptiveDifficulty,
      metadata: attempts[0].metadata
    };

    const createdAttempts = await Attempt.insertMany([attemptData]);
    console.log(`Created ${createdAttempts.length} quiz attempts`);

    // Enroll students in courses and award rewards
    // First, update the user with enrolled course
    await User.findByIdAndUpdate(createdStudents[0]._id, {
      $push: {
        enrolledCourses: {
          course: createdCourses[0]._id,
          progress: 30,
          isCompleted: false,
          lastAccessed: new Date()
        }
      }
    });

    // Then separately update with the reward
    await User.findByIdAndUpdate(createdStudents[0]._id, {
      $push: {
        rewards: createdRewards[0]._id // Just push the ObjectId
      },
      $inc: { points: 15 }
    });

    await Course.findByIdAndUpdate(createdCourses[0]._id, {
      $push: { enrolledStudents: createdStudents[0]._id }
    });

    await User.findByIdAndUpdate(createdStudents[1]._id, {
      $push: {
        enrolledCourses: {
          course: createdCourses[1]._id,
          progress: 15,
          isCompleted: false,
          lastAccessed: new Date()
        }
      }
    });
    await Course.findByIdAndUpdate(createdCourses[1]._id, {
      $push: { enrolledStudents: createdStudents[1]._id }
    });


    console.log('Database seeding completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Error seeding database:', error)
    process.exit(1)
  }
}

// Run the seed function
seedDatabase()
