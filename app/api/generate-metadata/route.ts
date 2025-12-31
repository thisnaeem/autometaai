import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getApiKey } from '@/lib/getApiKey';
import { deductCredits } from '@/lib/credits';
import { prisma } from '@/lib/prisma';

import { generateMetadataWithGemini } from '@/lib/gemini-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with credits and AI provider preference
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.credits < 1) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          required: 1,
          available: user.credits,
          message: 'You need at least 1 credit to generate metadata.'
        },
        { status: 402 }
      );
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
    const imageFile = formData.get('image') as File;
    const isVideo = formData.get('isVideo') === 'true';
    const isSvg = formData.get('isSvg') === 'true';
    const titleLength = parseInt(formData.get('titleLength') as string) || 150;
    const keywordCount = parseInt(formData.get('keywordCount') as string) || 45;
    const singleWordKeywords = formData.get('singleWordKeywords') === 'true';

    // Validate file
    if (!imageFile) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file size - since we're now sending compressed frames for videos, 
    // the file size should be much smaller, but keep a reasonable limit
    const maxSize = 10 * 1024 * 1024; // 10MB should be more than enough for compressed frames
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is 10MB. Your file is ${(imageFile.size / 1024 / 1024).toFixed(1)}MB.`
        },
        { status: 400 }
      );
    }

    // Advanced settings
    const isSilhouette = formData.get('isSilhouette') === 'true';
    const customPrompt = (formData.get('customPrompt') as string) || '';
    const whiteBackground = formData.get('whiteBackground') === 'true';
    const transparentBackground = formData.get('transparentBackground') === 'true';
    const prohibitedWords = (formData.get('prohibitedWords') as string) || '';

    const categories = `1. Animals, 2. Buildings and Architecture, 3. Business, 4. Drinks, 5. The Environment, 6. States of Mind, 7. Food, 8. Graphic Resources, 9. Hobbies and Leisure, 10. Industry, 11. Landscape, 12. Lifestyle, 13. People, 14. Plants and Flowers, 15. Culture and Religion, 16. Science, 17. Social Issues, 18. Sports, 19. Technology, 20. Transport, 21. Travel`;

    // Use Gemini for metadata generation
    const geminiResult = await generateMetadataWithGemini(imageFile, {
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

    const categoryName = categories.split(',')[categoryId - 1]?.trim() || 'General';

    // Deduct 1 credit for successful processing
    const creditResult = await deductCredits(user.id, 1);

    if (!creditResult.success) {
      return NextResponse.json(
        { error: creditResult.error || 'Failed to deduct credits' },
        { status: 402 }
      );
    }

    const categoryString = `${categoryId}. ${categoryName}`;

    // Note: History is saved via batch operations only (like Runway Prompt)
    // Individual records are not saved to avoid duplicates in history

    return NextResponse.json({
      title,
      keywords,
      category: categoryString,
      creditsRemaining: creditResult.credits,
    });
  } catch (error: unknown) {
    console.error('Metadata generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
