export default function handler(_request: unknown, response: any) {
  return response.status(200).json({ status: "ok", runtime: "vercel" });
}
