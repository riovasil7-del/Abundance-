import type { MetadataRoute } from "next";
import { APP_NAME } from "@/config/app";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Sme z jednej matky a jedného Boha.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6efe6",
    theme_color: "#f6efe6",
    lang: "sk",
    icons: [
      { src: "/mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
