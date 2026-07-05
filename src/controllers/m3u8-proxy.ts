import axios from "axios";
import { Request, Response } from "express";
import { allowedExtensions, LineTransform } from "../utils/line-transform";

export const m3u8Proxy = async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;
    if (!url) return res.status(400).json("url is required");

    const referer = (req.query.ref as string) || "http://localhost/";
    const origin = (req.query.orgin as string) || "http://localhost";
    const isStaticFiles = allowedExtensions.some(ext => url.endsWith(ext));
    const baseUrl = url.replace(/[^/]+$/, "");
    const userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";

    // Forward Range header so mp4 (and other static files) support seeking
    const forwardHeaders: Record<string, string> = {
      Accept: "*/*",
      Referer: referer,
      Origin: origin,
      "User-Agent": userAgent
    };
    if (req.headers.range) {
      forwardHeaders["Range"] = req.headers.range as string;
    }

    const response = await axios.get(url, {
      responseType: "stream",
      headers: forwardHeaders,
      // Don't let axios throw on 206/416 etc.
      validateStatus: status => status < 400
    });

    const headers = { ...response.headers };
    delete headers["cache-control"];
    delete headers["expires"];
    delete headers["pragma"];

    // Only strip content-length when we're about to transform the body (m3u8).
    // For mp4/static files we want to keep it (and content-range) intact.
    const willTransform = !isStaticFiles && url.endsWith(".m3u8");
    if (willTransform) {
      delete headers["content-length"];
    }

    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Headers"] = "*";
    headers["Access-Control-Allow-Methods"] = "*";
    headers["Accept-Ranges"] = "bytes";

    // Preserve the upstream status code (200 or 206)
    res.status(response.status);
    res.set(headers);

    if (isStaticFiles || !url.endsWith(".m3u8")) {
      return response.data.pipe(res);
    }

    const transform = new LineTransform(baseUrl, referer, origin);
    response.data.pipe(transform).pipe(res);
  } catch (error: any) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};
