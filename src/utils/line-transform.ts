import { Transform, TransformCallback } from 'stream';

export const allowedExtensions = ['.ts', '.png', '.jpg', '.webp', '.ico', '.html', '.js', '.css', '.txt'];

export class LineTransform extends Transform {
  private buffer: string;
  private baseUrl: string;
  private ref: string;
  private orgin: string;

  constructor(baseUrl: string, ref: string = '', orgin: string = '') {
    super();
    this.buffer = '';
    this.baseUrl = baseUrl;
    this.ref = ref;
    this.orgin = orgin;
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback) {
    const data = this.buffer + chunk.toString();
    const lines = data.split(/\r?\n/);
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const modifiedLine = this.processLine(line);
      this.push(modifiedLine + '\n');
    }

    callback();
  }

  _flush(callback: TransformCallback) {
    if (this.buffer) {
      const modifiedLine = this.processLine(this.buffer);
      this.push(modifiedLine);
    }
    callback();
  }

  private processLine(line: string): string {
    const params = [];
    if (this.ref) params.push(`ref=${encodeURIComponent(this.ref)}`);
    if (this.orgin) params.push(`orgin=${encodeURIComponent(this.orgin)}`);
    const paramStr = params.length ? `&${params.join('&')}` : '';

    if (line.endsWith('.m3u8') || line.endsWith('.ts')) {
      return `m3u8-proxy?url=${this.baseUrl}${line}${paramStr}`;
    }

    if (line.startsWith("http") && !line.endsWith(".m3u8")) {
      return `m3u8-proxy?url=${encodeURIComponent(line)}${paramStr}`;
    }

    if (allowedExtensions.some(ext => line.endsWith(ext))) {
      return `m3u8-proxy?url=${line}${paramStr}`;
    }

    return line;
  }
}

export class LineTransformEncode extends Transform {
  private buffer: string;
  private baseUrl: string;
  private ref: string;
  private orgin: string;

  constructor(baseUrl: string, ref: string = '', orgin: string = '') {
    super();
    this.buffer = '';
    this.baseUrl = baseUrl;
    this.ref = ref;
    this.orgin = orgin;
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback) {
    const data = this.buffer + chunk.toString();
    const lines = data.split(/\r?\n/);
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const modifiedLine = this.processLine(line);
      this.push(modifiedLine + '\n');
    }

    callback();
  }

  _flush(callback: TransformCallback) {
    if (this.buffer) {
      const modifiedLine = this.processLine(this.buffer);
      this.push(modifiedLine);
    }
    callback();
  }

  private encodeBase64Url(str: string): string {
    let encoded = Buffer.from(str, 'utf-8').toString('base64');
    encoded = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return encoded;
  }

  private processLine(line: string): string {
    const params = [];
    if (this.ref) params.push(`ref=${encodeURIComponent(this.ref)}`);
    if (this.orgin) params.push(`orgin=${encodeURIComponent(this.orgin)}`);
    const paramStr = params.length ? `&${params.join('&')}` : '';

    if (line.endsWith('.m3u8') || line.endsWith('.ts')) {
      const encodedUrl = this.encodeBase64Url(this.baseUrl + line);
      return `m3u8-encode?url=${encodedUrl}${paramStr}`;
    }

    if (line.startsWith('http') && !line.endsWith('.m3u8')) {
      const encodedUrl = this.encodeBase64Url(line);
      return `m3u8-encode?url=${encodedUrl}${paramStr}`;
    }

    if (allowedExtensions.some(ext => line.endsWith(ext))) {
      const encodedUrl = this.encodeBase64Url(line);
      return `m3u8-encode?url=${encodedUrl}${paramStr}`;
    }

    return line;
  }
}
