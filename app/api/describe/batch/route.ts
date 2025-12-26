import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, deductCredits } from '@/lib/user';
import { getApiKey } from '@/lib/getApiKey';
import { describeImageWithGemini } from '@/lib/gemini-service';

const IDEOGRAM_API_URL = 'https://api.ideogram.ai/describe';

interface BatchResult {
  filename: string;
  description: string;
  confidence: number;
  source: string;
  error?: string;
  success: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    const formData = await request.formData();
    const aiProvider = (formData.get('aiProvider') as string) || 'ideogram';
    const imageFiles: File[] = [];
    
    // Extract all image files from formData
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image_') && value instanceof File) {
        imageFiles.push(value);
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

    // Process images in parallel (up to 5 at a time to avoid overwhelming the API)
    const processInBatches = async (files: File[], batchSize: number = 5) => {
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const promises = batch.map(async (file) => {
          try {
            // Validate file
            if (!file.type.startsWith('image/')) {
              return {
                filename: file.name,
                description: '',
                confidence: 0,
                source: '',
                error: 'File must be an image',
                success: false
              };
            }
            
            if (file.size > 10 * 1024 * 1024) {
              return {
                filename: file.name,
                description: '',
                confidence: 0,
                source: '',
                error: 'File size must be less than 10MB',
                success: false
              };
            }

            let description = '';
            let confidence = 95;
            let source = aiProvider;

            if (aiProvider === 'gemini') {
              const result = await describeImageWithGemini(file);
              description = result.description;
              confidence = result.confidence;
              source = 'gemini';
            } else {
              // Use Ideogram API
              const IDEOGRAM_API_KEY = await getApiKey('IDEOGRAM_API_KEY');
              if (!IDEOGRAM_API_KEY) {
                throw new Error('Ideogram API key not configured');
              }

              const ideogramFormData = new FormData();
              ideogramFormData.append('image_file', file);

              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 15000);

              const ideogramResponse = await fetch(IDEOGRAM_API_URL, {
                method: 'POST',
                headers: {
                  'Api-Key': IDEOGRAM_API_KEY,
                },
                body: ideogramFormData,
                signal: controller.signal,
              });

              clearTimeout(timeoutId);

              if (ideogramResponse.ok) {
                const responseText = await ideogramResponse.text();
                if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
                  const result = JSON.parse(responseText);
                  description = result.descriptions?.[0]?.text || result.description || 'No description available';
                  confidence = 95;
                  source = 'ideogram';
                } else {
                  throw new Error('Invalid response format from Ideogram API');
                }
              } else {
                throw new Error(`Ideogram API error: ${ideogramResponse.status}`);
              }
            }

            // Save to database
            await prisma.imageDescription.create({
              data: {
                userId: user.id,
                filename: file.name,
                description,
                confidence,
                source,
                fileSize: file.size,
                mimeType: file.type,
              },
            });

            successfulProcessing++;

            return {
              filename: file.name,
              description,
              confidence,
              source,
              success: true
            };
          } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
            return {
              filename: file.name,
              description: '',
              confidence: 0,
              source: '',
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
      await deductCredits(user.id, successfulProcessing, 'Batch image description');

      // Get updated user credits
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { credits: true }
      });

      return NextResponse.json({
        results,
        processed: successfulProcessing,
        total: imagesToProcess.length,
        creditsUsed: successfulProcessing,
        creditsRemaining: updatedUser?.credits || 0,
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
    console.error('Batch describe error:', error);
    
    // Check if it's an authentication error
    if (error instanceof Error && (error.message === 'User not authenticated' || error.message === 'User not found')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}