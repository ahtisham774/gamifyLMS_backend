import express from 'express';
import {
  createReward,
  getAllRewards,
  getRewardById,
  updateReward,
  deleteReward,
  awardRewardToUser,
  getUserRewards
} from '../controllers/rewardController.js';
import { protect, teacher } from '../middleware/auth.js';

const router = express.Router();

// GET /api/rewards - Get all rewards
router.get('/', protect, getAllRewards);

// GET /api/rewards/user/:userId - Get rewards for a specific user
router.get('/user/:userId', protect, getUserRewards);

// POST /api/rewards - Create a new reward
router.post('/', protect, teacher, createReward);

// POST /api/rewards/:id/award/:userId - Award a reward to a user
router.post('/:id/award/:userId', protect, teacher, awardRewardToUser);

// GET /api/rewards/:id - Get a single reward
router.get('/:id', protect, getRewardById);

// PUT /api/rewards/:id - Update a reward
router.put('/:id', protect, updateReward);

// DELETE /api/rewards/:id - Delete a reward
router.delete('/:id', protect, deleteReward);

export default router;
