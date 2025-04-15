import express from 'express';
import {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  getQuizzesByCourse
} from '../controllers/quizController.js';
import { protect, teacher } from '../middleware/auth.js';

const router = express.Router();

// GET /api/quizzes - Get all quizzes (for teachers/admins)
router.get('/', protect, teacher, getAllQuizzes);

// GET /api/quizzes/course/:courseId - Get quizzes for a specific course
router.get('/course/:courseId', protect, getQuizzesByCourse);

// POST /api/quizzes - Create a new quiz
router.post('/', protect, teacher, createQuiz);

// GET /api/quizzes/:id - Get a single quiz
router.get('/:id', protect, getQuizById);

// PUT /api/quizzes/:id - Update a quiz
router.put('/:id', protect, teacher, updateQuiz);

// DELETE /api/quizzes/:id - Delete a quiz
router.delete('/:id', protect, teacher, deleteQuiz);

export default router;
