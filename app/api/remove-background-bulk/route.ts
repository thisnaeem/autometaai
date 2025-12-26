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

    // Process images in parallel batches of 3 to avoid overwhelming the API but stay responsive
    const BATCH_SIZE = 3;

    const processImage = async (file: File): Promise<ProcessResult> => {
      try {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          return {
            success: false,
            filename: file.name,
            error: 'Invalid file type'
          };
        }

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          return {
            success: false,
            filename: file.name,
            error: 'File too large (max 10MB)'
          };
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
          // Handle specific Photoroom API errors
          let errorMessage = `API error: ${response.status}`;

          if (response.status === 401 || response.status === 403) {
            errorMessage = 'Photoroom API key is invalid or expired. Please contact admin.';
          } else if (response.status === 429) {
            errorMessage = 'Rate limit exceeded. Please try again later.';
          } else if (response.status === 402) {
            errorMessage = 'Photoroom API credits exhausted. Please contact admin.';
          }

          // Try to get more details from response
          try {
            const errorData = await response.text();
            console.error(`Photoroom API error for ${file.name}:`, errorData);
          } catch {
            // Ignore if we can't read the error response
          }

          return {
            success: false,
            filename: file.name,
            error: errorMessage
          };
        }

        const imageBuffer = await response.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');

        return {
          success: true,
          filename: file.name,
          imageData: base64Image
        };
      } catch (error) {
        console.error(`Processing error for ${file.name}:`, error);
        return {
          success: false,
          filename: file.name,
          error: error instanceof Error ? error.message : 'Processing failed'
        };
      }
    };

    // Process files in batches
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(processImage));

      results.push(...batchResults);
      successCount += batchResults.filter(r => r.success).length;
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
