import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { generateBulkMetadataCSV } from '@/lib/file-generator';

// This endpoint saves metadata results to batch history without re-processing
// Similar to how runway-prompt/bulk works
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

        // Generate batch CSV file from already-processed results
        const batchFileUrl = await generateBulkMetadataCSV(
            results.map((r: { filename: string; title: string; keywords: string; category: string }) => ({
                filename: r.filename,
                title: r.title || '',
                keywords: r.keywords || '',
                category: r.category || '',
            })),
            new Date()
        );

        // Save batch operation to history (only this, no individual records)
        await prisma.batchOperation.create({
            data: {
                userId: session.user.id,
                type: 'metadata',
                itemCount: results.length,
                fileUrl: batchFileUrl,
            },
        });

        return NextResponse.json({
            success: true,
            batchFileUrl,
        });
    } catch (error: unknown) {
        console.error('Batch metadata save error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
