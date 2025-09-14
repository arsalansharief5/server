import prisma from '../utils/prisma';
import { wsClients } from '../websocket/handler';
import { createNotification } from '../controllers/notificationController';

export const notifyFriendsUserOnline = async (userId: string) => {
  try {
    
    const onlineUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        onlinePrivacy: true
      }
    });

    if (!onlineUser) return;

    if (onlineUser.onlinePrivacy === 'private') return;

    const friendships = await prisma.friendship.findMany({
      where: { friendId: userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          }
        }
      }
    });

    for (const friendship of friendships) {
      const friend = friendship.user;
      
      const ws = wsClients[friend.id];
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: 'FRIEND_ONLINE',
          data: {
            userId: onlineUser.id,
            username: onlineUser.username,
            displayName: onlineUser.displayName,
            timestamp: new Date().toISOString()
          }
        }));
      }
    }
  } catch (error) {
    console.error('Error notifying friends about user online:', error);
  }
};

export const notifyFriendsUserOffline = async (userId: string) => {
  try {
    
    const offlineUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        onlinePrivacy: true
      }
    });

    if (!offlineUser) return;

    if (offlineUser.onlinePrivacy === 'private') return;

    const friendships = await prisma.friendship.findMany({
      where: { friendId: userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          }
        }
      }
    });

    for (const friendship of friendships) {
      const friend = friendship.user;
      
      const ws = wsClients[friend.id];
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: 'FRIEND_OFFLINE',
          data: {
            userId: offlineUser.id,
            username: offlineUser.username,
            displayName: offlineUser.displayName,
            timestamp: new Date().toISOString()
          }
        }));
      }
    }
  } catch (error) {
    console.error('Error notifying friends about user offline:', error);
  }
};

export const notifyFriendRequestReceived = async (receiverId: string, senderId: string, requestId: string) => {
  try {
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: {
        id: true,
        username: true,
        displayName: true
      }
    });

    if (!sender) return;

    const ws = wsClients[receiverId];
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: 'FRIEND_REQUEST_RECEIVED',
        data: {
          senderId: sender.id,
          senderName: sender.displayName || sender.username,
          senderUsername: sender.username,
          requestId: requestId,
          timestamp: new Date().toISOString()
        }
      }));
    }

    await createNotification({
      userId: receiverId,
      type: 'FRIEND_REQUEST_RECEIVED',
      title: 'New Friend Request',
      body: `${sender.displayName || sender.username} sent you a friend request`,
      fromUserId: senderId,
      relatedId: requestId,
      relatedType: 'friend_request',
      actionUrl: '/friends/requests',
      priority: 'MEDIUM',
      metadata: {
        senderUsername: sender.username,
        senderDisplayName: sender.displayName,
        requestId: requestId
      }
    });
  } catch (error) {
    console.error('Error notifying friend request received:', error);
  }
};

export const notifyFriendRequestAccepted = async (senderId: string, accepterId: string) => {
  try {
    const accepter = await prisma.user.findUnique({
      where: { id: accepterId },
      select: {
        id: true,
        username: true,
        displayName: true
      }
    });

    if (!accepter) return;

    // Send WebSocket notification for real-time updates
    const ws = wsClients[senderId];
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: 'FRIEND_REQUEST_ACCEPTED',
        data: {
          accepterId: accepter.id,
          accepterName: accepter.displayName || accepter.username,
          accepterUsername: accepter.username,
          timestamp: new Date().toISOString()
        }
      }));
    }

    // Create persistent notification in database
    await createNotification({
      userId: senderId,
      type: 'FRIEND_REQUEST_ACCEPTED',
      title: 'Friend Request Accepted',
      body: `${accepter.displayName || accepter.username} accepted your friend request`,
      fromUserId: accepterId,
      relatedType: 'friend_request',
      actionUrl: '/friends',
      priority: 'MEDIUM',
      metadata: {
        accepterUsername: accepter.username,
        accepterDisplayName: accepter.displayName
      }
    });
  } catch (error) {
    console.error('Error notifying friend request accepted:', error);
  }
};

export const notifyConversationRequestReceived = async (
  receiverId: string,
  senderId: string,
  conversationId: string,
  messageContent: string
) => {
  try {
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: {
        id: true,
        username: true,
        displayName: true
      }
    });

    if (!sender) return;

    const friendship = await prisma.friendship.findUnique({
      where: {
        userId_friendId: {
          userId: senderId,
          friendId: receiverId
        }
      }
    });

    if (friendship) {
      return;
    }

    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: receiverId
        }
      }
    });

    if (!participant || participant.status !== 'PENDING') {
      // Not a conversation request scenario
      return;
    }

    // Send WebSocket notification for real-time updates
    const ws = wsClients[receiverId];
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: 'CONVERSATION_REQUEST_RECEIVED',
        data: {
          senderId: sender.id,
          senderName: sender.displayName || sender.username,
          senderUsername: sender.username,
          conversationId: conversationId,
          messagePreview: messageContent.length > 50 ? messageContent.substring(0, 50) + '...' : messageContent,
          timestamp: new Date().toISOString()
        }
      }));
    }

    // Create persistent notification in database
    const truncatedMessage = messageContent.length > 80 
      ? messageContent.substring(0, 80) + '...' 
      : messageContent;

    await createNotification({
      userId: receiverId,
      type: 'CONVERSATION_INVITE',
      title: 'New Message Request',
      body: `${sender.displayName || sender.username}: ${truncatedMessage}`,
      fromUserId: senderId,
      relatedId: conversationId,
      relatedType: 'conversation',
      actionUrl: `/inbox?conversation=${conversationId}`,
      priority: 'HIGH',
      metadata: {
        senderUsername: sender.username,
        senderDisplayName: sender.displayName,
        conversationId: conversationId,
        messagePreview: messageContent.substring(0, 100),
        isMessageRequest: true
      }
    });
  } catch (error) {
    console.error('Error notifying conversation request received:', error);
  }
};

export const notifyConversationRequestAccepted = async (
  senderId: string,
  accepterId: string,
  conversationId: string
) => {
  try {
    const accepter = await prisma.user.findUnique({
      where: { id: accepterId },
      select: {
        id: true,
        username: true,
        displayName: true
      }
    });

    if (!accepter) return;

    // Send WebSocket notification for real-time updates
    const ws = wsClients[senderId];
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: 'CONVERSATION_REQUEST_ACCEPTED',
        data: {
          accepterId: accepter.id,
          accepterName: accepter.displayName || accepter.username,
          accepterUsername: accepter.username,
          conversationId: conversationId,
          timestamp: new Date().toISOString()
        }
      }));
    }

    // Create persistent notification in database
    await createNotification({
      userId: senderId,
      type: 'CONVERSATION_ACCEPTED',
      title: 'Message Request Accepted',
      body: `${accepter.displayName || accepter.username} accepted your message request`,
      fromUserId: accepterId,
      relatedId: conversationId,
      relatedType: 'conversation',
      actionUrl: `/inbox?conversation=${conversationId}`,
      priority: 'MEDIUM',
      metadata: {
        accepterUsername: accepter.username,
        accepterDisplayName: accepter.displayName,
        conversationId: conversationId
      }
    });
  } catch (error) {
    console.error('Error notifying conversation request accepted:', error);
  }
};
