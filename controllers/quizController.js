import Quiz from '../models/Quiz.js';
import Course from '../models/Course.js';
import User from '../models/User.js';

// @desc    Create a new quiz
// @route   POST /api/quizzes
// @access  Private (Teachers and Admins only)
export const createQuiz = async (req, res) => {
  try {
    const {
      title,
      description,
      course: courseId,
      questions,
      duration,
      passingScore,
      isRandomOrder,
      attempts,
      unitIndex,
      lessonIndex,
      difficulty,
      tailoredParams,
      tags,
    } = req.body;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check if user is the course creator or an admin
    if (
      course.creator.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to create quizzes for this course',
      });
    }

    // Validate the unit and lesson indices
    if (
      unitIndex < 0 ||
      unitIndex >= course.units.length ||
      lessonIndex < 0 ||
      lessonIndex >= course.units[unitIndex].lessons.length
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid unit or lesson index',
      });
    }

    // Create the quiz
    const quiz = await Quiz.create({
      title,
      description,
      course: courseId,
      creator: req.user._id,
      questions: questions || [],
      duration: duration || 10,
      passingScore: passingScore || 60,
      isRandomOrder: isRandomOrder || false,
      attempts: attempts || -1,
      unitIndex,
      lessonIndex,
      difficulty: difficulty || 'medium',
      tailoredParams: tailoredParams || {
        isAdaptive: false,
        adaptiveRules: [],
      },
      tags: tags || [],
    });

    // Add quiz reference to the course's lesson
    course.units[unitIndex].lessons[lessonIndex].quizzes.push(quiz._id);
    await course.save();

    res.status(201).json({
      success: true,
      quiz,
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

// @desc    Get all quizzes
// @route   GET /api/quizzes
// @access  Private (Teachers and Admins only)
export const getAllQuizzes = async (req, res) => {
  try {
    // Query parameters
    const { course, difficulty, search } = req.query;

    // Build query
    const query = {};

    // Filter by course if provided
    if (course) {
      query.course = course;
    }

    // Filter by difficulty if provided
    if (difficulty) {
      query.difficulty = difficulty;
    }

    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const quizzes = await Quiz.find(query)
      .populate('course', 'title')
      .populate('creator', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: quizzes.length,
      quizzes,
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

// @desc    Get a single quiz
// @route   GET /api/quizzes/:id
// @access  Private
export const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('course', 'title description')
      .populate('creator', 'name email');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      });
    }

    // For students, don't send correct answers
    if (req.user.role === 'student') {
      const sanitizedQuiz = JSON.parse(JSON.stringify(quiz));

      sanitizedQuiz.questions = sanitizedQuiz.questions.map(question => {
        // For multiple-choice questions, remove isCorrect flag
        if (question.options && question.options.length > 0) {
          question.options = question.options.map(option => ({
            _id: option._id,
            text: option.text,
            imageUrl: option.imageUrl,
          }));
        }

        // Remove correctAnswer field
        delete question.correctAnswer;

        return question;
      });

      return res.json({
        success: true,
        quiz: sanitizedQuiz,
      });
    }

    // For teachers and admins, send complete quiz with answers
    res.json({
      success: true,
      quiz,
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

// @desc    Update a quiz
// @route   PUT /api/quizzes/:id
// @access  Private (Quiz Creator or Admin only)
export const updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      });
    }

    // Check if user is the quiz creator or an admin
    if (
      quiz.creator.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this quiz',
      });
    }

    // Update quiz fields
    quiz.title = req.body.title || quiz.title;
    quiz.description = req.body.description || quiz.description;
    quiz.duration = req.body.duration || quiz.duration;
    quiz.passingScore = req.body.passingScore || quiz.passingScore;
    quiz.isRandomOrder = req.body.isRandomOrder !== undefined ? req.body.isRandomOrder : quiz.isRandomOrder;
    quiz.attempts = req.body.attempts !== undefined ? req.body.attempts : quiz.attempts;
    quiz.isActive = req.body.isActive !== undefined ? req.body.isActive : quiz.isActive;
    quiz.difficulty = req.body.difficulty || quiz.difficulty;

    // Update questions if provided
    if (req.body.questions) {
      quiz.questions = req.body.questions;
    }

    // Update tailored parameters if provided
    if (req.body.tailoredParams) {
      quiz.tailoredParams = req.body.tailoredParams;
    }

    // Update tags if provided
    if (req.body.tags) {
      quiz.tags = req.body.tags;
    }

    const updatedQuiz = await quiz.save();

    res.json({
      success: true,
      quiz: updatedQuiz,
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

// @desc    Delete a quiz
// @route   DELETE /api/quizzes/:id
// @access  Private (Quiz Creator or Admin only)
export const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      });
    }

    // Check if user is the quiz creator or an admin
    if (
      quiz.creator.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this quiz',
      });
    }

    // Remove quiz reference from course
    const course = await Course.findById(quiz.course);
    if (course &&
        quiz.unitIndex >= 0 &&
        quiz.unitIndex < course.units.length &&
        quiz.lessonIndex >= 0 &&
        quiz.lessonIndex < course.units[quiz.unitIndex].lessons.length) {

      const quizIndex = course.units[quiz.unitIndex].lessons[quiz.lessonIndex].quizzes.indexOf(quiz._id);
      if (quizIndex > -1) {
        course.units[quiz.unitIndex].lessons[quiz.lessonIndex].quizzes.splice(quizIndex, 1);
        await course.save();
      }
    }

    await quiz.deleteOne();

    res.json({
      success: true,
      message: 'Quiz removed',
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

// @desc    Get quizzes for a specific course
// @route   GET /api/quizzes/course/:courseId
// @access  Private
export const getQuizzesByCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check if user is enrolled in the course or is a teacher/admin
    if (req.user.role === 'student') {
      const user = await User.findById(req.user._id);
      const isEnrolled = user.enrolledCourses.some(
        (enrollment) => enrollment.course.toString() === courseId
      );

      if (!isEnrolled) {
        return res.status(401).json({
          success: false,
          message: 'You need to be enrolled in this course to view its quizzes',
        });
      }
    }

    const quizzes = await Quiz.find({
      course: courseId,
      isActive: true
    }).sort({ unitIndex: 1, lessonIndex: 1 });

    // For students, remove correct answers
    if (req.user.role === 'student') {
      const sanitizedQuizzes = quizzes.map(quiz => {
        const sanitizedQuiz = JSON.parse(JSON.stringify(quiz));

        sanitizedQuiz.questions = sanitizedQuiz.questions.map(question => {
          // For multiple-choice questions, remove isCorrect flag
          if (question.options && question.options.length > 0) {
            question.options = question.options.map(option => ({
              _id: option._id,
              text: option.text,
              imageUrl: option.imageUrl,
            }));
          }

          // Remove correctAnswer field
          delete question.correctAnswer;

          return question;
        });

        return sanitizedQuiz;
      });

      return res.json({
        success: true,
        count: sanitizedQuizzes.length,
        quizzes: sanitizedQuizzes,
      });
    }

    res.json({
      success: true,
      count: quizzes.length,
      quizzes,
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
