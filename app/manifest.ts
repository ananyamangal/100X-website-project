import type { MetadataRoute } from "next"
import { SITE_NAME, SITE_URL } from "@/lib/seo/site-config"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "100x",
    description:
      "Thermal fogging machine manufacturer and agricultural equipment supplier — 100x Circle, India.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#b91c1c",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/logo-main.png",
        sizes: "48x48",
        type: "image/png",
        purpose: "any",
      },
    ],
  }
}
