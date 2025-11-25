
import { db } from "../db";
import { transactions } from "@shared/schema";
import { eq, and, gte, sum } from "drizzle-orm";

export interface ComplianceCheckResult {
  passed: boolean;
  reason?: string;
  riskScore: number; // 0-100
  requiresManualReview: boolean;
}

export class ComplianceService {
  // Mock Sanction List (e.g., BNM, OFAC)
  private sanctionList = new Set([
    'TR7654321', // Example blacklisted wallet
    '0x1234567890abcdef1234567890abcdef12345678', // Example blacklisted ETH address
  ]);

  async checkTransaction(userId: string, amount: number, destination?: string): Promise<ComplianceCheckResult> {
    const result: ComplianceCheckResult = {
      passed: true,
      riskScore: 0,
      requiresManualReview: false
    };

    // 1. Sanction List Check
    if (destination && this.sanctionList.has(destination)) {
      result.passed = false;
      result.reason = 'Destination address is on a sanction list (BNM/OFAC).';
      result.riskScore = 100;
      return result;
    }

    // 2. Velocity Check (24h Volume)
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

        // Tier 1 Limit: $50,000 / day
        if (dailyTotal > 50000) {
            result.requiresManualReview = true;
            result.riskScore += 40;
            result.reason = result.reason ? `${result.reason}; Daily limit exceeded` : 'Daily limit exceeded';
        }

        // 3. High Frequency Check (Rapid small withdrawals)
        // Check for > 5 withdrawals in 1 hour
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

    // 4. Large Amount Check (Single Transaction)
    if (amount > 10000) {
        result.requiresManualReview = true;
        result.riskScore += 20;
    }

    return result;
  }

  async checkAML(userId: string, userDetails: any): Promise<boolean> {
      // Mock AML check against external database
      // In reality, this would call Sumsub or Jumio
      return userDetails.kycStatus === 'Verified';
  }
}

export const complianceService = new ComplianceService();
