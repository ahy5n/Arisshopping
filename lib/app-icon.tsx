import { ImageResponse } from "next/og";

// The home-screen icon: the little hand-drawn heart from the wordmark, on lilac.
export function appIcon(size: number, rounded: boolean) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #ECE4F2 0%, #D9C9E8 100%)",
          borderRadius: rounded ? size * 0.22 : 0,
        }}
      >
        <svg width={size * 0.56} height={size * 0.56} viewBox="-0.5 -1.5 25 25">
          <path
            d="M12.1 20.3c-.4-.3-7.6-5-8.6-9.6C2.7 7.1 4.9 4.2 8 4.4c1.9.1 3.2 1.4 4 2.8.9-1.6 2.4-2.9 4.4-2.9 3.1.1 5 3.2 4 6.6-1.3 4.5-7.8 9-8.3 9.4z"
            fill="#8E6BAE"
            stroke="#2F2538"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          <path d="M21.4 1.2c.1 1.2.7 2 2.2 2.4-1.4.3-2 1-2.1 2.4-.2-1.4-.8-2.1-2.2-2.4 1.4-.3 2-1.1 2.1-2.4z" fill="#2F2538" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
