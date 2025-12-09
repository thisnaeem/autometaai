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
          message: 'You need at least 1 credit to generate runway prompts.'
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
    const mode = (formData.get('mode') as string) || 'runway';

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert image to base64
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    const openai = new OpenAI({ apiKey });

    const prompt = `You see a still image. Your task is to describe motion at three intensities: low, medium, and high.

ABSOLUTE RULES:
- Describe ONLY motion of things that are visible or obviously implied in the image.
- Do NOT invent new locations, vehicles, sunsets, rice fields, palm trees, etc., if they are not clearly present.
- Do NOT mention any camera movement.
- Do NOT write "a smooth dolly camera".
- Do NOT write "cinematic live-action".
- Do NOT wrap anything in parentheses.

For each motion level, write ONE short clause (not a full sentence) that starts directly with the scene or subject, for example:
- "the subject barely shifts and the surrounding lights flicker softly"
- "the truck rolls steadily forward and reflections slide along the floor"
- "the cart races ahead as gifts tumble and lights flare intensely"

Focus on:
- how the main subject moves (or stays almost still),
- how the environment reacts (lights, reflections, particles, smoke, dust, trees, etc.),
- using adjectives/adverbs that match the intensity:

LOW MOTION:
- Very subtle, calm movement.
- Use words like: "barely", "slightly", "gently", "softly", "subtle".

MEDIUM MOTION:
- Clear, natural motion.
- No "barely" or "violently".
- Use moderate words like "steadily", "slowly", "gradually".

HIGH MOTION:
- Strong, energetic motion.
- Use words like "rapidly", "quickly", "violently", "intensely".

OUTPUT FORMAT (JSON ONLY):
{
  "low": "<low-motion clause>",
  "medium": "<medium-motion clause>",
  "high": "<high-motion clause>"
}`;

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
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(content);

    // Build final Runway prompts with camera movements
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

    // Deduct 1 credit for successful processing
    const creditResult = await deductCredits(user.id, 1);
    
    if (!creditResult.success) {
      return NextResponse.json(
        { error: creditResult.error || 'Failed to deduct credits' },
        { status: 402 }
      );
    }

    const lowPrompt = buildPrompt('low', result.low || '');
    const mediumPrompt = buildPrompt('medium', result.medium || '');
    const highPrompt = buildPrompt('high', result.high || '');

    // Save to history
    try {
      await prisma.runwayPrompt.create({
        data: {
          userId: user.id,
          filename: imageFile.name,
          mode: mode,
          lowMotion: mode === 'runway' ? lowPrompt : null,
          mediumMotion: mode === 'runway' ? mediumPrompt : null,
          highMotion: mode === 'runway' ? highPrompt : null,
          description: mode === 'describe' ? content : null,
          fileSize: imageFile.size,
          mimeType: imageFile.type,
        },
      });
    } catch (historyError) {
      console.error('Failed to save runway prompt history:', historyError);
      // Don't fail the request if history save fails
    }

    return NextResponse.json({
      low: lowPrompt,
      medium: mediumPrompt,
      high: highPrompt,
      creditsRemaining: creditResult.credits,
    });
  } catch (error: unknown) {
    console.error('Runway prompt error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
