import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { requestId, action, adminNotes } = body;

    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'Request ID and action are required' },
        { status: 400 }
      );
    }

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVED or REJECTED' },
        { status: 400 }
      );
    }

    // Find the payment request
    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id: requestId },
      include: {
        user: true
      }
    });

    if (!paymentRequest) {
      return NextResponse.json(
        { error: 'Payment request not found' },
        { status: 404 }
      );
    }

    if (paymentRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Payment request has already been processed' },
        { status: 400 }
      );
    }

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update the payment request
      const updatedRequest = await tx.paymentRequest.update({
        where: { id: requestId },
        data: {
          status: action,
          adminNotes: adminNotes || null,
          processedBy: session.user.id,
          processedAt: new Date()
        }
      });

      // If approved, add credits to user and create credit transaction
      if (action === 'APPROVED') {
        // Determine which credit field to update based on creditType
        const creditField = paymentRequest.creditType === 'BG_REMOVAL' 
          ? 'bgRemovalCredits' 
          : 'credits';

        // Update user credits
        await tx.user.update({
          where: { id: paymentRequest.userId },
          data: {
            [creditField]: {
              increment: paymentRequest.creditsRequested
            }
          }
        });

        // Create credit transaction record
        const creditTypeLabel = paymentRequest.creditType === 'BG_REMOVAL' 
          ? 'BG Removal Credits' 
          : 'General Credits';

        await tx.creditTransaction.create({
          data: {
            userId: paymentRequest.userId,
            amount: paymentRequest.creditsRequested,
            type: 'PURCHASE',
            description: `${creditTypeLabel} purchased via ${paymentRequest.paymentMethod} - Payment Request #${requestId.slice(-8)}`
          }
        });
      }

      return updatedRequest;
    });

    return NextResponse.json({
      message: `Payment request ${action.toLowerCase()} successfully`,
      paymentRequest: result
    });

  } catch (error) {
    console.error('Error processing payment request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}