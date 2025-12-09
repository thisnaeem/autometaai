import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getApiKey } from '@/lib/getApiKey';
import { deductCredits } from '@/lib/credits';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
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
          message: 'You need at least 1 credit to remove background from an image.'
        },
        { status: 402 }
      );
    }

    // Get the API key from database or .env
    const apiKey = await getApiKey('PHOTOROOM_API_KEY');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Photoroom API key not configured' },
        { status: 500 }
      );
    }

    // Get the form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, and WEBP are supported.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Prepare form data for Photoroom API
    const photoroomFormData = new FormData();
    photoroomFormData.append('image_file', imageFile);

    // Call Photoroom API
    const response = await fetch('https://sdk.photoroom.com/v1/segment', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
      },
      body: photoroomFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Photoroom API error:', errorText);
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key. Please check your Photoroom API configuration.' },
          { status: 500 }
        );
      }
      
      if (response.status === 402) {
        return NextResponse.json(
          { error: 'Photoroom API quota exceeded. Please upgrade your plan.' },
          { status: 402 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to process image. Please try again.' },
        { status: response.status }
      );
    }

    // Get the processed image
    const imageBuffer = await response.arrayBuffer();

    // Deduct 1 credit for successful processing
    const creditResult = await deductCredits(user.id, 1);
    
    if (!creditResult.success) {
      return NextResponse.json(
        { error: creditResult.error || 'Failed to deduct credits' },
        { status: 402 }
      );
    }

    // Return the processed image with updated credits in header
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="image-no-bg.png"',
        'X-Credits-Remaining': creditResult.credits.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Background removal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
