import axios from "axios";
import { Request, Response } from "express";
import { allowedExtensions, LineTransform } from "../utils/line-transform";

export const m3u8Proxy = async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;
    if (!url) return res.status(400).json("url is required");

    // Get custom params from the query string
    const referer = (req.query.ref as string) || "http://localhost/";
    const origin = (req.query.orgin as string) || "http://localhost";

    const isStaticFiles = allowedExtensions.some(ext => url.endsWith(ext));
    const baseUrl = url.replace(/[^/]+$/, "");

    const response = await axios.get(url, {
      responseType: 'stream',
      headers: {
        Accept: "*/*",
        Referer: referer,
        Origin: origin
      }
    });

    const headers = { ...response.headers };
    // Remove cache-related headers
    delete headers['cache-control'];
    delete headers['expires'];
    delete headers['pragma'];
    delete headers['content-length'];

    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Headers"] = "*";
    headers["Access-Control-Allow-Methods"] = "*";
    res.set(headers);

    // For static files, just pipe
    if (isStaticFiles) {
      return response.data.pipe(res);
    }

    // For non-m3u8 files, just pipe
    if (!url.endsWith(".m3u8")) {
      return response.data.pipe(res);
    }

    // For m3u8 playlists (including live), stream and transform lines as they arrive
    const transform = new LineTransform(baseUrl, referer, origin);
    response.data.pipe(transform).pipe(res);
  } catch (error: any) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
}
