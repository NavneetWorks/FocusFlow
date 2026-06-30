import type { Request, Response } from "express";
import app from "../server";

export default function handler(req: Request, res: Response) {
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
}
