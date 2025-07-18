import axios from "axios";
import { Request, Response } from "express";
import { allowedExtensions, LineTransform, LineTransformEncode } from "../utils/line-transform";



function decodeBase64Url(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf-8');
}

export const m3u8EncodeProxy = async (req: Request, res: Response) => {
  try {
    const encodedUrl = req.query.url as string;
    if (!encodedUrl) return res.status(400).json({ error: 'Missing url parameter' });
    const url = decodeBase64Url(encodedUrl);

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
    delete headers['cache-control'];
    delete headers['expires'];
    delete headers['pragma'];
    delete headers['content-length'];

    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Headers"] = "*";
    headers["Access-Control-Allow-Methods"] = "*";
    res.set(headers);

    if (isStaticFiles) {
      return response.data.pipe(res);
    }
    if (!url.endsWith(".m3u8")) {
      return response.data.pipe(res);
    }
    const transform = new LineTransformEncode(baseUrl, referer, origin);
    response.data.pipe(transform).pipe(res);
  } catch (error: any) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};
