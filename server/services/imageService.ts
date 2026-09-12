import { v2 as cloudinary } from 'cloudinary';
import { CANVAS_SIZES, composeThumbnail } from './textOverlay';

// ── Prompt Enhancement Maps ───────────────────────────────────────────────────
// Deliberately free of words like "typography"/"UI"/"text": those make image
// models draw garbled lettering. The title is added later by textOverlay.ts.

const stylePrompts: Record<string, string> = {
    'Bold & Graphic':
        'bold graphic style, vibrant saturated colors, expressive facial reaction, dramatic lighting, high contrast, punchy click-worthy composition',
    'Tech/Futuristic':
        'futuristic tech aesthetic, sleek modern setting, glowing neon accents, holographic light effects, sharp lighting, high-tech atmosphere',
    Minimalist:
        'minimalist style, clean simple composition, simple shapes, limited color palette, lots of negative space, one clear focal point',
    Photorealistic:
        'photorealistic, ultra-realistic lighting, natural skin tones, candid moment, DSLR photography, shallow depth of field',
    Illustrated:
        'digital illustration, stylized characters, bold outlines, vibrant colors, cartoon vector art style',
};

const colorSchemeDescriptions: Record<string, string> = {
    vibrant: 'vibrant and energetic colors, high saturation, bold contrasts, eye-catching palette',
    sunset: 'warm sunset tones, orange pink and purple hues, soft gradients, cinematic glow',
    forest: 'natural green tones, earthy colors, calm and organic palette, fresh atmosphere',
    neon: 'neon glow effects, electric blues and pinks, cyberpunk lighting, high contrast glow',
    purple: 'purple-dominant color palette, magenta and violet tones, modern and stylish mood',
    monochrome: 'black and white color scheme, high contrast, dramatic lighting, timeless aesthetic',
    ocean: 'cool blue and teal tones, aquatic color palette, fresh and clean atmosphere',
    pastel: 'soft pastel colors, low saturation, gentle tones, calm and friendly aesthetic',
};

// Keeps the side where textOverlay.ts places the title free of clutter
const compositionHints: Record<string, string> = {
    '16:9': 'main subject placed on the right side of the frame, empty uncluttered darker area on the left side',
    '1:1': 'main subject in the upper part of the frame, empty uncluttered darker area at the bottom',
    '9:16': 'main subject in the upper part of the frame, empty uncluttered darker area at the bottom',
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PromptOptions {
    title: string;
    style?: string;
    color_scheme?: string;
    text_overlay?: boolean;
    user_prompt?: string;
    aspect_ratio?: string;
}

export interface ImageResult {
    imageUrl: string;
    provider: string;
}

// Custom error carrying an HTTP status code for proper API responses
class ImageGenError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number = 500,
    ) {
        super(message);
        this.name = 'ImageGenError';
    }
}

// ── Prompt Builder ────────────────────────────────────────────────────────────

const SCENE_WRITER_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';

const SCENE_WRITER_SYSTEM_PROMPT = `You write prompts for a text-to-image model that creates YouTube thumbnail backgrounds.
Given a video title and a visual style, describe ONE vivid, concrete scene that would make a click-worthy thumbnail: the main subject, their action and facial expression, key objects, the setting and the lighting.
Strict rules:
- Describe only visual elements. Never include any text, words, letters, numbers, prices, signs, labels, captions, logos, or the title itself.
- Avoid screens, monitors, posters, books or boards that would show writing.
- One paragraph, under 60 words. Output only the description, nothing else.`;

/**
 * Turns the title into a purely visual scene description with a small LLM.
 * Putting the raw title (or words like "thumbnail") in the image prompt makes
 * FLUX try to draw it as text — garbled and misspelled — and "no text"
 * instructions don't prevent that. Returns null if the LLM call fails.
 */
async function describeScene(title: string, style?: string, user_prompt?: string): Promise<string | null> {
    const request = [`Title: ${title}`, `Style: ${style ?? 'Bold & Graphic'}`];
    if (user_prompt?.trim()) request.push(`Extra details from the creator: ${user_prompt.trim()}`);

    try {
        const data = await callCloudflare(SCENE_WRITER_MODEL, {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: SCENE_WRITER_SYSTEM_PROMPT },
                    { role: 'user', content: request.join('\n') },
                ],
                max_tokens: 200,
            }),
        }, 20_000);

        const scene: unknown = data?.result?.response ?? data?.result?.choices?.[0]?.message?.content;
        // Strip the trailing full stop — buildThumbnailPrompt adds its own separators
        const cleaned = typeof scene === 'string' ? scene.trim().replace(/[.\s]+$/, '') : '';
        return cleaned || null;
    } catch (err: any) {
        console.warn(`[ImageService] Scene writer failed, using template prompt. Reason: ${err.message}`);
        return null;
    }
}

export async function buildThumbnailPrompt(options: PromptOptions): Promise<string> {
    const { title, style, color_scheme, text_overlay, user_prompt, aspect_ratio } = options;

    const scene = await describeScene(title, style, user_prompt);

    const parts = [
        scene ?? `A scene representing the topic: ${title}`,
        stylePrompts[style ?? ''] ?? 'eye-catching professional style',
    ];

    if (color_scheme && colorSchemeDescriptions[color_scheme]) {
        parts.push(colorSchemeDescriptions[color_scheme]);
    }

    // The scene writer already incorporates the user's extra details
    if (!scene && user_prompt?.trim()) {
        parts.push(user_prompt.trim());
    }

    if (text_overlay) {
        parts.push(compositionHints[aspect_ratio ?? '16:9'] ?? compositionHints['16:9']);
    }

    parts.push('high detail, sharp focus, professional quality');

    return parts.join('. ') + '.';
}

// ── Cloudflare Workers AI ─────────────────────────────────────────────────────

interface CloudflareRequest {
    body: FormData | string;
    headers?: Record<string, string>;
}

// Runs any Workers AI model and returns the parsed JSON response
async function callCloudflare(model: string, init: CloudflareRequest, timeoutMs = 60_000): Promise<any> {
    const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = process.env;
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        throw new ImageGenError('CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN are not configured', 500);
    }

    let response: Response;
    try {
        response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`, ...init.headers },
            body: init.body,
            signal: AbortSignal.timeout(timeoutMs),
        });
    } catch (err: any) {
        throw new ImageGenError(`${model} request failed: ${err?.message ?? err}`, 502);
    }

    const data: any = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
        const message: string = data?.errors?.[0]?.message ?? `HTTP ${response.status}`;
        // The free plan's 10,000 neurons/day are shared by every model, so
        // retrying with a different one won't help.
        if (response.status === 429 || /neuron|allocation|rate limit/i.test(message)) {
            throw new ImageGenError('Daily free generation limit reached. Please try again tomorrow.', 429);
        }
        throw new ImageGenError(`${model} failed: ${message}`, 502);
    }

    return data;
}

async function runImageModel(model: string, init: CloudflareRequest): Promise<Buffer> {
    const data = await callCloudflare(model, init);
    const image: unknown = data?.result?.image;
    if (typeof image !== 'string' || !image) {
        throw new ImageGenError(`${model} returned no image data`, 502);
    }
    return Buffer.from(image, 'base64');
}

// Primary: FLUX.2 [klein] 4B — good quality, generates at the exact size
function generateWithFlux2Klein(prompt: string, size: { width: number; height: number }): Promise<Buffer> {
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('width', String(size.width));
    form.append('height', String(size.height));
    return runImageModel('@cf/black-forest-labs/flux-2-klein-4b', { body: form });
}

// Fallback: FLUX.1 [schnell] — cheaper and faster, but always 1024x1024
// (composeThumbnail crops it to the requested aspect ratio)
function generateWithFlux1Schnell(prompt: string): Promise<Buffer> {
    return runImageModel('@cf/black-forest-labs/flux-1-schnell', {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.substring(0, 2048), steps: 8 }),
    });
}

// ── Main Orchestrator ─────────────────────────────────────────────────────────

/**
 * Generates the background with FLUX.2 klein (falling back to FLUX.1 schnell),
 * overlays the title as real text, and uploads the result to Cloudinary.
 */
export async function generateThumbnailImage(prompt: string, options: PromptOptions): Promise<ImageResult> {
    const size = CANVAS_SIZES[options.aspect_ratio ?? '16:9'] ?? CANVAS_SIZES['16:9'];

    let background: Buffer;
    let provider: string;
    try {
        background = await generateWithFlux2Klein(prompt, size);
        provider = 'flux-2-klein-4b';
    } catch (kleinErr: any) {
        if (kleinErr instanceof ImageGenError && kleinErr.statusCode === 429) throw kleinErr;
        console.warn(`[ImageService] FLUX.2 klein failed, trying FLUX.1 schnell. Reason: ${kleinErr.message}`);

        try {
            background = await generateWithFlux1Schnell(prompt);
            provider = 'flux-1-schnell';
        } catch (schnellErr: any) {
            if (schnellErr instanceof ImageGenError && schnellErr.statusCode === 429) throw schnellErr;
            console.error(`[ImageService] FLUX.1 schnell also failed: ${schnellErr.message}`);
            throw new ImageGenError('All image generation providers failed. Please try again later.', 502);
        }
    }

    const png = composeThumbnail({
        background,
        aspect_ratio: options.aspect_ratio,
        title: options.text_overlay ? options.title : undefined,
        color_scheme: options.color_scheme,
    });

    const uploadResult = await cloudinary.uploader.upload(
        `data:image/png;base64,${png.toString('base64')}`,
        { resource_type: 'image', folder: 'thumblify' },
    );

    return { imageUrl: uploadResult.secure_url, provider };
}
