import express from 'express';
import {
  startAttempt,
  submitAttempt,
  getUserAttempts,
  getAttemptById,
  getAttemptsByQuiz
} from '../controllers/attemptController.js';
import { protect, teacher } from '../middleware/auth.js';

const router = express.Router();

// GET /api/attempts - Get all attempts by the current user
router.get('/', protect, getUserAttempts);

// GET /api/attempts/quiz/:quizId - Get attempts for a specific quiz
router.get('/quiz/:quizId', protect, teacher, getAttemptsByQuiz);

// POST /api/attempts/start - Start a quiz attempt
router.post('/start', protect, startAttempt);

// POST /api/attempts/submit/:id - Submit a quiz attempt
router.post('/submit/:id', protect, submitAttempt);

// GET /api/attempts/:id - Get a single attempt
router.get('/:id', protect, getAttemptById);

export default router;
