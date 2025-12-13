import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, deductCredits } from '@/lib/user';
import { getSetting } from '@/lib/settings';
import { generateBulkDescriptionsFile } from '@/lib/file-generator';

const IDEOGRAM_API_URL = 'https://api.ideogram.ai/describe';

interface ProcessResult {
  success: boolean;
  filename: string;
  description?: string;
  confidence?: number;
  source?: string;
  error?: string;
}

async function processImage(file: File): Promise<ProcessResult> {
  try {
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        filename: file.name,
        error: 'File must be an image',
      };
    }

    if (file.size > 10 * 1024 * 1024) {
      return {
        success: false,
        filename: file.name,
        error: 'File size must be less than 10MB',
      };
    }

    let description = '';
    let confidence = 95;
    let source = 'ideogram';

    const IDEOGRAM_API_KEY = await getSetting('IDEOGRAM_API_KEY', 'IDEOGRAM_API_KEY');

    if (IDEOGRAM_API_KEY) {
      try {
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

          if (
            responseText.trim().startsWith('{') ||
            responseText.trim().startsWith('[')
          ) {
            const result = JSON.parse(responseText);
            description =
              result.descriptions?.[0]?.text ||
              result.description ||
              'No description available';
            confidence = 95;
            source = 'ideogram';
          } else {
            throw new Error('Ideogram API returned invalid response format');
          }
        } else {
          throw new Error('Ideogram API request failed');
        }
      } catch (apiError) {
        return {
          success: false,
          filename: file.name,
          error: `Failed to describe image: ${
            apiError instanceof Error ? apiError.message : 'Unknown API error'
          }`,
        };
      }
    } else {
      return {
        success: false,
        filename: file.name,
        error: 'Image description service is not available - API key not configured',
      };
    }

    return {
      success: true,
      filename: file.name,
      description,
      confidence,
      source,
    };
  } catch (error) {
    console.error(`Error processing ${file.name}:`, error);
    return {
      success: false,
      filename: file.name,
      error: 'Processing failed',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const images = formData.getAll('images') as File[];

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    const user = await getCurrentUser();
    const requiredCredits = images.length;

    if (user.credits < requiredCredits) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          required: requiredCredits,
          available: user.credits,
          message: `You need ${requiredCredits} credits but only have ${user.credits}.`,
        },
        { status: 402 }
      );
    }

    // Process all images
    const results: ProcessResult[] = [];
    let successCount = 0;

    for (const file of images) {
      const result = await processImage(file);
      results.push(result);

      if (result.success) {
        successCount++;
      }
    }

    // Deduct credits only for successful processing
    if (successCount > 0) {
      await deductCredits(user.id, successCount, 'Bulk image description');

      // Generate ONE batch TXT file for all successful results
      const successfulResults = results.filter((r) => r.success);
      const batchFileUrl = await generateBulkDescriptionsFile(
        successfulResults.map((r) => ({
          filename: r.filename,
          description: r.description || '',
          confidence: r.confidence || 95,
          source: r.source || 'ideogram',
        })),
        new Date()
      );

      // Save ONLY batch operation (no individual records)
      await prisma.batchOperation.create({
        data: {
          userId: user.id,
          type: 'describe',
          itemCount: successCount,
          fileUrl: batchFileUrl,
        },
      });

      // Get updated credits
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { credits: true },
      });

      // Return results in the format expected by the frontend
      return NextResponse.json({
        results: results.map((r, index) => ({
          ...r,
          index,
          remainingCredits: updatedUser?.credits || 0,
        })),
        summary: {
          total: images.length,
          successful: successCount,
          failed: images.length - successCount,
          creditsUsed: successCount,
          remainingCredits: updatedUser?.credits || 0,
        },
        batchFileUrl,
      });
    }

    return NextResponse.json({
      results,
      successCount: 0,
      totalCount: images.length,
    });
  } catch (error) {
    console.error('Bulk describe error:', error);

    if (
      error instanceof Error &&
      (error.message === 'User not authenticated' || error.message === 'User not found')
    ) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to process images' }, { status: 500 });
  }
}
