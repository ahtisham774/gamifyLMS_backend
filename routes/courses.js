import express from 'express';
import {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  enrollInCourse,
  getMyCourses,
  getEnrolledCourses,
  updateCourseProgress,
  getCourseProgress,
  getUserRewardsAndPoints,
  getLeaderboard,
  getCourseEnrollments
} from '../controllers/courseController.js';
import { protect, teacher } from '../middleware/auth.js';

const router = express.Router();

// GET /api/courses - Get all courses
router.get('/', getAllCourses);

// GET /api/courses/mycourses - Get courses created by the logged-in user
router.get('/mycourses', protect, getMyCourses);

// GET /api/courses/enrolled - Get courses enrolled by the logged-in user
router.get('/enrolled', protect, getEnrolledCourses);

// POST /api/courses - Create a new course
router.post('/', protect, teacher, createCourse);

// GET /api/courses/:id - Get a single course
router.get('/:id', getCourseById);

// PUT /api/courses/:id - Update a course
router.put('/:id', protect, updateCourse);

// DELETE /api/courses/:id - Delete a course
router.delete('/:id', protect, deleteCourse);

// POST /api/courses/:id/enroll - Enroll in a course
router.post('/:id/enroll', protect, enrollInCourse);


router.post('/:courseId/progress', protect, updateCourseProgress);
router.get('/:courseId/progress', protect, getCourseProgress);

// Rewards and points routes
router.get('/users/me/rewards', protect, getUserRewardsAndPoints);
router.get('/users/leaderboard', protect, getLeaderboard);
router.get('/:id/enrollments', protect, teacher, getCourseEnrollments);

export default router;
