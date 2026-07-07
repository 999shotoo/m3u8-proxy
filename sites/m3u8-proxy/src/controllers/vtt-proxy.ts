
import axios from 'axios';
import { Request, Response } from 'express';

export const vttProxy =  async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ error: "url is required" });

    // Get custom params from the query string
    const referer = (req.query.ref as string) || "http://localhost/";
    const origin = (req.query.orgin as string) || "http://localhost";

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
    headers["Content-Type"] = "text/vtt";
    res.set(headers);

    response.data.pipe(res);
  } catch (error: any) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
}
