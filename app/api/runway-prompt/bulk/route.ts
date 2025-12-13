import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { generateBulkRunwayPromptsFile } from '@/lib/file-generator';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { results } = body;

    if (!results || results.length === 0) {
      return NextResponse.json({ error: 'No results provided' }, { status: 400 });
    }

    // Generate batch file from already-processed results
    const batchFileUrl = await generateBulkRunwayPromptsFile(
      results.map((r: { filename: string; low: string; medium: string; high: string }) => ({
        filename: r.filename,
        lowMotion: r.low,
        mediumMotion: r.medium,
        highMotion: r.high,
      })),
      new Date()
    );

    // Save batch operation to history
    await prisma.batchOperation.create({
      data: {
        userId: session.user.id,
        type: 'runway',
        itemCount: results.length,
        fileUrl: batchFileUrl,
      },
    });

    return NextResponse.json({
      success: true,
      batchFileUrl,
    });
  } catch (error: unknown) {
    console.error('Bulk runway prompt error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
