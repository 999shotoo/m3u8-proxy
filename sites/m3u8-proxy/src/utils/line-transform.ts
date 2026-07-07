import { Transform, TransformCallback } from 'stream';

export const allowedExtensions = [
  '.ts', '.png', '.jpg', '.jpeg', '.webp', '.ico',
  '.html', '.js', '.css', '.txt', '.mp4', '.m4s', '.aac', '.vtt'
];

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
      this.push(this.processLine(line) + '\n');
    }
    callback();
  }

  _flush(callback: TransformCallback) {
    if (this.buffer) {
      this.push(this.processLine(this.buffer));
    }
    callback();
  }

  private buildQuery(): string {
    const params: string[] = [];
    if (this.ref) params.push(`ref=${encodeURIComponent(this.ref)}`);
    if (this.orgin) params.push(`orgin=${encodeURIComponent(this.orgin)}`);
    return params.length ? `&${params.join('&')}` : '';
  }

  private processLine(line: string): string {
    const trimmed = line.trim();

    // Pass through comments, tags, and blank lines untouched
    if (!trimmed || trimmed.startsWith('#')) {
      return line;
    }

    const isPlayableLine =
      trimmed.endsWith('.m3u8') ||
      trimmed.endsWith('.ts') ||
      allowedExtensions.some(ext => trimmed.endsWith(ext));

    if (!isPlayableLine) {
      return line;
    }

    // Resolve relative vs absolute correctly (handles ../, protocol-relative, absolute, relative)
    let resolvedUrl: string;
    try {
      resolvedUrl = new URL(trimmed, this.baseUrl).toString();
    } catch {
      resolvedUrl = trimmed;
    }

    return `m3u8-proxy?url=${encodeURIComponent(resolvedUrl)}${this.buildQuery()}`;
  }
}

// --- LineTransformEncode (base64-url variant) ---
export class LineTransformEncode extends Transform {
  private buffer: string;
  private playlistUrl: string;
  private ref: string;
  private orgin: string;

  constructor(playlistUrl: string, ref: string = '', orgin: string = '') {
    super();
    this.buffer = '';
    this.playlistUrl = playlistUrl;
    this.ref = ref;
    this.orgin = orgin;
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback) {
    const data = this.buffer + chunk.toString();
    const lines = data.split(/\r?\n/);
    this.buffer = lines.pop() || '';
    for (const line of lines) {
      this.push(this.processLine(line) + '\n');
    }
    callback();
  }

  _flush(callback: TransformCallback) {
    if (this.buffer) {
      this.push(this.processLine(this.buffer));
    }
    callback();
  }

  private encodeBase64Url(str: string): string {
    return Buffer.from(str, 'utf-8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private buildQuery(): string {
    const params: string[] = [];
    if (this.ref) params.push(`ref=${encodeURIComponent(this.ref)}`);
    if (this.orgin) params.push(`orgin=${encodeURIComponent(this.orgin)}`);
    return params.length ? `&${params.join('&')}` : '';
  }

  private processLine(line: string): string {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      return line;
    }

    const isPlayableLine =
      trimmed.endsWith('.m3u8') ||
      trimmed.endsWith('.ts') ||
      allowedExtensions.some(ext => trimmed.endsWith(ext)) ||
      trimmed.startsWith('http');

    if (!isPlayableLine) {
      return line;
    }

    let resolvedUrl: string;
    try {
      resolvedUrl = new URL(trimmed, this.playlistUrl).toString();
    } catch {
      resolvedUrl = trimmed;
    }

    const encodedUrl = this.encodeBase64Url(resolvedUrl);
    return `m3u8-encode?url=${encodedUrl}${this.buildQuery()}`;
  }
}
