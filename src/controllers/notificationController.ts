import { Request, Response } from 'express';
import prisma from '../utils/prisma';


export const createNotification = async (params: {
  userId: string;
  type: 'FRIEND_REQUEST_RECEIVED' | 'FRIEND_REQUEST_ACCEPTED' | 'CONVERSATION_INVITE' | 'CONVERSATION_ACCEPTED' | 'SYSTEM_NOTIFICATION';
  title: string;
  body: string;
  fromUserId?: string;
  relatedId?: string;
  relatedType?: string;
  actionUrl?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  metadata?: any;
}) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        fromUserId: params.fromUserId,
        relatedId: params.relatedId,
        relatedType: params.relatedType,
        actionUrl: params.actionUrl,
        priority: params.priority || 'MEDIUM',
        metadata: params.metadata || undefined
      }
    });

    console.log(`[Notification] Created notification for user ${params.userId}: ${params.title}`);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { page = '1', limit = '20', unreadOnly = 'false' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;
    
    const whereClause = {
      userId,
      ...(unreadOnly === 'true' ? { isRead: false } : {})
    };

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limitNum,
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    const totalCount = await prisma.notification.count({
      where: whereClause
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(totalCount / limitNum),
          unreadCount
        }
      }
    });
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: 'Internal server error'
    });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;
    const { markAll = false } = req.body;

    if (markAll || notificationId === 'all') {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return res.status(200).json({
        success: true,
        message: `Marked ${result.count} notifications as read`
      });
    } else {
      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId
        }
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      await prisma.notification.update({
        where: {
          id: notificationId
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Notification marked as read'
      });
    }
  } catch (error) {
    console.error('Error marking notification(s) as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification(s) as read',
      error: 'Internal server error'
    });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    
    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        unreadCount
      }
    });
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notification count',
      error: 'Internal server error'
    });
  }
};