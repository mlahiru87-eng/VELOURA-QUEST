import { doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { db } from './firebase';

export const REFERRAL_COMMISSION_RATE = 0.50; // 50%

export function formatUsdtAmount(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '0.00';
  // Format with up to 3/4 decimal places if sub-cent, otherwise 2 decimal places
  if (val < 0.01 || (val * 100) % 1 !== 0) {
    return val.toFixed(3).replace(/\.?0+$/, '');
  }
  return val.toFixed(2);
}

export interface ProcessReferralParams {
  taskCompletionId: string;
  referredUserId: string;
  referredUserName: string;
  taskReward: number;
}

export async function processTaskReferralCommission(params: ProcessReferralParams): Promise<{ processed: boolean; commissionAmount: number }> {
  const { taskCompletionId, referredUserId, referredUserName, taskReward } = params;

  if (!taskCompletionId || !referredUserId || taskReward <= 0) {
    return { processed: false, commissionAmount: 0 };
  }

  const commissionRef = doc(db, 'referralCommissions', taskCompletionId);

  try {
    // 1. Idempotency Check: Skip if this task completion ID has already been credited
    const existingSnap = await getDoc(commissionRef);
    if (existingSnap.exists()) {
      console.log(`[Referral Commission] Completion ${taskCompletionId} already processed.`);
      return { processed: false, commissionAmount: 0 };
    }

    // 2. Identify Referrer User ID
    const userDocRef = doc(db, 'users', referredUserId);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
      return { processed: false, commissionAmount: 0 };
    }

    const userData = userSnap.data();
    let referrerUserId = '';

    // Check direct referredBy in user profile
    if (userData.referredBy) {
      const rawRef = userData.referredBy.trim();
      if (rawRef.startsWith('VQ-')) {
        const qUser = query(collection(db, 'users'), where('referralCode', '==', rawRef));
        const uSnap = await getDocs(qUser);
        if (!uSnap.empty) {
          referrerUserId = uSnap.docs[0].id;
        }
      } else {
        referrerUserId = rawRef;
      }
    }

    // Fallback: Check referrals collection
    if (!referrerUserId) {
      const qRef1 = query(collection(db, 'referrals'), where('referredUserId', '==', referredUserId));
      const refSnap1 = await getDocs(qRef1);
      if (!refSnap1.empty) {
        referrerUserId = refSnap1.docs[0].data().referrerUserId || refSnap1.docs[0].data().referrerId;
      } else {
        const qRef2 = query(collection(db, 'referrals'), where('refereeId', '==', referredUserId));
        const refSnap2 = await getDocs(qRef2);
        if (!refSnap2.empty) {
          referrerUserId = refSnap2.docs[0].data().referrerUserId || refSnap2.docs[0].data().referrerId;
        }
      }
    }

    if (!referrerUserId || referrerUserId === referredUserId) {
      return { processed: false, commissionAmount: 0 };
    }

    // Verify referrer exists
    const referrerDocRef = doc(db, 'users', referrerUserId);
    const referrerSnap = await getDoc(referrerDocRef);
    if (!referrerSnap.exists()) {
      return { processed: false, commissionAmount: 0 };
    }

    // 3. Calculate 50% commission
    const commissionAmount = Number((taskReward * REFERRAL_COMMISSION_RATE).toFixed(4));
    if (commissionAmount <= 0) {
      return { processed: false, commissionAmount: 0 };
    }

    const displayName = referredUserName || userData.displayName || userData.email?.split('@')[0] || 'Referred Friend';
    const formattedCommission = formatUsdtAmount(commissionAmount);
    const formattedTaskReward = formatUsdtAmount(taskReward);

    // 4. Atomic Transaction for crediting and idempotency lock
    await runTransaction(db, async (tx) => {
      const txCommSnap = await tx.get(commissionRef);
      if (txCommSnap.exists()) {
        return; // Idempotent guard
      }

      const txReferrerSnap = await tx.get(referrerDocRef);
      if (!txReferrerSnap.exists()) {
        return;
      }

      const referrerData = txReferrerSnap.data();
      const currentBal = typeof referrerData.currentBalance === 'number' ? referrerData.currentBalance : 0;
      const totalEarned = typeof referrerData.totalEarned === 'number' ? referrerData.totalEarned : 0;

      const newBal = currentBal + commissionAmount;
      const newTotal = totalEarned + commissionAmount;

      // Credit referrer balance
      tx.update(referrerDocRef, {
        currentBalance: newBal,
        totalEarned: newTotal
      });

      // Record idempotency lock
      tx.set(commissionRef, {
        id: taskCompletionId,
        referrerUserId,
        referredUserId,
        taskReward,
        commissionAmount,
        commissionRate: REFERRAL_COMMISSION_RATE,
        createdAt: new Date().toISOString()
      });

      // Log transaction for referrer
      const txLogRef = doc(collection(db, 'transactions'));
      tx.set(txLogRef, {
        userId: referrerUserId,
        type: 'referral_bonus',
        amount: commissionAmount,
        taskReward: taskReward,
        commissionRate: REFERRAL_COMMISSION_RATE,
        referredUserId: referredUserId,
        referredUserName: displayName,
        taskCompletionId: taskCompletionId,
        description: `50% Referral Commission: ${displayName} completed task ($${formattedTaskReward} USDT)`,
        status: 'completed',
        createdAt: new Date().toISOString()
      });

      // Send notification to referrer
      const notifRef = doc(collection(db, 'notifications'));
      tx.set(notifRef, {
        userId: referrerUserId,
        title: 'Referral Earnings Received',
        message: `${displayName} completed a task and you earned ${formattedCommission} USDT from your 50% referral commission.`,
        type: 'reward',
        read: false,
        createdAt: new Date().toISOString()
      });
    });

    console.log(`[Referral Commission] Credited ${commissionAmount} USDT to referrer ${referrerUserId}`);
    return { processed: true, commissionAmount };
  } catch (err) {
    console.error('Error processing referral commission:', err);
    return { processed: false, commissionAmount: 0 };
  }
}
