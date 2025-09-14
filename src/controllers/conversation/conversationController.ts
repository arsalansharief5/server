import { Request, Response } from "express";
import prisma from "../../utils/prisma";
import { notifyConversationRequestAccepted } from "../../services/notificationService";

export const getUserConversations = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;

        const participations = await prisma.conversationParticipant.findMany({
            where: { userId },
            include: {
                conversation: {
                    include: {
                        lastMessage: {
                            include: {
                                sender: {
                                    select: { id: true, username: true, displayName: true }
                                }
                            }
                        },
                        participants: {
                            include: {
                                user: {
                                    select: { id: true, username: true, displayName: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                conversation: {
                    updatedAt: 'desc'
                }
            }
        });

        return res.json({
            success: true,
            data: participations
        });
    } catch (error) {
        console.log('[ConversationController]: getUserConversations error: ', (error));
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}


export const getMessages = async (req: Request, res: Response) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;
        const { limit = 10, cursor, markAsSeen = 'true' } = req.query;

        // check if user is participant
        const participant = await prisma.conversationParticipant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId
                }
            },
            include: {
                conversation: { select: { type: true, name: true } }
            }
        });

        if (!participant) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }

        const whereClause: any = {
            conversationId,
            deletedForAll: false
        }

        if (cursor) {
            whereClause.createdAt = {
                lt: new Date(cursor as string)
            };
        }
        
        const conversationType = participant.conversation.type;
        let messages: any[];
        messages = await prisma.message.findMany({
            where: whereClause,
            include: {
                sender: {
                    select: { id: true, username: true, displayName: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit as string)
        });

      let totalUnreadMarked = 0;
      if (markAsSeen === 'true' && participant.status === 'ACCEPTED') {
        let unreadMessages: any[] = [];

        unreadMessages = messages.filter(msg => 
          msg.senderId !== userId && !msg.seenAt
        );
        
        if (unreadMessages.length > 0) {
          await prisma.message.updateMany({
            where: {
              id: { in: unreadMessages.map(msg => msg.id) }
            },
            data: { seenAt: new Date() }
          });
          
          const seenAt = new Date().toISOString();
          messages = messages.map(msg => 
            unreadMessages.some(unread => unread.id === msg.id) 
              ? { ...msg, seenAt } 
              : msg
          );
          
          totalUnreadMarked = unreadMessages.length;
        }

        // Reset unread count if there were unread messages
        if (unreadMessages.length > 0) {
          await prisma.conversationParticipant.updateMany({
            where: {
              conversationId,
              userId,
              unreadCount: { gt: 0 }
            },
            data: { unreadCount: 0 }
          });
          
          const { wsClients } = await import('../../websocket/handler');
          const userWs = wsClients[userId];
          
          // Notify other participants about seen status
          const otherParticipants = await prisma.conversationParticipant.findMany({
            where: {
              conversationId,
              userId: { not: userId },
              status: 'ACCEPTED'
            }
          });
          
          otherParticipants.forEach(p => {
            const ws = wsClients[p.userId];
            if (ws && ws.readyState === 1) {
              ws.send(JSON.stringify({
                type: 'MESSAGES_SEEN',
                data: {
                  conversationId,
                  seenBy: conversationType === userId,
                  seenAt: new Date().toISOString(),
                  messageCount: unreadMessages.length,
                  messageIds: unreadMessages.map(msg => msg.id)
                }
              }));
            }
          });
        }
      }

      return res.status(200).json({
          success: true,
          data: messages.reverse(),
          canReply: participant.status === 'ACCEPTED'
      });
    } catch (error) {
        console.log('[ConversationController]: getMessages error: ', (error));
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

// Accept conversation/group invite
export const acceptConversationInvite = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      }
    });

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    if (participant.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Invitation is not pending'
      });
    }

    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      },
      data: {
        status: 'ACCEPTED'
      }
    });

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          where: { status: 'ACCEPTED', userId: { not: userId } },
          include: {
            user: {
              select: { id: true, username: true, displayName: true }
            }
          }
        }
      }
    });

    if (conversation && conversation.participants.length > 0) {
      if (conversation.type === 'DIRECT') {
        const otherParticipant = conversation.participants[0];
        if (otherParticipant) {
          await notifyConversationRequestAccepted(
            otherParticipant.userId,
            userId,
            conversationId
          );
        }
      }
    }

    return res.json({
      success: true,
      message: 'Invitation accepted'
    });

  } catch (error) {
    console.error('Accept conversation invite error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const rejectConversationInvite = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      }
    });

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    if (participant.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Invitation is not pending'
      });
    }

    await prisma.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      }
    });

    return res.json({
      success: true,
      message: 'Invitation rejected'
    });

  } catch (error) {
    console.error('Reject conversation invite error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
