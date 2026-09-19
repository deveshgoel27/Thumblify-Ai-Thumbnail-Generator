import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

/**
 * Composes the final thumbnail: AI background (cover-fit to the exact canvas
 * size) + a legibility gradient + the video title rendered as real text.
 *
 * Image models are unreliable at drawing text (misspellings, garbled
 * letters), so the title is never left to the AI — it's typeset here with a
 * bundled font, which also renders identically locally and on Vercel.
 */

// The font ships with the code (see vercel.json includeFiles). Depending on how
// the serverless bundle is laid out, it can sit next to the compiled file or at
// the project root, so check both.
const FONT_CANDIDATES = [
    path.join(__dirname, '..', 'assets', 'fonts', 'Anton-Regular.ttf'),
    path.join(process.cwd(), 'assets', 'fonts', 'Anton-Regular.ttf'),
];

const FONT_PATH = FONT_CANDIDATES.find((candidate) => fs.existsSync(candidate)) ?? FONT_CANDIDATES[0];
const FONT_FAMILY = 'Anton';

const fontOptions = {
    fontFiles: [FONT_PATH],
    loadSystemFonts: false,
    defaultFontFamily: FONT_FAMILY,
};

// Also used as the generation size — FLUX needs dimensions that are multiples of 16
export const CANVAS_SIZES: Record<string, { width: number; height: number }> = {
    '16:9': { width: 1280, height: 720 },
    '1:1': { width: 1024, height: 1024 },
    '9:16': { width: 720, height: 1280 },
};

// Highlight colour for the last line of the title, matched to the colour scheme
const ACCENT_COLORS: Record<string, string> = {
    vibrant: '#FFD60A',
    sunset: '#FF9F1C',
    forest: '#A3E635',
    neon: '#22D3EE',
    purple: '#E879F9',
    monochrome: '#FFFFFF',
    ocean: '#38BDF8',
    pastel: '#FBCFE8',
};

const escapeXml = (text: string) =>
    text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

// ── Text measurement ──────────────────────────────────────────────────────────

const REF_SIZE = 100;

// Width of `text` at REF_SIZE px, using the same renderer that draws it
function measure(text: string): number {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="6000" height="200"><text x="0" y="150" font-family="${FONT_FAMILY}" font-size="${REF_SIZE}">${escapeXml(text)}</text></svg>`;
    return new Resvg(svg, { font: fontOptions }).getBBox()?.width ?? 0;
}

const LINE_HEIGHT = 1.08;
// Below this the text stops being readable at thumbnail size, so give up on
// fitting everything and truncate instead (only reachable with absurd input —
// a 100-character title always fits well above it)
const FLOOR_SIZE = 24;

interface TitleBox {
    maxWidth: number;
    maxLines: number;
    maxBlockHeight: number; // keeps long titles from covering the whole image
    maxSize: number;
}

interface TitleLayout {
    fontSize: number;
    lines: string[];
}

/**
 * Picks the largest font size at which the whole title fits the box (greedy
 * word wrap). Long titles get more lines and a smaller font rather than being
 * cut off; truncation with an ellipsis is only a last resort.
 */
function layoutTitle(title: string, { maxWidth, maxLines, maxBlockHeight, maxSize }: TitleBox): TitleLayout {
    const words = title.toUpperCase().split(/\s+/).filter(Boolean);
    const wordWidths = words.map(measure);
    const spaceWidth = measure('H H') - measure('HH');

    const wrap = (fontSize: number) => {
        const scale = fontSize / REF_SIZE;
        const lines: string[] = [];
        let line: string[] = [];
        let lineWidth = 0;

        words.forEach((word, i) => {
            const width = wordWidths[i] * scale;
            const next = line.length ? lineWidth + spaceWidth * scale + width : width;
            if (line.length && next > maxWidth) {
                lines.push(line.join(' '));
                line = [word];
                lineWidth = width;
            } else {
                line.push(word);
                lineWidth = next;
            }
        });
        if (line.length) lines.push(line.join(' '));

        const widestWord = Math.max(...wordWidths) * scale;
        const fits =
            lines.length <= maxLines &&
            widestWord <= maxWidth &&
            lines.length * fontSize * LINE_HEIGHT <= maxBlockHeight;
        return { lines, fits };
    };

    for (let fontSize = maxSize; fontSize >= FLOOR_SIZE; fontSize -= 2) {
        const { lines, fits } = wrap(fontSize);
        if (fits) return { fontSize, lines };
    }

    const { lines } = wrap(FLOOR_SIZE);
    const kept = lines.slice(0, maxLines);
    if (lines.length > maxLines) kept[maxLines - 1] += '...';
    return { fontSize: FLOOR_SIZE, lines: kept };
}

// ── Composition ───────────────────────────────────────────────────────────────

const detectMime = (image: Buffer) => (image[0] === 0x89 && image[1] === 0x50 ? 'image/png' : 'image/jpeg');

export interface ComposeOptions {
    background: Buffer;
    aspect_ratio?: string;
    title?: string; // omit to skip the text overlay
    color_scheme?: string;
}

export function composeThumbnail({ background, aspect_ratio, title, color_scheme }: ComposeOptions): Buffer {
    const { width, height } = CANVAS_SIZES[aspect_ratio ?? '16:9'] ?? CANVAS_SIZES['16:9'];
    const isLandscape = width > height;

    const backgroundHref = `data:${detectMime(background)};base64,${background.toString('base64')}`;
    let overlay = '';

    if (title?.trim()) {
        // Landscape: text block on the left, vertically centred (the prompt asks
        // the model to keep the subject on the right). Square/portrait: text at
        // the bottom (subject kept in the upper part).
        const marginX = Math.round(width * (isLandscape ? 0.05 : 0.07));
        const bottomMargin = height * 0.07;
        const box: TitleBox = isLandscape
            ? { maxWidth: width * 0.52, maxLines: 5, maxBlockHeight: height * 0.8, maxSize: Math.round(height * 0.2) }
            : {
                  maxWidth: width * 0.86,
                  maxLines: aspect_ratio === '9:16' ? 6 : 5,
                  maxBlockHeight: height * (aspect_ratio === '9:16' ? 0.42 : 0.45),
                  maxSize: Math.round(width * 0.15),
              };

        const { fontSize, lines } = layoutTitle(title.trim(), box);
        const lineHeight = fontSize * LINE_HEIGHT;
        const blockHeight = lineHeight * lines.length;
        const top = isLandscape ? (height - blockHeight) / 2 : height - blockHeight - bottomMargin;
        const accent = ACCENT_COLORS[color_scheme ?? ''] ?? '#FFD60A';

        const textLines = lines
            .map((line, i) => {
                // Highlight the last line when there's more than one
                const fill = lines.length > 1 && i === lines.length - 1 ? accent : '#FFFFFF';
                const y = top + lineHeight * i + fontSize * 0.9;
                return `<text x="${marginX}" y="${y.toFixed(1)}" fill="${fill}">${escapeXml(line)}</text>`;
            })
            .join('');

        // Square/portrait: the bottom shade grows with the text block, so a
        // short title leaves more of the image untouched than a long quote
        const textTop = (height - top) / height; // text top, as a fraction up from the bottom
        const gradient = isLandscape
            ? `<linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.78"/><stop offset="0.62" stop-color="#000" stop-opacity="0"/></linearGradient>`
            : `<linearGradient id="shade" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.85"/><stop offset="${textTop.toFixed(3)}" stop-color="#000" stop-opacity="0.45"/><stop offset="${Math.min(1, textTop + 0.15).toFixed(3)}" stop-color="#000" stop-opacity="0"/></linearGradient>`;

        overlay = `
            <defs>
                ${gradient}
                <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
                    <feDropShadow dx="0" dy="${(fontSize * 0.05).toFixed(1)}" stdDeviation="${(fontSize * 0.06).toFixed(1)}" flood-color="#000" flood-opacity="0.65"/>
                </filter>
            </defs>
            <rect width="${width}" height="${height}" fill="url(#shade)"/>
            <g font-family="${FONT_FAMILY}" font-size="${fontSize}" stroke="#000" stroke-width="${(fontSize * 0.07).toFixed(1)}" stroke-linejoin="round" paint-order="stroke" filter="url(#shadow)">
                ${textLines}
            </g>`;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <image xlink:href="${backgroundHref}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>
        ${overlay}
    </svg>`;

    return new Resvg(svg, { font: fontOptions }).render().asPng();
}
