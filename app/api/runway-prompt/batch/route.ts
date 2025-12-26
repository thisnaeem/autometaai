import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getApiKey } from '@/lib/getApiKey';
import { deductCredits } from '@/lib/credits';
import { prisma } from '@/lib/prisma';

import { generateRunwayPromptsWithGemini } from '@/lib/gemini-service';

interface BatchResult {
  filename: string;
  low: string;
  medium: string;
  high: string;
  error?: string;
  success: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Use Gemini for runway prompts
    const geminiKey = await getApiKey('GEMINI_API_KEY');
    if (!geminiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please ask admin to add it.' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const imageFiles: { file: File; originalName: string }[] = [];

    // Extract all image files and their original names from formData
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image_') && value instanceof File) {
        const index = key.replace('image_', '');
        const originalName = (formData.get(`originalName_${index}`) as string) || value.name;
        imageFiles.push({ file: value, originalName });
      }
    }

    if (imageFiles.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    // Limit to 10 images per batch
    const batchSize = Math.min(imageFiles.length, 10);
    const imagesToProcess = imageFiles.slice(0, batchSize);

    // Check if user has enough credits
    if (user.credits < batchSize) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          required: batchSize,
          available: user.credits,
          message: `You need ${batchSize} credits to process ${batchSize} images.`
        },
        { status: 402 }
      );
    }

    const results: BatchResult[] = [];
    let successfulProcessing = 0;

    // Build prompt helper function
    const buildPrompt = (motion: string, clause: string) => {
      if (!clause) return '';

      // Ensure clause starts naturally
      if (!/^(the|a|an)\b/i.test(clause)) {
        clause = 'the subject ' + clause;
      }

      // Choose camera style based on motion intensity
      let prefix = '';
      if (motion === 'low') {
        prefix = 'a smooth dolly camera moves slowly toward ';
      } else if (motion === 'high') {
        prefix = 'a dynamic handheld camera moves quickly toward ';
      } else {
        prefix = 'a steady tracking camera moves forward toward ';
      }

      return (prefix + clause + ' cinematic live-action').replace(/\s+/g, ' ').trim();
    };

    // Process images in parallel (up to 5 at a time to avoid overwhelming the API)
    const processInBatches = async (files: { file: File; originalName: string }[], batchSize: number = 5) => {
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const promises = batch.map(async ({ file, originalName }) => {
          try {
            // Check if file is SVG and handle appropriately
            if (originalName.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml') {
              // For now, skip SVG files or handle them differently
              return {
                filename: originalName,
                low: '',
                medium: '',
                high: '',
                error: 'SVG files are not currently supported for runway prompts. Please convert to PNG or JPG.',
                success: false
              };
            }

            const geminiResult = await generateRunwayPromptsWithGemini(file);

            const lowPrompt = buildPrompt('low', geminiResult.low || '');
            const mediumPrompt = buildPrompt('medium', geminiResult.medium || '');
            const highPrompt = buildPrompt('high', geminiResult.high || '');

            successfulProcessing++;

            return {
              filename: originalName,
              low: lowPrompt,
              medium: mediumPrompt,
              high: highPrompt,
              success: true
            };
          } catch (error) {
            console.error(`Error processing ${originalName}:`, error);
            return {
              filename: originalName,
              low: '',
              medium: '',
              high: '',
              error: error instanceof Error ? error.message : 'Failed to process image',
              success: false
            };
          }
        });

        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
      }
    };

    // Process all images
    await processInBatches(imagesToProcess);

    // Deduct credits only for successfully processed images
    if (successfulProcessing > 0) {
      const creditResult = await deductCredits(user.id, successfulProcessing);

      if (!creditResult.success) {
        return NextResponse.json(
          { error: creditResult.error || 'Failed to deduct credits' },
          { status: 402 }
        );
      }

      // Save successful results to history
      try {
        const successfulResults = results.filter(r => r.success);
        if (successfulResults.length > 0) {
          await prisma.runwayPrompt.createMany({
            data: successfulResults.map(result => ({
              userId: user.id,
              filename: result.filename,
              mode: 'runway',
              lowMotion: result.low,
              mediumMotion: result.medium,
              highMotion: result.high,
              description: null,
              fileSize: imagesToProcess.find(f => f.originalName === result.filename)?.file.size || 0,
              mimeType: imagesToProcess.find(f => f.originalName === result.filename)?.file.type || 'image/jpeg',
            })),
          });
        }
      } catch (historyError) {
        console.error('Failed to save batch runway prompt history:', historyError);
        // Don't fail the request if history save fails
      }

      return NextResponse.json({
        results,
        processed: successfulProcessing,
        total: imagesToProcess.length,
        creditsUsed: successfulProcessing,
        creditsRemaining: creditResult.credits,
      });
    } else {
      return NextResponse.json({
        results,
        processed: 0,
        total: imagesToProcess.length,
        creditsUsed: 0,
        creditsRemaining: user.credits,
        error: 'No images were successfully processed'
      });
    }

  } catch (error: unknown) {
    console.error('Batch runway prompt error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}