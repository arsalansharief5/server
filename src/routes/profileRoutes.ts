import { Router } from 'express';
import { getProfileByUsername, updatePrivacySettings } from '../controllers/profileController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/:username', authenticate, getProfileByUsername);
router.patch('/privacy', authenticate, updatePrivacySettings);

export default router;