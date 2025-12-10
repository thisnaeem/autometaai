import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getApiKey } from '@/lib/getApiKey';
import { deductCredits } from '@/lib/credits';
import { prisma } from '@/lib/prisma';

interface ProcessResult {
  success: boolean;
  filename: string;
  imageData?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, credits: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    if (user.credits < files.length) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits',
          required: files.length,
          available: user.credits,
          message: `You need ${files.length} credits but only have ${user.credits}.`
        },
        { status: 402 }
      );
    }

    const apiKey = await getApiKey('PHOTOROOM_API_KEY');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Photoroom API key not configured' },
        { status: 500 }
      );
    }

    const results: ProcessResult[] = [];
    let successCount = 0;

    for (const file of files) {
      try {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          results.push({
            success: false,
            filename: file.name,
            error: 'Invalid file type'
          });
          continue;
        }

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          results.push({
            success: false,
            filename: file.name,
            error: 'File too large (max 10MB)'
          });
          continue;
        }

        const photoroomFormData = new FormData();
        photoroomFormData.append('image_file', file);

        const response = await fetch('https://sdk.photoroom.com/v1/segment', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
          },
          body: photoroomFormData,
        });

        if (!response.ok) {
          results.push({
            success: false,
            filename: file.name,
            error: `API error: ${response.status}`
          });
          continue;
        }

        const imageBuffer = await response.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');

        results.push({
          success: true,
          filename: file.name,
          imageData: base64Image
        });

        successCount++;
      } catch (error) {
        results.push({
          success: false,
          filename: file.name,
          error: error instanceof Error ? error.message : 'Processing failed'
        });
      }
    }

    if (successCount > 0) {
      const creditResult = await deductCredits(user.id, successCount);
      
      if (!creditResult.success) {
        return NextResponse.json(
          { error: creditResult.error || 'Failed to deduct credits' },
          { status: 402 }
        );
      }

      return NextResponse.json({
        results,
        successCount,
        totalCount: files.length,
        remainingCredits: creditResult.credits
      });
    }

    return NextResponse.json({
      results,
      successCount: 0,
      totalCount: files.length,
      remainingCredits: user.credits
    });

  } catch (error: unknown) {
    console.error('Bulk background removal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
