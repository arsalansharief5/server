import { Router } from 'express';
import { getProfileByUsername, updatePrivacySettings, updateProfile } from '../controllers/profileController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/:username', authenticate, getProfileByUsername);
router.patch('/privacy', authenticate, updatePrivacySettings);
router.patch('/', authenticate, updateProfile);

export default router;