import { Request, Response } from "express";
import Thumbnail from "../models/Thumbnail";
import { buildThumbnailPrompt, generateThumbnailImage } from "../services/imageService";

// Controller for Thumbnail Generation
export const generateThumbnail = async (req: Request, res: Response) => {
    try {
        const { userId } = req.session;
        const { title, prompt: user_prompt, style, aspect_ratio, color_scheme, text_overlay } = req.body;

        if (!title?.trim()) {
            return res.status(400).json({ message: 'Title is required' });
        }

        // 1. Create a DB record immediately so the frontend can poll for status
        const thumbnail = await Thumbnail.create({
            userId,
            title,
            user_prompt,
            style,
            aspect_ratio,
            color_scheme,
            text_overlay,
            isGenerating: true,
        });

        // 2. Build an enriched prompt from all user inputs
        const promptOptions = {
            title,
            style,
            color_scheme,
            text_overlay,
            user_prompt,
            aspect_ratio,
        };
        const prompt = await buildThumbnailPrompt(promptOptions);

        console.log(`[ThumbnailController] Generating for user ${userId} | style: ${style} | ratio: ${aspect_ratio}`);

        // 3. Generate via service (Cloudflare FLUX.2 klein → FLUX.1 schnell fallback)
        let imageResult: { imageUrl: string; provider: string };
        try {
            imageResult = await generateThumbnailImage(prompt, promptOptions);
        } catch (genError: any) {
            // Roll back the DB record so the user can try again cleanly
            await Thumbnail.findByIdAndDelete(thumbnail._id);

            const statusCode: number = genError?.statusCode === 429 ? 429 : 500;
            const message: string =
                genError?.statusCode === 429
                    ? genError.message
                    : 'Thumbnail generation failed. Please try again.';

            console.error(`[ThumbnailController] Generation failed: ${genError.message}`);
            return res.status(statusCode).json({ message });
        }

        // 4. Persist the result
        thumbnail.image_url = imageResult.imageUrl;
        thumbnail.prompt_used = prompt;
        thumbnail.isGenerating = false;
        await thumbnail.save();

        console.log(`[ThumbnailController] Success via ${imageResult.provider} for user ${userId}`);

        res.json({
            message: `Thumbnail Generated`,
            thumbnail,
        });

    } catch (error: any) {
        console.error(`[ThumbnailController] Unexpected error: ${error.message}`, error);
        res.status(500).json({ message: 'Thumbnail generation failed' });
    }
};

// Controller for Thumbnail Deletion
export const deleteThumbnail = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { userId } = req.session;

        // findOneAndDelete (not findByIdAndDelete, which only accepts an id
        // and would silently ignore the userId filter) so a user can only
        // ever delete their own thumbnails.
        await Thumbnail.findOneAndDelete({ _id: id, userId });

        res.json({ message: 'Thumbnail deleted successfully' });
    } catch (error: any) {
        console.error(`[ThumbnailController] Delete error: ${error.message}`, error);
        res.status(500).json({ message: 'Failed to delete thumbnail' });
    }
};