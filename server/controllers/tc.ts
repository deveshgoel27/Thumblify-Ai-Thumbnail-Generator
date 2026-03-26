// import { Request, Response } from "express";
// import Thumbnail from "../models/Thumbnail";
// import { GenerateContentConfig, HarmBlockThreshold, HarmCategory } from "@google/genai";
// import ai from "../configs/ai";
// import path from "node:path";
// import fs from "node:fs";
// import { v2 as cloudinary } from 'cloudinary';

// const stylePrompts = {
//     'Bold & Graphic': 'eye-catching thumbnail, bold typography, vibrant colors, expressive facial reaction, dramatic lighting, high contrast, click-worthy composition, professional style',
//     'Tech/Futuristic': 'futuristic thumbnail, sleek modern design, digital UI elements, glowing accents, holographic effects, cyber-tech aesthetic, sharp lighting, high-tech atmosphere',
//     'Minimalist': 'minimalist thumbnail, clean layout, simple shapes, limited color palette, plenty of negative space, modern flat design, clear focal point',
//     'Photorealistic': 'photorealistic thumbnail, ultra-realistic lighting, natural skin tones, candid moment, DSLR-style photography, lifestyle realism, shallow depth of field',
//     'Illustrated': 'illustrated thumbnail, custom digital illustration, stylized characters, bold outlines, vibrant colors, creative cartoon or vector art style',
// }

// const colorSchemeDescriptions = {
//     vibrant: 'vibrant and energetic colors, high saturation, bold contrasts, eye-catching palette',
//     sunset: 'warm sunset tones, orange pink and purple hues, soft gradients, cinematic glow',
//     forest: 'natural green tones, earthy colors, calm and organic palette, fresh atmosphere',
//     neon: 'neon glow effects, electric blues and pinks, cyberpunk lighting, high contrast glow',
//     purple: 'purple-dominant color palette, magenta and violet tones, modern and stylish mood',
//     monochrome: 'black and white color scheme, high contrast, dramatic lighting, timeless aesthetic',
//     ocean: 'cool blue and teal tones, aquatic color palette, fresh and clean atmosphere',
//     pastel: 'soft pastel colors, low saturation, gentle tones, calm and friendly aesthetic',
// }


// export const generateThumbnail = async (req: Request, res: Response) => {
//     try {
//         const { userId } = req.session;
//         const { title, prompt: user_prompt, style, aspect_ratio, color_scheme, text_overlay } = req.body;

//         const thumbnail = await Thumbnail.create({
//             userId,
//             title,
//             prompt_used: user_prompt,
//             user_prompt,
//             style,
//             aspect_ratio,
//             color_scheme,
//             text_overlay,
//             isGenerating: true,
//         })

//         const model = 'gemini-3-pro-image-preview'

//         const generationConfig: GenerateContentConfig = {
//             maxOutputTokens: 32768,
//             temperature: 1,
//             topP: 0.95,
//             responseModalities: ['IMAGE'],
//             imageConfig: {
//                 aspectRatio: aspect_ratio || '16:9',
//                 imageSize: '1K'
//             },
//             safetySettings: [
//                 {
//                     category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
//                     threshold: HarmBlockThreshold.OFF
//                 },
//                 {
//                     category: HarmCategory.
//                         HARM_CATEGORY_DANGEROUS_CONTENT, threshold:
//                         HarmBlockThreshold.OFF
//                 },
//                 {
//                     category: HarmCategory.
//                         HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold:
//                         HarmBlockThreshold.OFF
//                 },
//                 {
//                     category: HarmCategory.HARM_CATEGORY_HARASSMENT,
//                     threshold: HarmBlockThreshold.OFF
//                 },
//             ]
//         }

//         let prompt = `Create a ${stylePrompts[style as keyof typeof stylePrompts]} for: "${title}"`

//         if (color_scheme) {
//             prompt += `Use a ${colorSchemeDescriptions[color_scheme as keyof typeof colorSchemeDescriptions]} color scheme.`
//         }

//         if (user_prompt) {
//             prompt += `Additional details: ${user_prompt}.`
//         }

//         prompt += `The thumbnail should be ${aspect_ratio}, visually stunning, and deigned to maximize click-through rate. Make it bold, professional, and impossible to ignore.`

//         let imageUrl: string | null = null;
//         let usedFallback = false;

//         try {
//             //Generate the image using the ai model
//             const response: any = await ai.models.generateContent({
//                 model,
//                 contents: [prompt],
//                 config: generationConfig
//             })

//             // Check if the response is valid
//             if (!response?.candidates?.[0]?.content?.parts) {
//                 throw new Error('Unexpected response from Gemini')
//             }

//             const parts = response.candidates[0].content.parts;
//             let finalBuffer: Buffer | null = null;

//             for (const part of parts) {
//                 if (part.inlineData) {
//                     finalBuffer = Buffer.from(part.inlineData.data, 'base64')
//                 }
//             }

//             const filename = `final-output-${Date.now()}.png`;
//             const filePath = path.join('images', filename);

//             //Create the images directory if it doesn't exist
//             fs.mkdirSync('images', { recursive: true })

//             //write the final image to the file
//             fs.writeFileSync(filePath, finalBuffer!);

//             const uploadResult = await cloudinary.uploader.upload
//                 (filePath, { resource_type: 'image' })

//             imageUrl = uploadResult.url;

//             //remove image file form disk
//             fs.unlinkSync(filePath)

//         } catch (geminiError: any) {
//             const errorStatus = geminiError?.status || geminiError?.code;
//             const errorMessage = geminiError?.message || geminiError?.toString();
            
//             console.error(`[Gemini API Error] Status: ${errorStatus}, Message: ${errorMessage}`);

//             // Check for quota exceeded (429 / RESOURCE_EXHAUSTED)
//             if (errorStatus === 429 || errorMessage?.includes('RESOURCE_EXHAUSTED') || errorMessage?.includes('429')) {
//                 console.warn(`[Quota Exceeded] Quota limit reached for user ${userId}`);
//                 return res.status(429).json({ message: 'API quota exceeded. Please try again later.' });
//             }

//             // Use fallback image generator
//             console.warn(`[Fallback] Gemini failed, using pollinations.ai for user ${userId}`);
//             try {
//                 // Sanitize prompt for URL encoding
//                 const sanitizedPrompt = encodeURIComponent(prompt.substring(0, 500));
//                 imageUrl = `https://image.pollinations.ai/prompt/${sanitizedPrompt}`;
//                 usedFallback = true;
//             } catch (fallbackError: any) {
//                 console.error(`[Fallback Error] Pollinations.ai also failed: ${fallbackError.message}`);
//                 return res.status(500).json({ message: 'Thumbnail generation failed' });
//             }
//         }

//         // Update thumbnail with image URL
//         thumbnail.image_url = imageUrl;
//         thumbnail.isGenerating = false;
//         if (usedFallback) {
//             thumbnail.prompt_used = `${thumbnail.prompt_used} (generated with fallback)`;
//         }
//         await thumbnail.save()

//         res.json({ message: 'Thumbnail Generated' + (usedFallback ? ' (using fallback)' : ''), thumbnail })

//     } catch (error: any) {
//         console.error(`[Generation Controller Error] ${error.message}`, error);
//         res.status(500).json({ message: 'Thumbnail generation failed' });
//     }
// }

//   // Controllers For Thumbnail Deletion

// export const deleteThumbnail = async (req: Request, res: Response) => {
//     try {
//          const {id} = req.params;
//          const {userId} = req.session;

//          await Thumbnail.findByIdAndDelete({_id: id, userId})
         
//          res.json({message: 'Thumbnail deleted successfully'});
//     }  catch (error: any) {
//         console.error(`[Delete Thumbnail Error] ${error.message}`, error);
//         res.status(500).json({ message: 'Failed to delete thumbnail' });
//     }
// }