import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApiKey } from './getApiKey';

/**
 * Gemini AI Service for image analysis
 * Provides description, metadata, and prompt generation capabilities
 */

interface GeminiDescriptionResult {
    description: string;
    confidence: number;
    source: string;
}

interface GeminiMetadataResult {
    title: string;
    keywords: string;
    category_id: number;
}

interface GeminiRunwayPromptResult {
    low: string;
    medium: string;
    high: string;
}

/**
 * Get Gemini client with API key
 */
async function getGeminiClient(): Promise<GoogleGenerativeAI | null> {
    const apiKey = await getApiKey('GEMINI_API_KEY');
    if (!apiKey) {
        return null;
    }
    return new GoogleGenerativeAI(apiKey);
}

/**
 * Convert file to base64 for Gemini API
 */
async function fileToGenerativePart(file: File): Promise<{
    inlineData: { data: string; mimeType: string };
}> {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    return {
        inlineData: {
            data: buffer.toString('base64'),
            mimeType: file.type || 'image/jpeg',
        },
    };
}

/**
 * Describe an image using Gemini Vision
 */
export async function describeImageWithGemini(file: File): Promise<GeminiDescriptionResult> {
    const genAI = await getGeminiClient();
    if (!genAI) {
        throw new Error('Gemini API key not configured');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const imagePart = await fileToGenerativePart(file);

    const prompt = `Describe this image in detail. Focus on:
- The main subject and what's happening
- Colors, lighting, and atmosphere
- Any notable details or elements
- The overall mood or feeling

Provide a comprehensive description in 2-3 sentences.`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const description = response.text();

    return {
        description: description.trim(),
        confidence: 95,
        source: 'gemini',
    };
}

/**
 * Generate metadata for stock platforms using Gemini Vision
 */
export async function generateMetadataWithGemini(
    file: File,
    options: {
        titleLength?: number;
        keywordCount?: number;
        singleWordKeywords?: boolean;
        isSilhouette?: boolean;
        customPrompt?: string;
        whiteBackground?: boolean;
        transparentBackground?: boolean;
        prohibitedWords?: string;
    } = {}
): Promise<GeminiMetadataResult> {
    const genAI = await getGeminiClient();
    if (!genAI) {
        throw new Error('Gemini API key not configured');
    }

    const {
        titleLength = 150,
        keywordCount = 45,
        singleWordKeywords = false,
        isSilhouette = false,
        customPrompt = '',
        whiteBackground = false,
        transparentBackground = false,
        prohibitedWords = '',
    } = options;

    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
            responseMimeType: 'application/json',
        },
    });
    const imagePart = await fileToGenerativePart(file);

    const categories = `1. Animals, 2. Buildings and Architecture, 3. Business, 4. Drinks, 5. The Environment, 6. States of Mind, 7. Food, 8. Graphic Resources, 9. Hobbies and Leisure, 10. Industry, 11. Landscape, 12. Lifestyle, 13. People, 14. Plants and Flowers, 15. Culture and Religion, 16. Science, 17. Social Issues, 18. Sports, 19. Technology, 20. Transport, 21. Travel`;

    const keywordInstruction = singleWordKeywords
        ? `Generate exactly ${keywordCount} SINGLE-WORD keywords only.`
        : `Generate exactly ${keywordCount} relevant keywords.`;

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

Return JSON with: "title", "keywords", "category_id" (number).`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    const parsed = JSON.parse(text);
    return {
        title: parsed.title || '',
        keywords: parsed.keywords || '',
        category_id: parsed.category_id || 1,
    };
}

/**
 * Generate runway prompts using Gemini Vision
 */
export async function generateRunwayPromptsWithGemini(file: File): Promise<GeminiRunwayPromptResult> {
    const genAI = await getGeminiClient();
    if (!genAI) {
        throw new Error('Gemini API key not configured');
    }

    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
            responseMimeType: 'application/json',
        },
    });
    const imagePart = await fileToGenerativePart(file);

    const prompt = `Analyze this image and generate 3 cinematic camera motion prompts for Runway Gen-3 video generation.

Generate prompts for three motion levels:
1. LOW MOTION: Subtle, gentle movements. Camera moves slowly, subject has minimal motion.
2. MEDIUM MOTION: Moderate movements. Balanced camera motion, subject has some movement.
3. HIGH MOTION: Dynamic, energetic movements. Fast camera motion, subject has significant action.

Each prompt should follow this format:
"a [camera movement] camera moves [speed] toward/around the [subject description] [action/motion] cinematic live-action"

Examples:
- Low: "a smooth dolly camera moves slowly toward the car remains stationary as the sun dips softly behind the horizon cinematic live-action"
- Medium: "a steady tracking camera moves forward toward the waves gently lap against the shore while the breeze stirs the grass cinematic live-action"
- High: "a dynamic handheld camera moves quickly toward the car speeds off rapidly throwing gravel and dust into the air cinematic live-action"

Return JSON with: "low", "medium", "high" (each containing the prompt string).`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    const parsed = JSON.parse(text);
    return {
        low: parsed.low || '',
        medium: parsed.medium || '',
        high: parsed.high || '',
    };
}
