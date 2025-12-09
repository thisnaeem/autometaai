import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/user';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'all'; // all, describe, runway, metadata

    const user = await getCurrentUser();
    
    const skip = (page - 1) * limit;

    interface HistoryItem {
      id: string;
      filename: string;
      createdAt: Date;
      type: string;
      [key: string]: unknown;
    }
    
    let allResults: HistoryItem[] = [];
    let totalCount = 0;

    // Fetch based on type
    if (type === 'all' || type === 'describe') {
      const whereClause = {
        userId: user.id,
        ...(search && {
          OR: [
            { filename: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const descriptions = await prisma.imageDescription.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        ...(type === 'describe' && { skip, take: limit }),
        select: {
          id: true,
          filename: true,
          description: true,
          confidence: true,
          source: true,
          fileSize: true,
          mimeType: true,
          createdAt: true,
        },
      });

      allResults.push(...descriptions.map(d => ({ ...d, type: 'describe' as const })));
      
      if (type === 'describe') {
        totalCount = await prisma.imageDescription.count({ where: whereClause });
      }
    }

    if (type === 'all' || type === 'runway') {
      const whereClause = {
        userId: user.id,
        ...(search && {
          OR: [
            { filename: { contains: search, mode: 'insensitive' as const } },
            { lowMotion: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const runwayPrompts = await prisma.runwayPrompt.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        ...(type === 'runway' && { skip, take: limit }),
        select: {
          id: true,
          filename: true,
          mode: true,
          lowMotion: true,
          mediumMotion: true,
          highMotion: true,
          description: true,
          fileSize: true,
          mimeType: true,
          createdAt: true,
        },
      });

      allResults.push(...runwayPrompts.map(r => ({ ...r, type: 'runway' as const })));
      
      if (type === 'runway') {
        totalCount = await prisma.runwayPrompt.count({ where: whereClause });
      }
    }

    if (type === 'all' || type === 'metadata') {
      const whereClause = {
        userId: user.id,
        ...(search && {
          OR: [
            { filename: { contains: search, mode: 'insensitive' as const } },
            { title: { contains: search, mode: 'insensitive' as const } },
            { keywords: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const metadataGens = await prisma.metadataGeneration.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        ...(type === 'metadata' && { skip, take: limit }),
        select: {
          id: true,
          filename: true,
          title: true,
          keywords: true,
          category: true,
          fileSize: true,
          mimeType: true,
          createdAt: true,
        },
      });

      allResults.push(...metadataGens.map(m => ({ ...m, type: 'metadata' as const })));
      
      if (type === 'metadata') {
        totalCount = await prisma.metadataGeneration.count({ where: whereClause });
      }
    }

    // Sort all results by createdAt and paginate if type is 'all'
    if (type === 'all') {
      allResults.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      totalCount = allResults.length;
      allResults = allResults.slice(skip, skip + limit);
    }

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      descriptions: allResults,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    
    // Check if it's an authentication error
    if (error instanceof Error && (error.message === 'User not authenticated' || error.message === 'User not found')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    
    // Delete all image descriptions for the current user
    const result = await prisma.imageDescription.deleteMany({
      where: {
        userId: user.id,
      },
    });

    return NextResponse.json({
      message: 'History cleared successfully',
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('Error clearing history:', error);
    
    // Check if it's an authentication error
    if (error instanceof Error && (error.message === 'User not authenticated' || error.message === 'User not found')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to clear history' },
      { status: 500 }
    );
  }
}