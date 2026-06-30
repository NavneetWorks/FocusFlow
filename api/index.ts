import type { Request, Response } from "express";

export default async function handler(req: Request, res: Response) {
  try {
    const { default: app } = await import("../server");
    const routePath = req.query.path;
    const normalizedPath = Array.isArray(routePath)
      ? routePath.join("/")
      : String(routePath || "");

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (key === "path" || value === undefined) continue;
      for (const item of Array.isArray(value) ? value : [value]) {
        searchParams.append(key, String(item));
      }
    }

    req.url = `/api/${normalizedPath}${searchParams.size ? `?${searchParams}` : ""}`;
    return app(req, res);
  } catch (error) {
    console.error("Failed to initialize FocusFlow API:", error);
    return res.status(500).json({
      error: "Failed to initialize FocusFlow API",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}
