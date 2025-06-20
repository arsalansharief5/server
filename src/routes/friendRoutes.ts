import { Router } from 'express';
import {
  sendFriendRequest,
  acceptFriendRequest,
  ignoreFriendRequest,
  getAllFriends,
  getPendingFriendRequests,
  cancelFriendRequest,
  removeFriend,
  getFriendshipStatus,
  getPendingSentFriendRequests,
} from '../controllers/friendController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/request', sendFriendRequest);
router.patch('/accept/:requestId', acceptFriendRequest);
router.patch('/ignore/:requestId', ignoreFriendRequest);
router.delete('/request/:requestId', cancelFriendRequest);
router.delete('/:friendId', removeFriend);

router.get('/', getAllFriends);
router.get('/requests/pending', getPendingFriendRequests);
router.get('/requests/sent', getPendingSentFriendRequests);
router.get('/status', getFriendshipStatus);

export default router;
