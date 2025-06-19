import { Request, Response, NextFunction } from 'express';
import { SignupRequest, LoginRequest } from '../types/index';

export const validateSignup = (req: Request, res: Response, next: NextFunction) => {
  const { username, password } = req.body as SignupRequest;
  
  if (!username || username.length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Invalid username',
      error: 'Username must be at least 3 characters long'
    });
  }
  
  if (!password || password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Invalid password',
      error: 'Password must be at least 6 characters long'
    });
  }
  
  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const { username, password } = req.body as LoginRequest;
  
  if (!username) {
    return res.status(400).json({
      success: false,
      message: 'Username is required',
      error: 'Username must be provided'
    });
  }
  
  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password is required',
      error: 'Password must be provided'
    });
  }
  
  next();
};