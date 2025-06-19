import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { SignupRequest, LoginRequest, ApiResponse } from '../types';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt';

export const signup = async (req: Request, res: Response) => {
  try {
    const { username, password, email, displayName }: SignupRequest = req.body;
    
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: email ? email : undefined }
        ]
      }
    });
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists',
        error: 'Username or email is already taken'
      });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
        displayName: displayName || username
      }
    });
    
    const { password: _, ...userWithoutPassword } = newUser;
    
    const response: ApiResponse<typeof userWithoutPassword> = {
      success: true,
      message: 'User created successfully',
      data: userWithoutPassword
    };
    
    return res.status(201).json(response);
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'Failed to create user'
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password }: LoginRequest = req.body;
    
    const user = await prisma.user.findUnique({
      where: { username }
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
        error: 'Invalid username or password'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
        error: 'Invalid username or password'
      });
    }
    
    const token = generateToken({ 
      id: user.id,
      username: user.username
    });

    const { password: _, ...userWithoutPassword } = user;
    
    const response: ApiResponse<any> = {
      success: true,
      message: 'Login successful',
      data: {
        ...userWithoutPassword,
        token
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'Failed to authenticate user'
    });
  }
};