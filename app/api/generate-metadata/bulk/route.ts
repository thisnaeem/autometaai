import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getApiKey } from '@/lib/getApiKey';
import { CreditManager } from '@/lib/credit-manager';
import { prisma } from '@/lib/prisma';
import { generateBulkMetadataCSV } from '@/lib/file-generator';
import { generateMetadataWithGemini } from '@/lib/gemini-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const images = formData.getAll('images') as File[];
    const titleLength = parseInt(formData.get('titleLength') as string) || 150;
    const keywordCount = parseInt(formData.get('keywordCount') as string) || 45;
    const singleWordKeywords = formData.get('singleWordKeywords') === 'true';

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    // Check credits
    const creditManager = CreditManager.create(session.user.id);
    const validation = await creditManager.validateCredits(images.length);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          required: images.length,
          available: validation.available,
          message: `You need ${images.length} credits but only have ${validation.available}.`,
        },
        { status: 402 }
      );
    }

    const geminiKey = await getApiKey('GEMINI_API_KEY');
    if (!geminiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const results = [];
    let successCount = 0;

    const categories = `1. Animals, 2. Buildings and Architecture, 3. Business, 4. Drinks, 5. The Environment, 6. States of Mind, 7. Food, 8. Graphic Resources, 9. Hobbies and Leisure, 10. Industry, 11. Landscape, 12. Lifestyle, 13. People, 14. Plants and Flowers, 15. Culture and Religion, 16. Science, 17. Social Issues, 18. Sports, 19. Technology, 20. Transport, 21. Travel`;

    // Process all images
    for (const imageFile of images) {
      try {
        const geminiResult = await generateMetadataWithGemini(imageFile, {
          titleLength,
          keywordCount,
          singleWordKeywords
        });

        // Clean and validate
        let title = (geminiResult.title || '').replace(/[^\w\s]/g, '').trim();
        if (title.length > titleLength) {
          title = title.slice(0, titleLength);
        }

        let keywords = (geminiResult.keywords || '').replace(/[^\w\s,]/g, '').trim();
        const keywordList = keywords
          .split(',')
          .map((k: string) => k.trim().toLowerCase())
          .filter((k: string) => k);
        if (keywordList.length > keywordCount) {
          keywords = keywordList.slice(0, keywordCount).join(',');
        } else {
          keywords = keywordList.join(',');
        }

        const categoryId = geminiResult.category_id || 1;
        const categoryName = categories.split(',')[categoryId - 1]?.trim() || 'General';
        const categoryString = `${categoryId}. ${categoryName}`;

        results.push({
          filename: imageFile.name,
          title,
          keywords,
          category: categoryString,
          success: true,
        });

        successCount++;
      } catch (error) {
        results.push({
          filename: imageFile.name,
          success: false,
          error: error instanceof Error ? error.message : 'Processing failed',
        });
      }
    }


    // Deduct credits only for successful processing
    if (successCount > 0) {
      const creditResult = await creditManager.deductCredits(
        successCount,
        `Metadata generated for ${successCount} images`
      );

      if (!creditResult.success) {
        return NextResponse.json(
          { error: creditResult.error || 'Failed to deduct credits' },
          { status: 402 }
        );
      }

      // Generate ONE batch CSV file for all successful results
      const successfulResults = results.filter((r) => r.success);
      const batchFileUrl = await generateBulkMetadataCSV(
        successfulResults.map((r) => ({
          filename: r.filename,
          title: r.title || '',
          keywords: r.keywords || '',
          category: r.category || '',
        })),
        new Date()
      );

      // Save ONLY batch operation (no individual records)
      await prisma.batchOperation.create({
        data: {
          userId: session.user.id,
          type: 'metadata',
          itemCount: successCount,
          fileUrl: batchFileUrl || '',
        },
      });

      return NextResponse.json({
        results,
        successCount,
        totalCount: images.length,
        remainingCredits: creditResult.newBalance,
        batchFileUrl: batchFileUrl || null,
      });
    }

    return NextResponse.json({
      results,
      successCount: 0,
      totalCount: images.length,
    });
  } catch (error: unknown) {
    console.error('Bulk metadata generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
