import express from 'express';
import { m3u8Proxy } from '../controllers/m3u8-proxy';

export const router = express.Router();

router.get('/m3u8-proxy', m3u8Proxy);