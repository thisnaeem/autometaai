import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApiKey } from './getApiKey';

/**
 * Gemini AI Service for image analysis
 * Fine-tuned prompts for description, metadata, and runway prompt generation
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

  let mimeType = file.type;

  if (file.name.toLowerCase().endsWith('.svg') || mimeType === 'image/svg+xml') {
    mimeType = 'image/png';
  }

  if (!mimeType || mimeType === 'application/octet-stream') {
    mimeType = 'image/jpeg';
  }

  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  };
}

// ============================================================
// FINE-TUNED PROMPT HELPERS FOR RUNWAY
// ============================================================

/**
 * Clean motion clauses - remove camera words, parentheses, etc.
 */
function cleanClause(text: string): string {
  if (!text) return '';
  text = text.replace(/\([^)]*\)/g, ' '); // remove parentheses
  text = text.replace(/a smooth dolly camera/gi, ' ');
  text = text.replace(/cinematic live-action/gi, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  text = text.replace(/^and\s+/i, '');
  return text;
}

/**
 * Pick a random item from an array
 */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Auto-choose camera style based on the motion text and intensity
 */
function chooseCameraPrefix(motion: string, clause: string): string {
  const t = (clause || '').toLowerCase();
  const m = motion === 'low' ? 'low' : motion === 'high' ? 'high' : 'medium';

  // Semantic flags from clause text
  const isPortrait = /\b(face|portrait|close[- ]?up|headshot|bust|shoulders|selfie)\b/.test(t);
  const isWide =
    /\b(landscape|horizon|valley|mountain|sky|skyline|street|road|highway|bridge|forest|jungle|ocean|sea|lake|river|desert|field|stadium|arena|crowd|city|town|village|square|plaza|panorama|wide)\b/.test(
      t
    );
  const hasVerticalUp =
    /\b(rise|rises|rising|ascending|ascends|lift|lifting|soar|soars|climb|climbing|float up|floating up|elevate|elevating)\b/.test(
      t
    );
  const hasVerticalDown =
    /\b(fall|falls|falling|drops|dropping|descend|descending|cascades|plunge|plunges|collapsing)\b/.test(t);
  const isAction =
    /\b(run|runs|running|race|races|racing|rush|rushes|charging|explodes|explosion|impact|chase|storm|burst|bursting|fight|fighting|attack|attacking|crash|collide|colliding|sprint|sprinting|dash|dashing|jump|jumping|leap|leaping|spin|spinning)\b/.test(
      t
    );
  const isCircular =
    /\b(circle|circles|circling|orbit|orbits|orbiting|swirl|swirls|spins|spinning|spiral|spirals|around)\b/.test(t);
  const isTenseOrUnstable =
    /\b(tense|uneasy|unstable|chaotic|confusing|dizzy|distorted|surreal|nightmare|panic|panicked|madness)\b/.test(t);
  const isIntimatePOV =
    /\b(from the eyes of|from the point of view|point of view|pov|seen through|looking through)\b/.test(t);

  // 1) Vertical motion → tilt / crane
  if (hasVerticalUp) {
    if (m === 'low') return 'a gentle tilt up moves slowly as ';
    if (m === 'high') return 'a fast crane shot rises quickly as ';
    return 'a smooth crane shot rises steadily as ';
  }
  if (hasVerticalDown) {
    if (m === 'low') return 'a soft tilt down moves slowly as ';
    if (m === 'high') return 'a fast crane shot drops quickly as ';
    return 'a controlled crane shot descends steadily as ';
  }

  // 2) Circular motion → orbit
  if (isCircular) {
    if (m === 'low') return 'a smooth orbiting camera moves slowly around ';
    if (m === 'high') return 'a fast orbiting camera whirls quickly around ';
    return 'a steady orbiting camera moves steadily around ';
  }

  // 3) Intimate or POV / portrait scenes
  if (isIntimatePOV || isPortrait) {
    if (m === 'low') {
      return pick(['a subtle push in camera moves slowly toward ', 'a gentle close up camera eases slowly toward ']);
    }
    if (m === 'high') {
      return pick([
        'a fast handheld close up camera moves quickly toward ',
        'a rapid push in camera drives quickly toward ',
      ]);
    }
    return pick(['a smooth push in camera moves steadily toward ', 'a steady close up camera glides steadily toward ']);
  }

  // 4) Wide environments → pans and sweeps
  if (isWide) {
    if (m === 'low') {
      return pick(['a wide cinematic camera pans slowly across ', 'a calm wide shot gently pans across ']);
    }
    if (m === 'high') {
      return pick(['a wide dynamic camera whips quickly across ', 'a fast sweeping camera pans rapidly across ']);
    }
    return pick(['a wide cinematic camera pans steadily across ', 'a smooth wide shot glides steadily across ']);
  }

  // 5) Strong action → tracking / handheld
  if (isAction) {
    if (m === 'low') {
      return pick(['a smooth tracking camera moves slowly alongside ', 'a steady tracking shot follows slowly alongside ']);
    }
    if (m === 'high') {
      return pick([
        'a dynamic handheld tracking camera races quickly alongside ',
        'a fast tracking camera rushes quickly alongside ',
      ]);
    }
    return pick(['a dynamic tracking camera moves steadily alongside ', 'a steady tracking shot follows steadily alongside ']);
  }

  // 6) Tense or unstable mood → dutch angle
  if (isTenseOrUnstable) {
    if (m === 'low') return 'a subtle dutch angle camera holds slowly on ';
    if (m === 'high') return 'a sharp dutch angle handheld camera moves quickly around ';
    return 'a dutch angle camera moves steadily around ';
  }

  // 7) Fallbacks by motion (no strong pattern found)
  if (m === 'low') {
    return pick([
      'a smooth dolly camera moves slowly toward ',
      'a gentle zoom in slowly frames ',
      'a soft static camera holds the scene as ',
    ]);
  }
  if (m === 'high') {
    return pick([
      'a dynamic handheld camera moves quickly toward ',
      'a fast tracking camera drives quickly toward ',
      'a rapid zoom in snaps quickly toward ',
    ]);
  }

  // medium
  return pick([
    'a smooth dolly camera moves steadily toward ',
    'a steady tracking camera moves forward toward ',
    'a controlled zoom in moves steadily toward ',
  ]);
}

/**
 * Build final Runway prompt with camera prefix
 */
function buildRunwayPrompt(motion: string, clause: string): string {
  clause = cleanClause(clause);
  if (!clause) return '';

  // Ensure clause starts naturally
  if (!/^(the|a|an)\b/i.test(clause)) {
    clause = 'the subject ' + clause;
  }

  const prefix = chooseCameraPrefix(motion, clause);
  return (prefix + clause + ' cinematic live-action').replace(/\s+/g, ' ').trim();
}

// ============================================================
// FINE-TUNED PROMPTS
// ============================================================

/**
 * Fine-tuned instruction for Runway mode
 */
function getRunwayInstruction(): string {
  return `You see a still image. Your task is to describe motion at three intensities: low, medium, and high.

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
}

/**
 * Fine-tuned instruction for Image Description Mode
 */
function getDescribeInstruction(): string {
  return `You see a still image. Write a detailed, natural-language description of the image suitable as a high-quality text prompt for an image-to-image or image generation model.

REQUIREMENTS:
- 1 single paragraph, roughly 80–220 words.
- Professional, clear, neutral English.
- Describe:
  • Overall scene and setting.
  • Main subject(s) and their appearance.
  • Important objects and composition.
  • Lighting, color palette, mood, and atmosphere.
  • Camera angle and perspective if obvious.
  • Style: photo, digital illustration, 3D render, medical diagram, etc.
- Stay strictly inside what can reasonably be seen in the image.

STYLE:
Your style should be similar in richness and structure to professional stock photo descriptions.`;
}

/**
 * Fine-tuned instruction for Metadata Generation
 */
function getMetadataInstruction(options: {
  titleLength: number;
  keywordCount: number;
  singleWordKeywords: boolean;
  isSilhouette: boolean;
  customPrompt: string;
  whiteBackground: boolean;
  transparentBackground: boolean;
  prohibitedWords: string;
  isVideo: boolean;
  isSvg: boolean;
}): string {
  const {
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
  } = options;

  const instructions: string[] = [];
  if (isSilhouette) instructions.push('This is a silhouette.');
  if (whiteBackground) instructions.push('This has a white background.');
  if (transparentBackground) instructions.push('This has a transparent background.');
  if (isVideo) instructions.push('This is a video file.');
  if (isSvg) instructions.push('This is an SVG vector graphic.');

  const keywordInstruction = singleWordKeywords
    ? `Generate exactly ${keywordCount} SINGLE-WORD keywords only.`
    : `Generate exactly ${keywordCount} relevant keywords.`;

  const categories = `1. Animals, 2. Buildings and Architecture, 3. Business, 4. Drinks, 5. The Environment, 6. States of Mind, 7. Food, 8. Graphic Resources, 9. Hobbies and Leisure, 10. Industry, 11. Landscape, 12. Lifestyle, 13. People, 14. Plants and Flowers, 15. Culture and Religion, 16. Science, 17. Social Issues, 18. Sports, 19. Technology, 20. Transport, 21. Travel`;

  const metadataExamples = `
Example 1:
Image: A happy young child with curly blonde hair sits on grass, surrounded by two playful baby goats. Sunlight filters through the trees.
Output: {"title": "Joyful child with adorable baby goats on a sunny farm","keywords": "child,kid,girl,blonde hair,curly hair,smiling,happy,joyful,goat,baby goat,kid goat,farm,animal,pet,outdoors,grass,sunny,daylight,summer,countryside,rural,nature,cute,adorable,young,childhood,innocence,playful,livestock,farm animal","category_id": 1}

Example 2:
Image: A man in a suit and glasses smiles while holding a tablet, standing in a dealership filled with tractors.
Output: {"title": "Smiling businessman holding tablet in agricultural machinery dealership","keywords": "businessman,tablet,dealership,agriculture,machinery,tractors,farming,equipment,sales,retail,professional,technology,modern,industry,rural,outdoors,transportation,vehicles,heavy equipment,farm equipment,agricultural vehicles,business owner,manager,employee,customer service,showroom,indoor,man,glasses,smiling,confident","category_id": 3}

Example 3:
Image: A vibrant orange Formula 1 car navigates a darkened race track, illuminated by stadium lights, showcasing speed and competition.
Output: {"title": "Orange formula 1 race car speeds down track at dusk","keywords": "Formula 1,F1 car,race car,motorsport,racing,speed,track,circuit,dusk,night racing,automotive,sports,competition,driver,cockpit,aerodynamics,tire,wheel,asphalt,grandstand,stadium lights,motion blur,low light,action shot,professional racing,single seater,open wheel,fast,powerful","category_id": 18}`;

  return `Analyze image for Adobe Stock metadata.

1. Generate a descriptive Title (aim for ${titleLength} characters). To meet this length, describe the subject, action, setting, lighting, and mood in detail. Do not be concise.
   STRICTLY FORBIDDEN: Do NOT use any special characters (like - / : ; ( ) & !) in the Title. Use ONLY letters, numbers, and spaces.
   ${transparentBackground ? 'Append "isolated on transparent background" to the title.' : ''}

2. ${keywordInstruction} Comma separated.
   STRICTLY FORBIDDEN: Do NOT use special characters in keywords.

3. Choose Category ID from: ${categories}

${instructions.length > 0 ? `Info: ${instructions.join(' ')}` : ''}
${customPrompt ? `Custom: ${customPrompt}` : ''}
${prohibitedWords ? `Avoid: ${prohibitedWords}` : ''}

Use these examples as a guide for style and formatting:
${metadataExamples}

Return JSON: "title", "keywords", "category_id" (number).`;
}

// ============================================================
// MAIN API FUNCTIONS
// ============================================================

/**
 * Describe an image using Gemini Vision (Fine-tuned)
 */
export async function describeImageWithGemini(file: File): Promise<GeminiDescriptionResult> {
  const genAI = await getGeminiClient();
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const imagePart = await fileToGenerativePart(file);

    const prompt = getDescribeInstruction();

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const description = response.text();

    return {
      description: description.trim(),
      confidence: 95,
      source: 'gemini',
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Forbidden') || errorMessage.includes('403')) {
      throw new Error('Gemini API access forbidden. Please check your API key permissions or try again later.');
    }
    if (errorMessage.includes('QUOTA_EXCEEDED') || errorMessage.includes('429')) {
      throw new Error('Gemini API rate limit exceeded. Please wait a moment and try again.');
    }
    if (errorMessage.includes('INVALID_API_KEY') || errorMessage.includes('401')) {
      throw new Error('Invalid Gemini API key. Please check your API key in settings.');
    }
    if (errorMessage.includes('SAFETY')) {
      throw new Error('Image flagged by Gemini safety filters. Please try a different image.');
    }

    console.error('Gemini describe error:', error);
    throw new Error(`Gemini API error: ${errorMessage}`);
  }
}

/**
 * Generate metadata for stock platforms using Gemini Vision (Fine-tuned)
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
    isVideo?: boolean;
    isSvg?: boolean;
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
    isVideo = false,
    isSvg = false,
  } = options;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });
    const mediaPart = await fileToGenerativePart(file);

    const prompt = getMetadataInstruction({
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

    const result = await model.generateContent([prompt, mediaPart]);
    const response = await result.response;
    const text = response.text();

    const parsed = JSON.parse(text);
    return {
      title: parsed.title || '',
      keywords: parsed.keywords || '',
      category_id: parsed.category_id || 1,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Forbidden') || errorMessage.includes('403')) {
      if (isVideo) {
        throw new Error('Video file rejected by Gemini API. Please try a different video.');
      }
      throw new Error('Gemini API access forbidden. Please check your API key permissions.');
    }
    if (errorMessage.includes('QUOTA_EXCEEDED') || errorMessage.includes('429')) {
      throw new Error('Gemini API rate limit exceeded. Please wait a moment and try again.');
    }
    if (errorMessage.includes('INVALID_API_KEY') || errorMessage.includes('401')) {
      throw new Error('Invalid Gemini API key. Please check your API key in settings.');
    }
    if (errorMessage.includes('SAFETY')) {
      throw new Error('Content flagged by Gemini safety filters. Please try a different file.');
    }

    console.error('Gemini metadata generation error:', error);
    throw new Error(`Gemini API error: ${errorMessage}`);
  }
}

/**
 * Generate runway prompts using Gemini Vision (Fine-tuned with camera selection)
 */
export async function generateRunwayPromptsWithGemini(file: File): Promise<GeminiRunwayPromptResult> {
  const genAI = await getGeminiClient();
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });
    const imagePart = await fileToGenerativePart(file);

    const prompt = getRunwayInstruction();

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    const rawJson = JSON.parse(text);

    // Apply fine-tuned camera selection and prompt building
    const low = buildRunwayPrompt('low', rawJson.low || '');
    const medium = buildRunwayPrompt('medium', rawJson.medium || '');
    const high = buildRunwayPrompt('high', rawJson.high || '');

    return { low, medium, high };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Forbidden') || errorMessage.includes('403')) {
      throw new Error('Gemini API access forbidden. Please check your API key permissions.');
    }
    if (errorMessage.includes('QUOTA_EXCEEDED') || errorMessage.includes('429')) {
      throw new Error('Gemini API rate limit exceeded. Please wait a moment and try again.');
    }
    if (errorMessage.includes('INVALID_API_KEY') || errorMessage.includes('401')) {
      throw new Error('Invalid Gemini API key. Please check your API key in settings.');
    }
    if (errorMessage.includes('SAFETY')) {
      throw new Error('Image flagged by Gemini safety filters. Please try a different image.');
    }

    console.error('Gemini runway prompt error:', error);
    throw new Error(`Gemini API error: ${errorMessage}`);
  }
}
