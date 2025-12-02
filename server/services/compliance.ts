
import { db } from "../db";
import { transactions } from "@shared/schema";
import { eq, and, gte, sum } from "drizzle-orm";

export interface ComplianceCheckResult {
  passed: boolean;
  reason?: string;
  riskScore: number;
  requiresManualReview: boolean;
}

export class ComplianceService {
  private sanctionList = new Set([
    'TR7654321',
    '0x1234567890abcdef1234567890abcdef12345678',
  ]);

  async checkTransaction(userId: string, amount: number, destination?: string): Promise<ComplianceCheckResult> {
    const result: ComplianceCheckResult = {
      passed: true,
      riskScore: 0,
      requiresManualReview: false
    };

    if (destination && this.sanctionList.has(destination)) {
      result.passed = false;
      result.reason = 'Destination address is on a sanction list (BNM/OFAC).';
      result.riskScore = 100;
      return result;
    }

    if (db) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const recentTx = await db.select({
            total: sum(transactions.amountUsdCents)
        }).from(transactions).where(
            and(
                eq(transactions.userId, userId),
                eq(transactions.type, 'withdrawal'),
                gte(transactions.createdAt, oneDayAgo)
            )
        );

        const dailyTotal = (Number(recentTx[0]?.total || 0) / 100) + amount;

        if (dailyTotal > 50000) {
            result.requiresManualReview = true;
            result.riskScore += 40;
            result.reason = result.reason ? `${result.reason}; Daily limit exceeded` : 'Daily limit exceeded';
        }

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const hourlyCount = await db.select().from(transactions).where(
             and(
                eq(transactions.userId, userId),
                eq(transactions.type, 'withdrawal'),
                gte(transactions.createdAt, oneHourAgo)
            )
        );

        if (hourlyCount.length >= 5) {
            result.requiresManualReview = true;
            result.riskScore += 30;
            result.reason = result.reason ? `${result.reason}; High frequency withdrawal detected` : 'High frequency withdrawal detected';
        }
    }

    if (amount > 10000) {
        result.requiresManualReview = true;
        result.riskScore += 20;
    }

    return result;
  }

  async checkAML(userId: string, userDetails: any): Promise<boolean> {
      return userDetails.kycStatus === 'Verified';
  }
}

export const complianceService = new ComplianceService();
