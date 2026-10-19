import { Request, Response, NextFunction } from 'express';
import {
  CopilotChatRequestSchema,
  CopilotChatRequest,
} from '../types';
import {
  executeCopilotChat,
  getCopilotStatus,
} from '../services/copilotService';
import { AppError } from '../middleware/errorHandler';

/**
 * GET /api/copilot/status
 * Returns current Copilot model configuration, availability, and single-workspace metadata.
 */
export const getStatus = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const status = getCopilotStatus();
    res.status(200).json({
      success: true,
      data: status,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/copilot/chat
 * Validates request payload, builds authoritative financial context from MongoDB records,
 * and calls the Gemini AI reasoning model.
 */
export const postChat = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Enforce payload presence
    if (!req.body || typeof req.body !== 'object') {
      throw new AppError('Invalid request body. JSON object required.', 400);
    }

    // 2. Validate input schema with Zod
    const parseResult = CopilotChatRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      const errorMessage = issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid request payload';
      throw new AppError(errorMessage, 400, parseResult.error.flatten());
    }

    const validatedInput: CopilotChatRequest = parseResult.data;

    // 3. Execute data-grounded Gemini chat
    const result = await executeCopilotChat(validatedInput);

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};
