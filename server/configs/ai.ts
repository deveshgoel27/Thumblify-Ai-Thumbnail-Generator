const HF_API_URL =
    "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0";

export async function generateImage(prompt: string): Promise<Buffer> {
    const response = await fetch(HF_API_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.HF_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            inputs: prompt,
            options: { wait_for_model: true }
        })
    });

    // ❌ Handle HTTP errors
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HF API error ${response.status}: ${errorText}`);
    }

    // ✅ IMPORTANT: Check if response is actually an image
    const contentType = response.headers.get("content-type");

    if (!contentType || !contentType.includes("image")) {
        const errorText = await response.text();
        throw new Error(`HF returned non-image response: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}