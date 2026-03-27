import { Request, Response } from "express";
import Thumbnail from "../models/Thumbnail";
import { generateImage } from "../configs/ai";
import path from "node:path";
import fs from "node:fs";
import { v2 as cloudinary } from 'cloudinary';

const stylePrompts = {
    'Bold & Graphic': 'eye-catching thumbnail, bold typography, vibrant colors, expressive facial reaction, dramatic lighting, high contrast, click-worthy composition, professional style',
    'Tech/Futuristic': 'futuristic thumbnail, sleek modern design, digital UI elements, glowing accents, holographic effects, cyber-tech aesthetic, sharp lighting, high-tech atmosphere',
    'Minimalist': 'minimalist thumbnail, clean layout, simple shapes, limited color palette, plenty of negative space, modern flat design, clear focal point',
    'Photorealistic': 'photorealistic thumbnail, ultra-realistic lighting, natural skin tones, candid moment, DSLR-style photography, lifestyle realism, shallow depth of field',
    'Illustrated': 'illustrated thumbnail, custom digital illustration, stylized characters, bold outlines, vibrant colors, creative cartoon or vector art style',
}

const colorSchemeDescriptions = {
    vibrant: 'vibrant and energetic colors, high saturation, bold contrasts, eye-catching palette',
    sunset: 'warm sunset tones, orange pink and purple hues, soft gradients, cinematic glow',
    forest: 'natural green tones, earthy colors, calm and organic palette, fresh atmosphere',
    neon: 'neon glow effects, electric blues and pinks, cyberpunk lighting, high contrast glow',
    purple: 'purple-dominant color palette, magenta and violet tones, modern and stylish mood',
    monochrome: 'black and white color scheme, high contrast, dramatic lighting, timeless aesthetic',
    ocean: 'cool blue and teal tones, aquatic color palette, fresh and clean atmosphere',
    pastel: 'soft pastel colors, low saturation, gentle tones, calm and friendly aesthetic',
}

const PROMPT_SUFFIX = 'YouTube thumbnail, bold text, vibrant colors, high contrast, modern design, 16:9, eye-catching';

export const generateThumbnail = async (req: Request, res: Response) => {
    try {
        const { userId } = req.session;
        const { title, prompt: user_prompt, style, aspect_ratio, color_scheme, text_overlay } = req.body;

        const thumbnail = await Thumbnail.create({
            userId,
            title,
            prompt_used: user_prompt,
            user_prompt,
            style,
            aspect_ratio,
            color_scheme,
            text_overlay,
            isGenerating: true,
        });

        // Build enriched prompt
        let prompt = `Create a ${stylePrompts[style as keyof typeof stylePrompts] ?? 'professional'} for: "${title}". `;

        if (color_scheme) {
            prompt += `Use a ${colorSchemeDescriptions[color_scheme as keyof typeof colorSchemeDescriptions]} color scheme. `;
        }

        if (text_overlay) {
            prompt += `Include bold text overlay saying "${text_overlay}" on the thumbnail. `;
        }

        if (user_prompt) {
            prompt += `Additional details: ${user_prompt}. `;
        }

        prompt += `The thumbnail should be ${aspect_ratio ?? '16:9'}, visually stunning, and designed to maximize click-through rate. ${PROMPT_SUFFIX}.`;

        let imageUrl: string | null = null;
        let usedFallback = false;

        try {
            // Generate image via HuggingFace Stable Diffusion
            const imageBuffer = await generateImage(prompt);

            const filename = `final-output-${Date.now()}.png`;
            const filePath = path.join('images', filename);

            // Create the images directory if it doesn't exist
            fs.mkdirSync('images', { recursive: true });

            // Write buffer to disk
            fs.writeFileSync(filePath, imageBuffer);

            // Upload to Cloudinary
            const uploadResult = await cloudinary.uploader.upload(filePath, { resource_type: 'image' });
            imageUrl = uploadResult.url;

            // Remove temp file
            fs.unlinkSync(filePath);

        } catch (hfError: any) {
            const errorStatus = hfError?.status || hfError?.code;
            const errorMessage = hfError?.message || hfError?.toString();

            console.error(`[HuggingFace API Error] Status: ${errorStatus}, Message: ${errorMessage}`);

            // Check for quota / rate-limit
            if (
                errorStatus === 429 ||
                errorMessage?.includes('RESOURCE_EXHAUSTED') ||
                errorMessage?.includes('429') ||
                errorMessage?.includes('rate limit')
            ) {
                console.warn(`[Quota Exceeded] Rate limit reached for user ${userId}`);
                return res.status(429).json({ message: 'API quota exceeded. Please try again later.' });
            }

            // Fallback to Pollinations.ai
            console.warn(`[Fallback] HuggingFace failed, using pollinations.ai for user ${userId}`);
            try {
                const sanitizedPrompt = encodeURIComponent(prompt.substring(0, 500));
                imageUrl = `https://image.pollinations.ai/prompt/${sanitizedPrompt}`;
                usedFallback = true;
            } catch (fallbackError: any) {
                console.error(`[Fallback Error] Pollinations.ai also failed: ${fallbackError.message}`);
                return res.status(500).json({ message: 'Thumbnail generation failed' });
            }
        }

        // Persist result
        thumbnail.image_url = imageUrl;
        thumbnail.isGenerating = false;
        if (usedFallback) {
            thumbnail.prompt_used = `${thumbnail.prompt_used} (generated with fallback)`;
        }
        await thumbnail.save();

        res.json({
            message: 'Thumbnail Generated' + (usedFallback ? ' (using fallback)' : ''),
            thumbnail,
        });

    } catch (error: any) {
        console.error(`[Generation Controller Error] ${error.message}`, error);
        res.status(500).json({ message: 'Thumbnail generation failed' });
    }
}

// Controller for Thumbnail Deletion
export const deleteThumbnail = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { userId } = req.session;

        await Thumbnail.findByIdAndDelete({ _id: id, userId });

        res.json({ message: 'Thumbnail deleted successfully' });
    } catch (error: any) {
        console.error(`[Delete Thumbnail Error] ${error.message}`, error);
        res.status(500).json({ message: 'Failed to delete thumbnail' });
    }
}