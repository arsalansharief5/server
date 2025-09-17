import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { isUserOnline } from '../utils/redis';

export const getProfileByUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const requesterId = req.user?.id;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const { password, ...userWithoutPassword } = user;

    if (requesterId === user.id) {
      const online = await isUserOnline(user.id);
      return res.json({
        success: true,
        data: {
          ...userWithoutPassword,
          isOnline: online,
          socialMedia: {
            twitter: user.twitter,
            linkedin: user.linkedin,
            instagram: user.instagram,
            github: user.github,
            website: user.website,
            telegram: user.telegram,
            snapchat: user.snapchat,
            discord: user.discord,
          }
        },
      });
    }

    let isFriend = false;
    if (requesterId) {
      const friendship = await prisma.friendship.findFirst({
        where: {
          userId: requesterId,
          friendId: user.id,
        },
      });
      isFriend = !!friendship;
    }

    const profile: any = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      createdAt: user.createdAt,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      totalOnlineSeconds: user.totalOnlineSeconds,
    };

    if (user.email && 
        (user.emailPrivacy === 'public' || 
         (user.emailPrivacy === 'friends_only' && isFriend))) {
      profile.email = user.email;
    }

    if (user.dateOfBirth && 
        (user.dobPrivacy === 'public' || 
         (user.dobPrivacy === 'friends_only' && isFriend))) {
      profile.dateOfBirth = user.dateOfBirth;
    }

    if (user.lastOnlinePrivacy === 'public' || 
        (user.lastOnlinePrivacy === 'friends_only' && isFriend)) {
      profile.lastOnlineAt = user.lastOnlineAt;
    }

    if (user.onlinePrivacy === 'public' || 
        (user.onlinePrivacy === 'friends_only' && isFriend)) {
      profile.isOnline = await isUserOnline(user.id);
    }

    if (user.socialMediaPrivacy === 'public' || 
        (user.socialMediaPrivacy === 'friends_only' && isFriend)) {
      profile.socialMedia = {
        twitter: user.twitter,
        linkedin: user.linkedin,
        instagram: user.instagram,
        github: user.github,
        website: user.website,
        telegram: user.telegram,
        snapchat: user.snapchat,
        discord: user.discord,
      };
    }

    return res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updatePrivacySettings = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const {
      onlinePrivacy,
      lastOnlinePrivacy,
      tabPrivacy,
      emailPrivacy,
      dobPrivacy,
      socialMediaPrivacy,
      friendsListPrivacy,
    } = req.body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(onlinePrivacy && { onlinePrivacy }),
        ...(lastOnlinePrivacy && { lastOnlinePrivacy }),
        ...(tabPrivacy && { tabPrivacy }),
        ...(emailPrivacy && { emailPrivacy }),
        ...(dobPrivacy && { dobPrivacy }),
        ...(socialMediaPrivacy && { socialMediaPrivacy }),
        ...(friendsListPrivacy && { friendsListPrivacy }),
      },
      select: {
        id: true,
        onlinePrivacy: true,
        lastOnlinePrivacy: true,
        tabPrivacy: true,
        emailPrivacy: true,
        dobPrivacy: true,
        socialMediaPrivacy: true,
        friendsListPrivacy: true,
      }
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update privacy error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const {
      displayName,
      bio,
      dateOfBirth,
      twitter,
      linkedin,
      instagram,
      github,
      website,
      telegram,
      snapchat,
      discord,
      avatarUrl
    } = req.body;

    // Basic validation
    if (displayName && displayName.trim().length > 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Display name too long',
        error: 'Display name must be 100 characters or less'
      });
    }

    if (bio && bio.length > 500) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bio too long',
        error: 'Bio must be 500 characters or less'
      });
    }

    // URL validation helper
    const isValidUrl = (url: string) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    // Validate social media URLs if provided
    const socialMediaFields = { twitter, linkedin, instagram, github, website, telegram, snapchat, discord };
    for (const [platform, url] of Object.entries(socialMediaFields)) {
      if (url && !isValidUrl(url)) {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid ${platform} URL`,
          error: `Please provide a valid URL for ${platform}`
        });
      }
    }

    // Date validation
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const now = new Date();
      const age = now.getFullYear() - birthDate.getFullYear();
      
      if (birthDate > now) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid date of birth',
          error: 'Date of birth cannot be in the future'
        });
      }

      if (age > 150) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid date of birth',
          error: 'Please provide a valid date of birth'
        });
      }
    }

    // Update the user
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(displayName !== undefined && { displayName: displayName?.trim() || null }),
        ...(bio !== undefined && { bio: bio?.trim() || null }),
        ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
        ...(twitter !== undefined && { twitter: twitter?.trim() || null }),
        ...(linkedin !== undefined && { linkedin: linkedin?.trim() || null }),
        ...(instagram !== undefined && { instagram: instagram?.trim() || null }),
        ...(github !== undefined && { github: github?.trim() || null }),
        ...(website !== undefined && { website: website?.trim() || null }),
        ...(telegram !== undefined && { telegram: telegram?.trim() || null }),
        ...(snapchat !== undefined && { snapchat: snapchat?.trim() || null }),
        ...(discord !== undefined && { discord: discord?.trim() || null }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl?.trim() || null }),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        dateOfBirth: true,
        avatarUrl: true,
        twitter: true,
        linkedin: true,
        instagram: true,
        github: true,
        website: true,
        telegram: true,
        snapchat: true,
        discord: true,
        updatedAt: true,
      }
    });

    return res.json({ 
      success: true, 
      data: updated,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: 'Failed to update profile'
    });
  }
};