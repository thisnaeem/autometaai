import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getApiKey } from '@/lib/getApiKey';
import { deductCredits } from '@/lib/credits';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user and check credits
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, credits: true }
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

    const apiKey = await getApiKey('OPENAI_API_KEY');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
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
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    const openai = new OpenAI({ apiKey });

    const categories = `1. Animals, 2. Buildings and Architecture, 3. Business, 4. Drinks, 5. The Environment, 6. States of Mind, 7. Food, 8. Graphic Resources, 9. Hobbies and Leisure, 10. Industry, 11. Landscape, 12. Lifestyle, 13. People, 14. Plants and Flowers, 15. Culture and Religion, 16. Science, 17. Social Issues, 18. Sports, 19. Technology, 20. Transport, 21. Travel`;

    const keywordInstruction = singleWordKeywords
      ? `Generate exactly ${keywordCount} SINGLE-WORD keywords only.`
      : `Generate exactly ${keywordCount} relevant keywords.`;

    // Build instructions array
    const instructions: string[] = [];
    if (isSilhouette) instructions.push('This is a silhouette.');
    if (whiteBackground) instructions.push('This has a white background.');
    if (transparentBackground) instructions.push('This has a transparent background.');
    
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

Example 1:
Image: A happy young child with curly blonde hair sits on grass, surrounded by two playful baby goats. Sunlight filters through the trees.
Output: {
  "title": "Joyful child with adorable baby goats on a sunny farm",
  "keywords": "child,kid,girl,blonde hair,curly hair,smiling,happy,joyful,goat,baby goat,kid goat,farm,animal,pet,outdoors,grass,sunny,daylight,summer,countryside,rural,nature,cute,adorable,young,childhood,innocence,playful,livestock,farm animal",
  "category_id": 1
}

Example 2:
Image: A man in a suit and glasses smiles while holding a tablet, standing in a dealership filled with tractors.
Output: {
  "title": "Smiling businessman holding tablet in agricultural machinery dealership",
  "keywords": "businessman,tablet,dealership,agriculture,machinery,tractors,farming,equipment,sales,retail,professional,technology,modern,industry,rural,outdoors,transportation,vehicles,heavy equipment,farm equipment,agricultural vehicles,business owner,manager,employee,customer service,showroom,indoor,man,glasses,smiling,confident",
  "category_id": 3
}

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

    // Clean and validate
    let title = (result.title || '').replace(/[^\w\s]/g, '').trim();
    if (title.length > titleLength) {
      title = title.slice(0, titleLength);
    }

    let keywords = (result.keywords || '').replace(/[^\w\s,]/g, '').trim();
    const keywordList = keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k);
    if (keywordList.length > keywordCount) {
      keywords = keywordList.slice(0, keywordCount).join(',');
    } else {
      keywords = keywordList.join(',');
    }

    const categoryId = result.category_id || 1;
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

    // Save to history
    try {
      await prisma.metadataGeneration.create({
        data: {
          userId: user.id,
          filename: imageFile.name,
          title,
          keywords,
          category: categoryString,
          fileSize: imageFile.size,
          mimeType: imageFile.type,
        },
      });
    } catch (historyError) {
      console.error('Failed to save metadata generation history:', historyError);
      // Don't fail the request if history save fails
    }

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
