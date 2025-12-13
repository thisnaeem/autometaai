import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getApiKey } from '@/lib/getApiKey';
import { BgCreditManager } from '@/lib/bg-credit-manager';
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
      select: { id: true, bgRemovalCredits: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    const bgCreditManager = BgCreditManager.create(session.user.id);
    const validation = await bgCreditManager.validateCredits(files.length);

    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Insufficient BG removal credits',
          required: files.length,
          available: validation.available,
          message: `You need ${files.length} BG removal credits but only have ${validation.available}.`
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
      const creditResult = await bgCreditManager.deductCredits(
        successCount, 
        `Bulk background removal: ${successCount} images`
      );
      
      if (!creditResult.success) {
        return NextResponse.json(
          { error: creditResult.error || 'Failed to deduct BG removal credits' },
          { status: 402 }
        );
      }

      return NextResponse.json({
        results,
        successCount,
        totalCount: files.length,
        remainingBgCredits: creditResult.newBalance
      });
    }

    return NextResponse.json({
      results,
      successCount: 0,
      totalCount: files.length,
      remainingBgCredits: user.bgRemovalCredits
    });

  } catch (error: unknown) {
    console.error('Bulk background removal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
