import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/quant-dashboard/",
    },
    sitemap: "https://alexszapiro.com/sitemap.xml",
  };
}
