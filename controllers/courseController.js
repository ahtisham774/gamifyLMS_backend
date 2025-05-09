import Course from '../models/Course.js';
import Quiz from '../models/Quiz.js';
import Reward from '../models/Reward.js';
import User from '../models/User.js';


// @desc    Create a new course
// @route   POST /api/courses
// @access  Private (Teachers and Admins only)
// export const createCourse = async (req, res) => {
//   try {
//     const {
//       title,
//       description,
//       subject,
//       grade,
//       imageUrl,
//       units,
//       level,
//       tags,
//       gamification,
//     } = req.body;

//     // Create course
//     const course = await Course.create({
//       title,
//       description,
//       subject,
//       grade,
//       imageUrl,
//       creator: req.user._id,
//       units: units || [],
//       level,
//       tags,
//       gamification: {
//         hasPersonalization: gamification?.hasPersonalization || false,
//         pointsToEarn: gamification?.pointsToEarn || 100,
//       },
//     });

//     if (course) {
//       res.status(201).json({
//         success: true,
//         course,
//       });
//     } else {
//       res.status(400).json({
//         success: false,
//         message: 'Invalid course data',
//       });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: 'Server Error',
//       error: error.message,
//     });
//   }
// };
export const createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      subject,
      grade,
      imageUrl,
      units,
      level,
      tags,
      gamification,
    } = req.body;

    // First create all quizzes and get their IDs
    const transformedUnits = await Promise.all(
      (units || []).map(async (unit) => {
        const transformedLessons = await Promise.all(
          (unit.lessons || []).map(async (lesson) => {
            if (lesson.quizzes && lesson.quizzes.length > 0) {
              // Create quiz documents
              const createdQuizzes = await Promise.all(
                lesson.quizzes.map(async (quiz) => {
                  const newQuiz = await Quiz.create({
                    ...quiz,
                    course: null, // Will update after course creation
                    creator: req.user._id
                  });
                  return newQuiz._id;
                })
              );
              
              return {
                ...lesson,
                quizzes: createdQuizzes
              };
            }
            return lesson;
          })
        );
        
        return {
          ...unit,
          lessons: transformedLessons
        };
      })
    );

    // Create course
    const course = await Course.create({
      title,
      description,
      subject: subject || 'science',
      grade: grade || 2,
      imageUrl,
      creator: req.user._id,
      units: transformedUnits,
      level,
      tags,
      gamification: {
        hasPersonalization: gamification?.hasPersonalization || false,
        pointsToEarn: gamification?.pointsToEarn || 100,
      },
    });

    // Update quizzes with the course reference
    
    console.log("Course Units", course.units)
    
 const updatePromises = Array.from(course.units || []).reduce((unitAcc, unit) => {
  const lessonUpdates = Array.from(unit.lessons || []).reduce((lessonAcc, lesson) => {
    const quizUpdates = Array.from(lesson.quizzes || []).map(quizId =>
      Quiz.findByIdAndUpdate(quizId, { course: course._id })
    );
    return lessonAcc.concat(quizUpdates);
  }, []);
  return unitAcc.concat(lessonUpdates);
}, []);

await Promise.all(updatePromises);



    res.status(201).json({
      success: true,
      course,
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

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
export const getAllCourses = async (req, res) => {
  try {
    // Query parameters
    const { subject, grade, level, search } = req.query;

    // Build query
    const query = {};

    // Filter by published status
    query.isPublished = true;

    // Filter by subject if provided
    if (subject) {
      query.subject = subject;
    }

    // Filter by grade if provided
    if (grade) {
      query.grade = grade;
    }

    // Filter by level if provided
    if (level) {
      query.level = level;
    }
   query.creator = { $exists: true, $ne: null };
    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const courses = await Course.find(query)
      .populate({
        path: 'creator',
        select: 'name email',
        match: { _id: { $exists: true } } // Ensure only existing creators are populated
      })
      .sort({ createdAt: -1 });
 const validCourses = courses.filter(course => course.creator !== null);
   res.json({
      success: true,
      count: validCourses.length,
      courses: validCourses,
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

// @desc    Get a single course
// @route   GET /api/courses/:id
// @access  Public
export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('creator', 'name email avatar')
      .populate('enrolledStudents', 'name email avatar')
      .populate('gamification.rewardsAvailable') // Populate rewards
      .populate({
        path: 'units.lessons.quizzes', // Deep populate quizzes in lessons
        model: 'Quiz' // Assuming your quiz model is named 'Quiz'
      });


    if (course) {
      res.json({
        success: true,
        course,
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Course not found',
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

// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Private (Course Creator or Admin only)
export const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

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
        message: 'Not authorized to update this course',
      });
    }

    // Update basic course fields
    course.title = req.body.title || course.title;
    course.description = req.body.description || course.description;
    course.subject = req.body.subject || course.subject;
    course.grade = req.body.grade || course.grade;
    course.imageUrl = req.body.imageUrl || course.imageUrl;
    course.level = req.body.level || course.level;
    course.isPublished = req.body.isPublished !== undefined ? req.body.isPublished : course.isPublished;
    course.tags = req.body.tags || course.tags;

    // Update gamification settings if provided
    if (req.body.gamification) {
      course.gamification = {
        hasPersonalization: req.body.gamification.hasPersonalization !== undefined 
          ? req.body.gamification.hasPersonalization 
          : course.gamification.hasPersonalization,
        pointsToEarn: req.body.gamification.pointsToEarn || course.gamification.pointsToEarn,
        rewardsAvailable: req.body.gamification.rewardsAvailable || course.gamification.rewardsAvailable
      };
    }

    // Handle units and quizzes updates
    if (req.body.units) {
      const updatedUnits = await Promise.all(
        req.body.units.map(async (unit) => {
          const updatedLessons = await Promise.all(
            (unit.lessons || []).map(async (lesson) => {
              if (lesson.quizzes && lesson.quizzes.length > 0) {
                const updatedQuizzes = await Promise.all(
                  lesson.quizzes.map(async (quiz) => {
                    // If quiz has _id, it exists - update it
                    if (quiz._id) {
                      const updatedQuiz = await Quiz.findByIdAndUpdate(
                        quiz._id,
                        {
                          title: quiz.title,
                          questions: quiz.questions,
                          passingScore: quiz.passingScore,
                          timeLimit: quiz.timeLimit,
                          maxAttempts: quiz.maxAttempts
                        },
                        { new: true }
                      );
                      return updatedQuiz._id;
                    } else {
                      // Create new quiz
                      const newQuiz = await Quiz.create({
                        ...quiz,
                        course: course._id,
                        creator: req.user._id
                      });
                      return newQuiz._id;
                    }
                  })
                );
                return {
                  ...lesson,
                  quizzes: updatedQuizzes
                };
              }
              return lesson;
            })
          );
          return {
            ...unit,
            lessons: updatedLessons
          };
        })
      );
      course.units = updatedUnits;
    }

    const updatedCourse = await course.save();

    res.json({
      success: true,
      course: updatedCourse,
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

// @desc    Delete a course
// @route   DELETE /api/courses/:id
// @access  Private (Course Creator or Admin only)
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

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
        message: 'Not authorized to delete this course',
      });
    }

    await course.deleteOne();

    res.json({
      success: true,
      message: 'Course removed',
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

// @desc    Enroll in a course
// @route   POST /api/courses/:id/enroll
// @access  Private
export const enrollInCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check if user is already enrolled
    const user = await User.findById(req.user._id);
    const isEnrolled = user.enrolledCourses.some(
      (enrollment) => enrollment.course.toString() === course._id.toString()
    );

    if (isEnrolled) {
      return res.status(400).json({
        success: false,
        message: 'User already enrolled in this course',
      });
    }

    // Add course to user's enrolled courses
    user.enrolledCourses.push({
      course: course._id,
      progress: 0,
      isCompleted: false,
      enrolledAt: Date.now(),
    });

    // Add user to course's enrolled students
    if (!course.enrolledStudents.includes(user._id)) {
      course.enrolledStudents.push(user._id);
    }

    // Add activity to user's log
    user.activityLog.push({
      activity: `Enrolled in course: ${course.title}`,
      timestamp: Date.now(),
    });

    await user.save();
    await course.save();

    res.json({
      success: true,
      message: 'Successfully enrolled in course',
      enrollment: user.enrolledCourses[user.enrolledCourses.length - 1],
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


export const getCourseEnrollments = async (req, res) => {
  try {
    const courseId = req.params.id;

    // Verify the course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get all users enrolled in this course
    const users = await User.find(
      { 'enrolledCourses.course': courseId },
      'name email avatar enrolledCourses.$' // Only get relevant fields and matching enrollments
    ).lean();

    // Transform the data to match what your frontend expects
    const enrollments = users.map(user => {
      const enrollment = user.enrolledCourses.find(e => e.course.toString() === courseId.toString());
      return {
        _id: enrollment._id,
        student: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar
        },
        progress: enrollment.progress || 0,
        isCompleted: enrollment.isCompleted || false,
        enrolledAt: enrollment.enrolledAt,
        lastActivityAt: enrollment.lastActivityAt || enrollment.enrolledAt,
        rating: enrollment.rating,
        feedback: enrollment.feedback
      };
    });

    // Sort by most recent activity (fall back to enrollment date if no activity)
    enrollments.sort((a, b) => {
      const dateA = a.lastActivityAt || a.enrolledAt;
      const dateB = b.lastActivityAt || b.enrolledAt;
      return new Date(dateB) - new Date(dateA);
    });

    res.status(200).json({
      success: true,
      enrollments
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get courses created by the logged-in user
// @route   GET /api/courses/mycourses
// @access  Private (Teachers and Admins only)
export const getMyCourses = async (req, res) => {
  try {
    const courses = await Course.find({ creator: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: courses.length,
      courses,
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

// @desc    Get courses enrolled by the logged-in user
// @route   GET /api/courses/enrolled
// @access  Private
export const getEnrolledCourses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'enrolledCourses.course',
        select: 'title description subject grade imageUrl units level isPublished creator',
        match: { 
          _id: { $exists: true }, // Only populate if course exists
          isPublished: true,      // Optional: only include published courses
          creator: { $exists: true, $ne: null } // Ensure creator exists
        },
        populate: {
          path: 'creator',
          select: 'name email',
          match: { _id: { $exists: true } } // Only populate if creator exists
        },
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Filter out any enrolledCourses where:
    // - course is null (was deleted)
    // - or course.creator is null (creator was deleted)
    const validEnrolledCourses = user.enrolledCourses.filter(ec => 
      ec.course !== null && 
      ec.course.creator !== null
    );

    res.json({
      success: true,
      count: validEnrolledCourses.length,
      enrolledCourses: validEnrolledCourses,
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



// @desc    Update user progress in a course
// @route   POST /api/courses/:courseId/progress
// @access  Private (Student only)

// export const updateCourseProgress = async (req, res) => {
//   try {
//     const { lessonId, completed } = req.body;
//     const courseId = req.params.courseId;

//     // Validate course exists
//     const course = await Course.findById(courseId);
//     if (!course) {
//       return res.status(404).json({
//         success: false,
//         message: 'Course not found',
//       });
//     }

//     // Check if user is enrolled
//     const user = await User.findById(req.user._id);
//     const enrollmentIndex = user.enrolledCourses.findIndex(
//       e => e.course.toString() === courseId
//     );

//     if (enrollmentIndex === -1) {
//       return res.status(401).json({
//         success: false,
//         message: 'You are not enrolled in this course',
//       });
//     }

//     const enrollment = user.enrolledCourses[enrollmentIndex];
    
//     // Initialize completedLessons array if it doesn't exist
//     if (!enrollment.completedLessons) {
//       enrollment.completedLessons = [];
//     }

//     // Find the lesson in the course and update its completion status
//     let lessonExists = false;
//     let totalLessons = 0;
//     let completedLessonsCount = 0;

//     for (const unit of course.units) {
//       for (const lesson of unit.lessons) {
//         totalLessons++;
        
//         if (lesson._id.toString() === lessonId) {
//           lessonExists = true;
//           lesson.isCompleted = completed;
//           lesson.completedAt = completed ? Date.now() : null;
//           if (completed && !lesson.completedBy.includes(user._id)) {
//             lesson.completedBy.push(user._id);
//           }
//         }

//         // Count completed lessons
//         if (lesson.isCompleted && lesson.completedBy.includes(user._id)) {
//           completedLessonsCount++;
//         }
//       }
//     }

//     if (!lessonExists) {
//       return res.status(404).json({
//         success: false,
//         message: 'Lesson not found in this course',
//       });
//     }

//     // Update user's completed lessons array
//     if (completed) {
//       if (!enrollment.completedLessons.includes(lessonId)) {
//         enrollment.completedLessons.push(lessonId);
//       }
//     } else {
//       enrollment.completedLessons = enrollment.completedLessons.filter(
//         id => id !== lessonId
//       );
//     }

//     // Calculate progress percentage
//     const progressPercentage = totalLessons > 0
//       ? Math.round((completedLessonsCount / totalLessons) * 100)
//       : 0;

//     enrollment.progress = progressPercentage;
//     const isCourseCompleted = progressPercentage === 100;
//     enrollment.isCompleted = isCourseCompleted;

//     // Award points for completing a lesson (if not already completed)
//     if (completed && !user.completedLessons?.includes(lessonId)) {
//       const pointsToAward = 5; // Base points for completing a lesson
//       user.points += pointsToAward;

//       // Track completed lessons at user level
//       if (!user.completedLessons) {
//         user.completedLessons = [];
//       }
//       user.completedLessons.push(lessonId);

//       // Check for level up
//       const newLevel = Math.floor(user.points / 100) + 1;
//       if (newLevel > user.level) {
//         user.level = newLevel;
//         user.activityLog.push({
//           activity: `Leveled up to Level ${newLevel}!`,
//           timestamp: Date.now()
//         });
//       }

//       // Add activity log
//       user.activityLog.push({
//         activity: `Completed a lesson in "${course.title}" and earned ${pointsToAward} points`,
//         timestamp: Date.now()
//       });
//     }

//     // Check for rewards when course is completed
//     let awardedRewards = [];
//     if (isCourseCompleted) {
//       // Find course completion rewards
//       const rewards = await Reward.find({
//         'criteria.type': 'course-completion',
//         isActive: true
//       });

//       for (const reward of rewards) {
//         // Check if user already has this reward
//         const alreadyAwarded = user.rewards.some(
//           r => r.toString() === reward._id.toString()
//         );

//         if (!alreadyAwarded) {
//           // Add reward to user
//           user.rewards.push(reward._id);
//           awardedRewards.push(reward);

//           // Add to reward's awarded list
//           reward.awardedTo.push({
//             user: user._id,
//             awardedAt: Date.now(),
//             reason: `Completed course "${course.title}" with ${progressPercentage}% progress`
//           });

//           await reward.save();

//           // Add activity log
//           user.activityLog.push({
//             activity: `Earned the "${reward.name}" ${reward.type}!`,
//             timestamp: Date.now()
//           });
//         }
//       }
//     }

//     // Save both course and user changes
//     await course.save();
//     await user.save();

//     res.json({
//       success: true,
//       progress: {
//         completedLessons: enrollment.completedLessons,
//         progressPercentage,
//         isCompleted: isCourseCompleted,
//         points: user.points,
//         level: user.level
//       },
//       awardedRewards: isCourseCompleted ? awardedRewards : undefined
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: 'Server Error',
//       error: error.message,
//     });
//   }
// };

export const updateCourseProgress = async (req, res) => {
  try {
    const { lessonId, completed } = req.body;
    const courseId = req.params.courseId;

    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check if user is enrolled
    const user = await User.findById(req.user._id);
    const enrollmentIndex = user.enrolledCourses.findIndex(
      e => e.course.toString() === courseId
    );

    if (enrollmentIndex === -1) {
      return res.status(401).json({
        success: false,
        message: 'You are not enrolled in this course',
      });
    }

    const enrollment = user.enrolledCourses[enrollmentIndex];
    
    // Initialize completedLessons array if it doesn't exist
    if (!enrollment.completedLessons) {
      enrollment.completedLessons = [];
    }

    // Find the lesson in the course and update its completion status
    let lessonExists = false;
    let totalLessons = 0;
    let completedLessonsCount = 0;

    for (const unit of course.units) {
      for (const lesson of unit.lessons) {
        totalLessons++;
        
        if (lesson._id.toString() === lessonId) {
          lessonExists = true;
          lesson.isCompleted = completed;
          lesson.completedAt = completed ? Date.now() : null;
          if (completed && !lesson.completedBy.includes(user._id)) {
            lesson.completedBy.push(user._id);
          }
        }

        // Count completed lessons
        if (lesson.isCompleted && lesson.completedBy.includes(user._id)) {
          completedLessonsCount++;
        }
      }
    }

    if (!lessonExists) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found in this course',
      });
    }

    // Update user's completed lessons array
    if (completed) {
      if (!enrollment.completedLessons.includes(lessonId)) {
        enrollment.completedLessons.push(lessonId);
      }
    } else {
      enrollment.completedLessons = enrollment.completedLessons.filter(
        id => id !== lessonId
      );
    }

    // Calculate progress percentage
    const progressPercentage = totalLessons > 0
      ? Math.round((completedLessonsCount / totalLessons) * 100)
      : 0;

    enrollment.progress = progressPercentage;
    const isCourseCompleted = progressPercentage === 100;
    enrollment.isCompleted = isCourseCompleted;
 if (!user.completedLessons) {
        user.completedLessons = [];
      }
    // Award points for completing a lesson (if not already completed)
    let pointsToAward = 0;
    if (completed && user.completedLessons && user.completedLessons.length > 0 && !user.completedLessons.includes(lessonId)) {
      pointsToAward = 5; // Base points for completing a lesson
      user.points += pointsToAward;

      // Track completed lessons at user level
     
      user.completedLessons.push(lessonId);

      // Check for level up
      const newLevel = Math.floor(user.points / 100) + 1;
      if (newLevel > user.level) {
        user.level = newLevel;
        user.activityLog.push({
          activity: `Leveled up to Level ${newLevel}!`,
          timestamp: Date.now()
        });
      }

      // Add activity log
      user.activityLog.push({
        activity: `Completed a lesson in "${course.title}" and earned ${pointsToAward} points`,
        timestamp: Date.now()
      });
    }

    // Check for all types of rewards
    let awardedRewards = [];
    
    // 1. Check points-based rewards (like "100 Points Club")
    const pointsRewards = await Reward.find({
      'criteria.type': 'points-earned',
      'criteria.threshold': { $lte: user.points },
      isActive: true
    });

    // 2. Check course completion rewards (like "Math Whiz Badge")
    const completionRewards = isCourseCompleted 
      ? await Reward.find({
          'criteria.type': 'course-completion',
          'criteria.threshold': { $lte: progressPercentage },
          isActive: true
        })
      : [];

    // 3. Check quiz-based rewards (like "Quiz Master")
    // Note: This would need quiz attempt data - might need separate implementation
    // For now, we'll just include the structure
    const quizRewards = await Reward.find({
      'criteria.type': 'quiz-score',
      isActive: true
    });

    // Combine all potential rewards
    const allPotentialRewards = [...pointsRewards, ...completionRewards, ...quizRewards];

    for (const reward of allPotentialRewards) {
      // Check if user already has this reward
      const alreadyAwarded = user.rewards.some(
        r => r.toString() === reward._id.toString()
      );

      if (!alreadyAwarded) {
        // Additional checks for custom criteria
        let shouldAward = true;
        
        if (reward.criteria.type === 'custom') {
          // Implement custom rule evaluation
          if (reward.criteria.customRule === "Complete 3 reading lessons with 100% scores") {
            // This would need actual quiz score data to implement properly
            shouldAward = false; // Default to false for this demo
          }
        }

        if (shouldAward) {
          // Add reward to user
          user.rewards.push(reward._id);
          awardedRewards.push(reward);

          // Add to reward's awarded list
          reward.awardedTo.push({
            user: user._id,
            awardedAt: Date.now(),
            reason: getRewardReason(reward, user, course, progressPercentage)
          });

          await reward.save();

          // Add activity log
          user.activityLog.push({
            activity: `Earned the "${reward.name}" ${reward.type}!`,
            timestamp: Date.now()
          });
        }
      }
    }

    // Save both course and user changes
    await course.save();
    await user.save();

    res.json({
      success: true,
      progress: {
        completedLessons: enrollment.completedLessons,
        progressPercentage,
        isCompleted: isCourseCompleted,
        points: user.points,
        level: user.level
      },
      awardedRewards: awardedRewards.length > 0 ? awardedRewards : undefined
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

// Helper function to generate reward reason
function getRewardReason(reward, user, course, progressPercentage) {
  switch(reward.criteria.type) {
    case 'points-earned':
      return `Earned ${user.points} points`;
    case 'course-completion':
      return `Completed course "${course.title}" with ${progressPercentage}% progress`;
    case 'quiz-score':
      return `Achieved high score on a quiz in "${course.title}"`;
    default:
      return `Met the criteria for ${reward.name}`;
  }
}
// @desc    Get user progress in a course
// @route   GET /api/courses/:courseId/progress
// @access  Private (Student only)
export const getCourseProgress = async (req, res) => {
  try {
    const courseId = req.params.courseId;

    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check if user is enrolled
    const user = await User.findById(req.user._id);
    const enrollment = user.enrolledCourses.find(
      e => e.course.toString() === courseId
    );

    if (!enrollment) {
      return res.status(401).json({
        success: false,
        message: 'You are not enrolled in this course',
      });
    }

    // Calculate total lessons
    let totalLessons = 0;
    course.units.forEach(unit => {
      totalLessons += unit.lessons.length;
    });

    res.json({
      success: true,
      progress: {
        completedLessons: enrollment.completedLessons || [],
        progressPercentage: enrollment.progress || 0,
        isCompleted: enrollment.isCompleted || false,
        totalLessons,
        points: user.points,
        level: user.level
      }
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


// @desc    Get user rewards and points
// @route   GET /api/users/me/rewards
// @access  Private (Student only)
export const getUserRewardsAndPoints = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('rewards', 'name description imageUrl type rarity category');

    res.json({
      success: true,
      rewards: user.rewards,
      points: user.points,
      level: user.level
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

// @desc    Get leaderboard
// @route   GET /api/users/leaderboard
// @access  Private
export const getLeaderboard = async (req, res) => {
  try {
    const users = await User.find({ role: 'student','preferences.learningApproach': 'tailored' })
      .sort({ points: -1, level: -1 })
      .limit(10)
      .select('name points level avatar');

    res.json({
      success: true,
      leaderboard: users
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