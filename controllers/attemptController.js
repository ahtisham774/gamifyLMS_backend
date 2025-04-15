import Attempt from '../models/Attempt.js';
import Quiz from '../models/Quiz.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Reward from '../models/Reward.js';

// @desc    Start a quiz attempt
// @route   POST /api/attempts/start
// @access  Private
export const startAttempt = async (req, res) => {
  try {
    const { quizId } = req.body;

    // Validate quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      });
    }

    // Check if quiz is active
    if (!quiz.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This quiz is not currently active',
      });
    }

    // Check if user is enrolled in the course (if student)
    if (req.user.role === 'student') {
      const user = await User.findById(req.user._id);
      const isEnrolled = user.enrolledCourses.some(
        (enrollment) => enrollment.course.toString() === quiz.course.toString()
      );

      if (!isEnrolled) {
        return res.status(401).json({
          success: false,
          message: 'You need to be enrolled in this course to take the quiz',
        });
      }
    }

    // Check if user has exceeded attempt limit
    if (quiz.attempts > 0) {
      const attemptCount = await Attempt.countDocuments({
        user: req.user._id,
        quiz: quizId,
        isCompleted: true,
      });

      if (attemptCount >= quiz.attempts) {
        return res.status(400).json({
          success: false,
          message: `You have reached the maximum number of attempts (${quiz.attempts}) for this quiz`,
        });
      }
    }

    // Personalization for adaptive difficulty based on user preferences
    let startingDifficulty = quiz.difficulty;

    if (quiz.tailoredParams?.isAdaptive && req.user.role === 'student') {
      const user = await User.findById(req.user._id);

      // Adapt based on user preference
      if (user.preferences?.difficultyPreference) {
        startingDifficulty = user.preferences.difficultyPreference;
      }

      // Check previous attempts to adjust difficulty if needed
      const previousAttempts = await Attempt.find({
        user: req.user._id,
        quiz: quizId,
        isCompleted: true,
      }).sort({ createdAt: -1 }).limit(1);

      if (previousAttempts.length > 0) {
        const lastAttempt = previousAttempts[0];

        // If user failed with current difficulty, make it easier
        if (!lastAttempt.passed && startingDifficulty !== 'easy') {
          if (startingDifficulty === 'hard') {
            startingDifficulty = 'medium';
          } else if (startingDifficulty === 'medium') {
            startingDifficulty = 'easy';
          }
        }

        // If user passed with high score, make it harder
        if (lastAttempt.passed && lastAttempt.percentageScore > 85) {
          if (startingDifficulty === 'easy') {
            startingDifficulty = 'medium';
          } else if (startingDifficulty === 'medium') {
            startingDifficulty = 'hard';
          }
        }
      }
    }

    // Create new attempt
    const attempt = await Attempt.create({
      user: req.user._id,
      quiz: quizId,
      course: quiz.course,
      startTime: Date.now(),
      totalPossibleScore: quiz.totalPoints,
      attemptsCount: await Attempt.countDocuments({
        user: req.user._id,
        quiz: quizId,
      }) + 1,
      adaptiveDifficulty: {
        startingDifficulty,
        endingDifficulty: startingDifficulty,
        adjustmentsMade: [],
      },
      metadata: {
        device: req.headers['user-agent'] || 'Unknown',
        browser: req.headers['user-agent'] ? req.headers['user-agent'].split('(')[0] : 'Unknown',
        ipAddress: req.ip,
      },
    });

    // For adaptive quizzes, filter questions by starting difficulty
    let questionsForAttempt = quiz.questions;

    if (quiz.tailoredParams?.isAdaptive) {
      questionsForAttempt = quiz.questions.filter(
        (q) => q.difficulty === startingDifficulty
      );

      // If not enough questions of the right difficulty, add some from adjacent difficulties
      if (questionsForAttempt.length < 3) {
        let adjacentDifficulty;

        if (startingDifficulty === 'easy') {
          adjacentDifficulty = 'medium';
        } else if (startingDifficulty === 'hard') {
          adjacentDifficulty = 'medium';
        } else {
          // For medium, prioritize easier questions
          adjacentDifficulty = 'easy';
        }

        const additionalQuestions = quiz.questions.filter(
          (q) => q.difficulty === adjacentDifficulty
        );

        questionsForAttempt = [...questionsForAttempt, ...additionalQuestions];
      }
    }

    // Randomize questions if quiz has random order
    if (quiz.isRandomOrder) {
      questionsForAttempt = questionsForAttempt.sort(() => Math.random() - 0.5);
    }

    // Return sanitized questions (without correct answers)
    const sanitizedQuestions = questionsForAttempt.map(q => {
      const sanitizedQuestion = { ...q.toObject() };

      if (sanitizedQuestion.options) {
        sanitizedQuestion.options = sanitizedQuestion.options.map(opt => ({
          _id: opt._id,
          text: opt.text,
          imageUrl: opt.imageUrl,
        }));
      }

      delete sanitizedQuestion.correctAnswer;

      return sanitizedQuestion;
    });

    res.status(201).json({
      success: true,
      attempt: {
        _id: attempt._id,
        quiz: quiz._id,
        course: quiz.course,
        startTime: attempt.startTime,
        questions: sanitizedQuestions,
        duration: quiz.duration,
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

// @desc    Submit a quiz attempt
// @route   POST /api/attempts/submit/:id
// @access  Private
export const submitAttempt = async (req, res) => {
  try {
    const { answers } = req.body;
    const attemptId = req.params.id;

    // Find the attempt
    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found',
      });
    }

    // Verify this attempt belongs to the user
    if (attempt.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to submit this attempt',
      });
    }

    // Check if attempt is already completed
    if (attempt.isCompleted) {
      return res.status(400).json({
        success: false,
        message: 'This attempt is already completed',
      });
    }

    // Get the quiz
    const quiz = await Quiz.findById(attempt.quiz);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      });
    }

    // Process answers and calculate score
    let totalScore = 0;
    let correctAnswers = 0;

    // Process each answer
    const processedAnswers = [];

    for (const answer of answers) {
      const questionId = answer.questionId;
      const selectedAnswer = answer.selectedAnswer;

      // Find the question in the quiz
      const question = quiz.questions.id(questionId);

      if (!question) {
        continue; // Skip if question not found
      }

      let isCorrect = false;
      let pointsEarned = 0;

      // Check if the answer is correct based on question type
      if (question.questionType === 'multiple-choice') {
        // For multiple choice, find the selected option
        const selectedOption = question.options.find(
          opt => opt._id.toString() === selectedAnswer
        );

        isCorrect = selectedOption && selectedOption.isCorrect;
        pointsEarned = isCorrect ? question.points : 0;
      } else if (question.questionType === 'true-false') {
        // For true-false, directly compare with correct answer
        isCorrect = selectedAnswer === question.correctAnswer;
        pointsEarned = isCorrect ? question.points : 0;
      } else if (question.questionType === 'fill-in-blank') {
        // For fill-in-blank, clean up and compare text
        const cleanAnswer = selectedAnswer.trim().toLowerCase();
        const cleanCorrect = question.correctAnswer.trim().toLowerCase();

        isCorrect = cleanAnswer === cleanCorrect;
        pointsEarned = isCorrect ? question.points : 0;
      } else if (question.questionType === 'matching' || question.questionType === 'drag-drop') {
        // For matching or drag-drop, compare arrays
        // This assumes selectedAnswer is an array that should match correctAnswer array
        isCorrect = JSON.stringify(selectedAnswer) === JSON.stringify(question.correctAnswer);
        pointsEarned = isCorrect ? question.points : 0;
      }

      // Add to processed answers
      processedAnswers.push({
        question: questionId,
        selectedAnswer,
        isCorrect,
        pointsEarned,
        timeSpent: answer.timeSpent || 0,
      });

      // Update totals
      totalScore += pointsEarned;
      if (isCorrect) correctAnswers++;
    }

    // Calculate percentage score
    const percentageScore = (totalScore / attempt.totalPossibleScore) * 100;

    // Determine if passed
    const passed = percentageScore >= quiz.passingScore;

   

    // Set end time
    const endTime = Date.now();
    if (passed && req.user.role === 'student') {
      console.log(`User ${req.user._id} passed the quiz ${quiz._id}`);
      const course = await Course.findById(quiz.course);
      console.log(`Course ${course._id} found for quiz ${quiz._id}`);
      if (course && course.gamification.rewardsAvailable?.length > 0) {
        const availableRewards = await Reward.find({
          _id: { $in: course.gamification.rewardsAvailable },
          isActive: true,
          'criteria.type': 'quiz-score',
          'criteria.quizId': quiz._id,
          'criteria.threshold': { $lte: percentageScore }
        });

        console.log(`Available rewards for user ${req.user._id}:`, availableRewards);

        if (availableRewards.length > 0) {
          const user = await User.findById(req.user._id);
          const badgesAwarded = [];

          for (const reward of availableRewards) {
            const alreadyAwarded = user.rewards.some(
              r => r.toString() === reward._id.toString()
            );

            if (!alreadyAwarded) {
              user.rewards.push(reward._id);
              badgesAwarded.push(reward._id);

              reward.awardedTo.push({
                user: user._id,
                awardedAt: Date.now(),
                reason: `Scored ${Math.round(percentageScore)}% on quiz "${quiz.title}"`
              });

              await reward.save();

              user.activityLog.push({
                activity: `Earned the "${reward.name}" ${reward.type}!`,
                timestamp: Date.now()
              });

              if (reward.value > 0) {
                user.points += reward.value;
                attempt.pointsAwarded += reward.value;
              }
            }
          }

          attempt.badgesAwarded = badgesAwarded;
          await user.save();
        }
      }
    }
    // Update attempt
    attempt.answers = processedAnswers;
    attempt.score = totalScore;
    attempt.percentageScore = percentageScore;
    attempt.passed = passed;
    attempt.endTime = endTime;
    attempt.timeSpent = Math.floor((endTime - attempt.startTime) / 1000);
    attempt.isCompleted = true;

    if (quiz.tailoredParams?.isAdaptive) {
      attempt.adaptiveDifficulty.endingDifficulty = attempt.adaptiveDifficulty.startingDifficulty;
    }

    // Add feedback based on score
    if (quiz.tailoredParams?.isAdaptive && quiz.tailoredParams.adaptiveRules) {
      // Find the matching adaptive rule based on score
      const matchingRule = quiz.tailoredParams.adaptiveRules.find(
        rule => percentageScore >= rule.scoreRange.min && percentageScore <= rule.scoreRange.max
      );

      if (matchingRule) {
        attempt.feedback = matchingRule.feedbackTemplate;
      }
    } else {
      // Generic feedback
      if (percentageScore >= 90) {
        attempt.feedback = "Excellent work! You've mastered this content.";
      } else if (percentageScore >= 70) {
        attempt.feedback = "Good job! You have a good understanding of the material.";
      } else if (percentageScore >= quiz.passingScore) {
        attempt.feedback = "You passed! Continue practicing to improve your score.";
      } else {
        attempt.feedback = "Keep practicing! Review the material and try again.";
      }
    }

    // Save the attempt
    await attempt.save();

    // Update user's course progress
    if (req.user.role === 'student') {
      const user = await User.findById(req.user._id);

      // Find the course enrollment
      const courseEnrollment = user.enrolledCourses.find(
        enrollment => enrollment.course.toString() === quiz.course.toString()
      );

      if (courseEnrollment) {
        // Get course to calculate progress
        const course = await Course.findById(quiz.course);

        if (course) {
          // Count total quizzes in the course
          let totalQuizzes = 0;
          let completedQuizzes = 0;

          for (const unit of course.units) {
            for (const lesson of unit.lessons) {
              totalQuizzes += lesson.quizzes.length;
            }
          }

          // Count completed quizzes by the user
          const completedAttempts = await Attempt.find({
            user: req.user._id,
            course: course._id,
            passed: true,
          }).distinct('quiz');

          completedQuizzes = completedAttempts.length;

          // Calculate progress percentage
          const progressPercentage = totalQuizzes > 0
            ? Math.round((completedQuizzes / totalQuizzes) * 100)
            : 0;

          // Update course progress
          courseEnrollment.progress = progressPercentage;
          courseEnrollment.isCompleted = progressPercentage === 100;

          // Award points for passing
          if (passed) {
            const pointsToAward = quiz.difficulty === 'easy'
              ? 10
              : quiz.difficulty === 'medium'
                ? 20
                : 30;

            user.points += pointsToAward;
            attempt.pointsAwarded = pointsToAward;

            // Check if user leveled up (every 100 points = 1 level)
            const newLevel = Math.floor(user.points / 100) + 1;

            if (newLevel > user.level) {
              user.level = newLevel;

              // Add activity log for level up
              user.activityLog.push({
                activity: `Leveled up to Level ${newLevel}!`,
                timestamp: Date.now()
              });
            }

            // Add activity log
            user.activityLog.push({
              activity: `Completed quiz "${quiz.title}" with score ${Math.round(percentageScore)}% and earned ${pointsToAward} points`,
              timestamp: Date.now()
            });
          }

          await user.save();
        }
      }
    }

    // Check for rewards that should be awarded
    if (passed && req.user.role === 'student') {
      const course = await Course.findById(quiz.course);

      if (course && course.gamification.rewardsAvailable?.length > 0) {
        // Get relevant rewards
        const availableRewards = await Reward.find({
          _id: { $in: course.gamification.rewardsAvailable },
          isActive: true,
          'criteria.type': 'quiz-score',
          'criteria.quizId': quiz._id,
          'criteria.threshold': { $lte: percentageScore }
        });

        if (availableRewards.length > 0) {
          const user = await User.findById(req.user._id);
          const badgesAwarded = [];

          for (const reward of availableRewards) {
            // Check if user already has this reward
            const alreadyAwarded = user.rewards.some(
              r => r.toString() === reward._id.toString()
            );

            if (!alreadyAwarded) {
              // Add reward to user
              user.rewards.push(reward._id);

              // Add to attempt's badges awarded
              badgesAwarded.push(reward._id);

              // Add to reward's awarded list
              reward.awardedTo.push({
                user: user._id,
                awardedAt: Date.now(),
                reason: `Scored ${Math.round(percentageScore)}% on quiz "${quiz.title}"`
              });

              await reward.save();

              // Add activity log
              user.activityLog.push({
                activity: `Earned the "${reward.name}" ${reward.type}!`,
                timestamp: Date.now()
              });
            }
          }

          attempt.badgesAwarded = badgesAwarded;
          await user.save();
        }
      }
    }

    const badgesAwardedDetails = await Reward.find({ 
      _id: { $in: attempt.badgesAwarded } 
    });
    

    res.json({
      success: true,
      attempt: {
        _id: attempt._id,
        score: attempt.score,
        totalPossibleScore: attempt.totalPossibleScore,
        percentageScore: attempt.percentageScore,
        passed: attempt.passed,
        feedback: attempt.feedback,
        timeSpent: attempt.timeSpent,
        pointsAwarded: attempt.pointsAwarded,
        badgesAwarded: badgesAwardedDetails
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

// @desc    Get all attempts by the current user
// @route   GET /api/attempts
// @access  Private
export const getUserAttempts = async (req, res) => {
  try {
    const { course, quiz } = req.query;

    // Build query
    const query = { user: req.user._id };

    // Filter by course if provided
    if (course) {
      query.course = course;
    }

    // Filter by quiz if provided
    if (quiz) {
      query.quiz = quiz;
    }

    const attempts = await Attempt.find(query)
      .populate('quiz', 'title description')
      .populate('course', 'title')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: attempts.length,
      attempts,
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

// @desc    Get a single attempt
// @route   GET /api/attempts/:id
// @access  Private
export const getAttemptById = async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.id)
      .populate('quiz', 'title description questions')
      .populate('course', 'title')
      .populate('badgesAwarded');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found',
      });
    }

    // Check if user has permission to view this attempt
    if (
      attempt.user.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      !(req.user.role === 'teacher' && attempt.course.creator?.toString() === req.user._id.toString())
    ) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to view this attempt',
      });
    }

    res.json({
      success: true,
      attempt,
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

// @desc    Get attempts for a specific quiz
// @route   GET /api/attempts/quiz/:quizId
// @access  Private (Teachers and Admins only)
export const getAttemptsByQuiz = async (req, res) => {
  try {
    const quizId = req.params.quizId;

    // Validate quiz exists
    const quiz = await Quiz.findById(quizId).populate('course');
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      });
    }

    // Check if user has permission to view these attempts
    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'teacher'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to view quiz attempts',
      });
    }

    // For teachers, check if they created the course
    if (
      req.user.role === 'teacher' &&
      quiz.course.creator.toString() !== req.user._id.toString()
    ) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to view attempts for this quiz',
      });
    }

    const attempts = await Attempt.find({
      quiz: quizId,
      isCompleted: true,
    })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    // Calculate statistics
    const totalAttempts = attempts.length;
    const passedAttempts = attempts.filter(a => a.passed).length;
    const passingRate = totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0;
    const averageScore = totalAttempts > 0
      ? attempts.reduce((sum, a) => sum + a.percentageScore, 0) / totalAttempts
      : 0;
    const averageTimeSpent = totalAttempts > 0
      ? attempts.reduce((sum, a) => sum + a.timeSpent, 0) / totalAttempts
      : 0;

    res.json({
      success: true,
      count: attempts.length,
      statistics: {
        totalAttempts,
        passedAttempts,
        passingRate,
        averageScore,
        averageTimeSpent,
      },
      attempts,
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
