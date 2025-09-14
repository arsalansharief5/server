import { Router } from 'express';
import { getUserNotifications, markAsRead, getUnreadCount } from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Query params: ?page=1&limit=20&unreadOnly=false
router.get('/', authenticate, getUserNotifications);

router.get('/unread-count', authenticate, getUnreadCount);

router.patch('/:notificationId/read', authenticate, markAsRead);

router.patch('/read-all', authenticate, markAsRead);

export default router;