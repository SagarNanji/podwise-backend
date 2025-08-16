
import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../src/server";

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Express apps are valid Node handlers (req, res)
  return (app as any)(req, res);
}
