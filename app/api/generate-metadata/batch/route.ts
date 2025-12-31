import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getApiKey } from '@/lib/getApiKey';
import { deductCredits } from '@/lib/credits';
import { prisma } from '@/lib/prisma';

import { generateMetadataWithGemini } from '@/lib/gemini-service';

interface BatchResult {
  filename: string;
  title: string;
  keywords: string;
  category: string;
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

    // Use Gemini for metadata generation
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

    // Credit cost per image
    const CREDITS_PER_IMAGE = 3;
    const requiredCredits = batchSize * CREDITS_PER_IMAGE;

    // Check if user has enough credits
    if (user.credits < requiredCredits) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          required: requiredCredits,
          available: user.credits,
          message: `You need ${requiredCredits} credits (${CREDITS_PER_IMAGE} per image × ${batchSize} images).`
        },
        { status: 402 }
      );
    }

    // Get settings from formData
    const titleLength = parseInt(formData.get('titleLength') as string) || 150;
    const keywordCount = parseInt(formData.get('keywordCount') as string) || 45;
    const singleWordKeywords = formData.get('singleWordKeywords') === 'true';
    const isSilhouette = formData.get('isSilhouette') === 'true';
    const customPrompt = (formData.get('customPrompt') as string) || '';
    const whiteBackground = formData.get('whiteBackground') === 'true';
    const transparentBackground = formData.get('transparentBackground') === 'true';
    const prohibitedWords = (formData.get('prohibitedWords') as string) || '';

    const results: BatchResult[] = [];
    let successfulProcessing = 0;

    const categories = `1. Animals, 2. Buildings and Architecture, 3. Business, 4. Drinks, 5. The Environment, 6. States of Mind, 7. Food, 8. Graphic Resources, 9. Hobbies and Leisure, 10. Industry, 11. Landscape, 12. Lifestyle, 13. People, 14. Plants and Flowers, 15. Culture and Religion, 16. Science, 17. Social Issues, 18. Sports, 19. Technology, 20. Transport, 21. Travel`;

    // Process images in parallel (up to 5 at a time to avoid overwhelming the API)
    const processInBatches = async (files: { file: File; originalName: string }[], batchSize: number = 5) => {
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const promises = batch.map(async ({ file, originalName }) => {
          try {
            // Validate file
            if (!file) {
              return {
                filename: originalName || 'Unknown',
                title: '',
                keywords: '',
                category: '',
                error: 'No file provided',
                success: false
              };
            }

            // Check file size
            const maxSize = 150 * 1024 * 1024; // 150MB
            if (file.size > maxSize) {
              return {
                filename: originalName,
                title: '',
                keywords: '',
                category: '',
                error: `File too large. Maximum size is 150MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`,
                success: false
              };
            }

            // Detect file types
            const isVideo = file.type.startsWith('video/') || !!originalName.match(/\\.(mp4|mov|avi|webm)$/i);
            const isSvg = originalName.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml';

            // Use Gemini for metadata generation
            const geminiResult = await generateMetadataWithGemini(file, {
              titleLength,
              keywordCount,
              singleWordKeywords,
              isSilhouette,
              customPrompt,
              whiteBackground,
              transparentBackground,
              prohibitedWords,
              isVideo,
              isSvg,
            });

            let title = (geminiResult.title || '').replace(/[^\w\s]/g, '').trim();
            let keywords = (geminiResult.keywords || '').replace(/[^\w\s,]/g, '').trim();
            const categoryId = geminiResult.category_id || 1;

            // Validate and trim
            if (title.length > titleLength) {
              title = title.slice(0, titleLength);
            }

            const keywordList = keywords.split(',').map((k: string) => k.trim().toLowerCase()).filter((k: string) => k);
            if (keywordList.length > keywordCount) {
              keywords = keywordList.slice(0, keywordCount).join(',');
            } else {
              keywords = keywordList.join(',');
            }

            const categoryName = categories.split(',')[categoryId - 1]?.trim() || 'General'; // eslint-disable-line @typescript-eslint/no-unused-vars
            const categoryString = `${categoryId}`; // Just the category number for CSV

            successfulProcessing++;

            return {
              filename: originalName,
              title,
              keywords,
              category: categoryString,
              success: true
            };
          } catch (error) {
            console.error(`Error processing ${originalName}:`, error);
            return {
              filename: originalName,
              title: '',
              keywords: '',
              category: '',
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
      const creditsToDeduct = successfulProcessing * CREDITS_PER_IMAGE;
      const creditResult = await deductCredits(user.id, creditsToDeduct);

      if (!creditResult.success) {
        return NextResponse.json(
          { error: creditResult.error || 'Failed to deduct credits' },
          { status: 402 }
        );
      }

      return NextResponse.json({
        results,
        processed: successfulProcessing,
        total: imagesToProcess.length,
        creditsUsed: creditsToDeduct,
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
    console.error('Batch metadata generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}