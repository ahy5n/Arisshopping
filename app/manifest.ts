import type { MetadataRoute } from "next";

// Lets Ari add it to her home screen and open it full-screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ari's shopping",
    short_name: "ari's",
    description: "Every UK shop, one search.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBF8FC",
    theme_color: "#FBF8FC",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
