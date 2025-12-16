import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getApiKey } from '@/lib/getApiKey';
import { deductCredits } from '@/lib/credits';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
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

    // Get user's AI provider preference
    const aiProvider = (user as any).aiProvider || 'openai';

    // Check if using Gemini - verify API key
    if (aiProvider === 'gemini') {
      const geminiKey = await getApiKey('GEMINI_API_KEY');
      if (!geminiKey) {
        return NextResponse.json(
          { error: 'Gemini API key not configured. Please ask admin to add it or switch to OpenAI.' },
          { status: 500 }
        );
      }
    } else {
      // Using OpenAI - verify API key
      const openaiKey = await getApiKey('OPENAI_API_KEY');
      if (!openaiKey) {
        return NextResponse.json(
          { error: 'OpenAI API key not configured' },
          { status: 500 }
        );
      }
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const isVideo = formData.get('isVideo') === 'true';
    const isSvg = formData.get('isSvg') === 'true';
    const titleLength = parseInt(formData.get('titleLength') as string) || 150;
    const keywordCount = parseInt(formData.get('keywordCount') as string) || 45;
    const singleWordKeywords = formData.get('singleWordKeywords') === 'true';

    // Advanced settings
    const isSilhouette = formData.get('isSilhouette') === 'true';
    const customPrompt = (formData.get('customPrompt') as string) || '';
    const whiteBackground = formData.get('whiteBackground') === 'true';
    const transparentBackground = formData.get('transparentBackground') === 'true';
    const prohibitedWords = (formData.get('prohibitedWords') as string) || '';

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert image to base64
    // Convert image to base64 (only needed for OpenAI)
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');
    let mimeType = imageFile.type || 'image/jpeg';

    // For SVG, ensure correct mime type
    if (isSvg || imageFile.name.toLowerCase().endsWith('.svg')) {
      mimeType = 'image/svg+xml';
    }

    // For video, we're using the extracted frame (JPEG)
    if (isVideo) {
      mimeType = 'image/jpeg';
    }

    const categories = `1. Animals, 2. Buildings and Architecture, 3. Business, 4. Drinks, 5. The Environment, 6. States of Mind, 7. Food, 8. Graphic Resources, 9. Hobbies and Leisure, 10. Industry, 11. Landscape, 12. Lifestyle, 13. People, 14. Plants and Flowers, 15. Culture and Religion, 16. Science, 17. Social Issues, 18. Sports, 19. Technology, 20. Transport, 21. Travel`;

    let title = '';
    let keywords = '';
    let categoryId = 1;

    if (aiProvider === 'gemini') {
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
      });

      title = (geminiResult.title || '').replace(/[^\w\s]/g, '').trim();
      keywords = (geminiResult.keywords || '').replace(/[^\w\s,]/g, '').trim();
      categoryId = geminiResult.category_id || 1;
    } else {
      // Use OpenAI for metadata generation
      const apiKey = await getApiKey('OPENAI_API_KEY');
      const openai = new OpenAI({ apiKey: apiKey! });

      const keywordInstruction = singleWordKeywords
        ? `Generate exactly ${keywordCount} SINGLE-WORD keywords only.`
        : `Generate exactly ${keywordCount} relevant keywords.`;

      // Build instructions array
      const instructions: string[] = [];
      if (isSilhouette) instructions.push('This is a silhouette.');
      if (whiteBackground) instructions.push('This has a white background.');
      if (transparentBackground) instructions.push('This has a transparent background.');
      if (isVideo) instructions.push('This is a frame from a video. Generate metadata for the video content.');
      if (isSvg) instructions.push('This is an SVG vector graphic.');

      const instructionsText = instructions.length > 0 ? `\nInfo: ${instructions.join(' ')}` : '';
      const customPromptText = customPrompt ? `\nCustom: ${customPrompt}` : '';
      const prohibitedText = prohibitedWords ? `\nAvoid these words: ${prohibitedWords}` : '';

      const prompt = `Analyze this image for Adobe Stock metadata.

1. Generate a descriptive Title (aim for ${titleLength} characters). To meet this length, describe the subject, action, setting, lighting, and mood in detail. Do not be concise.
   STRICTLY FORBIDDEN: Do NOT use any special characters (like - / : ; ( ) & !) in the Title. Use ONLY letters, numbers, and spaces.
   ${transparentBackground ? 'Append "isolated on transparent background" to the title.' : ''}

2. ${keywordInstruction} Comma separated.
   STRICTLY FORBIDDEN: Do NOT use special characters in keywords.

3. Choose Category ID from: ${categories}${instructionsText}${customPromptText}${prohibitedText}

Return JSON with: "title", "keywords", "category_id" (number).`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(content);
      title = (result.title || '').replace(/[^\w\s]/g, '').trim();
      keywords = (result.keywords || '').replace(/[^\w\s,]/g, '').trim();
      categoryId = result.category_id || 1;
    }

    // Validate and trim
    if (title.length > titleLength) {
      title = title.slice(0, titleLength);
    }

    const keywordList = keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k);
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
