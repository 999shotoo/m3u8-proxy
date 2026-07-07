import axios from "axios";
import { Request, Response } from "express";
import { allowedExtensions, LineTransform } from "../utils/line-transform";

export const m3u8Proxy = async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;
    if (!url) return res.status(400).json("url is required");

    const referer = (req.query.ref as string) || "http://localhost/";
    const origin = (req.query.orgin as string) || "http://localhost";
    const isStaticFile = allowedExtensions.some(ext => url.endsWith(ext));
    const isM3u8 = url.endsWith(".m3u8");
    const baseUrl = url.replace(/[^/]+$/, "");
    const userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";

    const forwardHeaders: Record<string, string> = {
      Accept: "*/*",
      Referer: referer,
      Origin: origin,
      "User-Agent": userAgent
    };

    // Forward Range header so mp4/ts/etc support seeking (206 Partial Content)
    if (req.headers.range) {
      forwardHeaders["Range"] = req.headers.range as string;
    }

    const response = await axios.get(url, {
      responseType: "stream",
      headers: forwardHeaders,
      validateStatus: status => status < 400 // allow 206/304 etc through
    });

    const headers = { ...response.headers };
    delete headers["cache-control"];
    delete headers["expires"];
    delete headers["pragma"];

    // Only strip content-length when we're rewriting the body (m3u8 transform)
    if (isM3u8) {
      delete headers["content-length"];
    }

    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Headers"] = "*";
    headers["Access-Control-Allow-Methods"] = "*";
    headers["Accept-Ranges"] = "bytes";

    res.status(response.status);
    res.set(headers);

    // Static files (mp4, ts, images, etc.) and any non-m3u8 content: just pipe
    if (isStaticFile || !isM3u8) {
      return response.data.pipe(res);
    }

    // m3u8 playlists: rewrite lines as they stream through
    const transform = new LineTransform(baseUrl, referer, origin);
    response.data.pipe(transform).pipe(res);
  } catch (error: any) {
    console.log(error.message);
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error");
    }
  }
};
