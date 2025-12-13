import { prisma } from './prisma';
import { CreditTransactionType } from '@prisma/client';

/**
 * Custom error classes for BG removal credits
 */
export class InsufficientBgCreditsError extends Error {
  constructor(
    public required: number,
    public available: number,
    message?: string
  ) {
    super(message || `Insufficient BG removal credits. Required: ${required}, Available: ${available}`);
    this.name = 'InsufficientBgCreditsError';
  }
}

export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User with ID ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}

export class BgCreditTransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BgCreditTransactionError';
  }
}

/**
 * Interface for BG credit transaction results
 */
export interface BgCreditTransactionResult {
  success: boolean;
  newBalance: number;
  transactionId: string;
  error?: string;
}

/**
 * Interface for BG credit validation results
 */
export interface BgCreditValidationResult {
  isValid: boolean;
  available: number;
  required: number;
  deficit?: number;
}

/**
 * BgCreditManager class for handling background removal credits
 */
export class BgCreditManager {
  private userId: string;
  private currentBalance: number | null = null;
  private lastUpdated: Date | null = null;
  private readonly CACHE_DURATION_MS = 5000;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Get current BG removal credit balance with caching
   */
  async getCurrentBalance(forceRefresh: boolean = false): Promise<number> {
    const now = new Date();
    
    if (
      !forceRefresh &&
      this.currentBalance !== null &&
      this.lastUpdated &&
      (now.getTime() - this.lastUpdated.getTime()) < this.CACHE_DURATION_MS
    ) {
      return this.currentBalance;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: this.userId },
        select: { bgRemovalCredits: true }
      });

      if (!user) {
        throw new UserNotFoundError(this.userId);
      }

      this.currentBalance = user.bgRemovalCredits;
      this.lastUpdated = now;
      
      return this.currentBalance;
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw error;
      }
      throw new BgCreditTransactionError(`Failed to fetch BG removal credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate if user has sufficient BG removal credits
   */
  async validateCredits(requiredCredits: number): Promise<BgCreditValidationResult> {
    const available = await this.getCurrentBalance();
    const isValid = available >= requiredCredits;
    
    return {
      isValid,
      available,
      required: requiredCredits,
      deficit: isValid ? undefined : requiredCredits - available
    };
  }

  /**
   * Check if user can afford a specific number of BG removal credits
   */
  async canAfford(credits: number): Promise<boolean> {
    const validation = await this.validateCredits(credits);
    return validation.isValid;
  }

  /**
   * Deduct BG removal credits with atomic transaction
   */
  async deductCredits(
    amount: number,
    description?: string
  ): Promise<BgCreditTransactionResult> {
    if (amount <= 0) {
      throw new BgCreditTransactionError('Credit amount must be positive');
    }

    try {
      const validation = await this.validateCredits(amount);
      if (!validation.isValid) {
        throw new InsufficientBgCreditsError(amount, validation.available);
      }

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: this.userId },
          select: { bgRemovalCredits: true }
        });

        if (!user) {
          throw new UserNotFoundError(this.userId);
        }

        if (user.bgRemovalCredits < amount) {
          throw new InsufficientBgCreditsError(amount, user.bgRemovalCredits);
        }

        const updatedUser = await tx.user.update({
          where: { id: this.userId },
          data: { bgRemovalCredits: user.bgRemovalCredits - amount }
        });

        const transaction = await tx.creditTransaction.create({
          data: {
            userId: this.userId,
            amount: -amount,
            type: CreditTransactionType.BG_REMOVAL,
            description: description || `Deducted ${amount} BG removal credit(s)`
          }
        });

        return {
          newBalance: updatedUser.bgRemovalCredits,
          transactionId: transaction.id
        };
      });

      this.currentBalance = result.newBalance;
      this.lastUpdated = new Date();

      return {
        success: true,
        newBalance: result.newBalance,
        transactionId: result.transactionId
      };

    } catch (error) {
      if (error instanceof InsufficientBgCreditsError || error instanceof UserNotFoundError) {
        throw error;
      }
      
      return {
        success: false,
        newBalance: this.currentBalance || 0,
        transactionId: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Add BG removal credits with atomic transaction
   */
  async addCredits(
    amount: number,
    description?: string,
    transactionType: CreditTransactionType = CreditTransactionType.PURCHASE
  ): Promise<BgCreditTransactionResult> {
    if (amount <= 0) {
      throw new BgCreditTransactionError('Credit amount must be positive');
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: this.userId },
          select: { bgRemovalCredits: true }
        });

        if (!user) {
          throw new UserNotFoundError(this.userId);
        }

        const updatedUser = await tx.user.update({
          where: { id: this.userId },
          data: { bgRemovalCredits: user.bgRemovalCredits + amount }
        });

        const transaction = await tx.creditTransaction.create({
          data: {
            userId: this.userId,
            amount: amount,
            type: transactionType,
            description: description || `Added ${amount} BG removal credit(s)`
          }
        });

        return {
          newBalance: updatedUser.bgRemovalCredits,
          transactionId: transaction.id
        };
      });

      this.currentBalance = result.newBalance;
      this.lastUpdated = new Date();

      return {
        success: true,
        newBalance: result.newBalance,
        transactionId: result.transactionId
      };

    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw error;
      }
      
      return {
        success: false,
        newBalance: this.currentBalance || 0,
        transactionId: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.currentBalance = null;
    this.lastUpdated = null;
  }

  /**
   * Static method to create a BgCreditManager instance
   */
  static create(userId: string): BgCreditManager {
    return new BgCreditManager(userId);
  }
}

/**
 * Utility functions for backward compatibility
 */
export async function getBgRemovalCredits(userId: string): Promise<number> {
  const manager = new BgCreditManager(userId);
  return manager.getCurrentBalance();
}

export async function deductBgRemovalCredits(
  userId: string,
  amount: number,
  description?: string
): Promise<BgCreditTransactionResult> {
  const manager = new BgCreditManager(userId);
  return manager.deductCredits(amount, description);
}

export async function validateBgRemovalCredits(
  userId: string,
  requiredCredits: number
): Promise<BgCreditValidationResult> {
  const manager = new BgCreditManager(userId);
  return manager.validateCredits(requiredCredits);
}
