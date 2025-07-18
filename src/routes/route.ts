import express, { Request, Response } from 'express';
import { m3u8Proxy } from '../controllers/m3u8-proxy';
import { vttProxy } from '../controllers/vtt-proxy';
import { m3u8EncodeProxy } from '../controllers/m3u8-encode';

export const router = express.Router();

router.get('/m3u8-proxy', m3u8Proxy);
router.get('/vtt-proxy', (req, res) => { vttProxy(req, res); });
router.get('/m3u8-encode', (req, res) => { m3u8EncodeProxy(req, res); });