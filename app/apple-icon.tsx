import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
    width: 180,
    height: 180,
};
export const contentType = 'image/png';

// Image generation
export default function AppleIcon() {
    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    fontSize: 120,
                    background: 'linear-gradient(to bottom right, #2563eb, #4f46e5)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    borderRadius: '40px',
                    fontWeight: 800,
                    fontFamily: 'sans-serif',
                }}
            >
                C
            </div>
        ),
        // ImageResponse options
        {
            ...size,
        }
    );
}
