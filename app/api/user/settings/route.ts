import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

// GET /api/user/settings - Get user settings
export async function GET() {
    try {
        const session = await getSession();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Use type assertion since aiProvider was just added to schema
        return NextResponse.json({ aiProvider: (user as { aiProvider?: string }).aiProvider || 'openai' });
    } catch (error) {
        console.error('Error fetching user settings:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/user/settings - Update user settings
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { aiProvider } = body;

        // Validate aiProvider
        if (aiProvider && !['openai', 'gemini'].includes(aiProvider)) {
            return NextResponse.json({ error: 'Invalid AI provider' }, { status: 400 });
        }

        // Use raw query since aiProvider was just added to schema
        await prisma.$executeRaw`UPDATE users SET "aiProvider" = ${aiProvider || 'openai'} WHERE id = ${session.user.id}`;

        return NextResponse.json({ success: true, aiProvider: aiProvider || 'openai' });
    } catch (error) {
        console.error('Error updating user settings:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
