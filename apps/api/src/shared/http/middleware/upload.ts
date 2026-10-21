import multer from 'multer';
import { randomBytes } from 'node:crypto';
import { open, unlink } from 'node:fs/promises';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '@shared/errors/AppError';
import { storage } from '@shared/infra';

const productsDir = storage.absoluteDir('products');

/** The stored extension comes from the checked type, never from the client's file name. */
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const disk = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, productsDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${randomBytes(6).toString('hex')}${EXTENSIONS[file.mimetype]}`);
  },
});

const ALLOWED = new Set(Object.keys(EXTENSIONS));

export const productCoverUpload = multer({
  storage: disk,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      cb(new AppError('Only image files are allowed (jpeg, png, webp, gif)', 400));
      return;
    }
    cb(null, true);
  },
});

/** First bytes of each allowed format (the client-sent mimetype can lie). */
function matchesSignature(head: Buffer, mimetype: string): boolean {
  switch (mimetype) {
    case 'image/jpeg':
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case 'image/png':
      return head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/gif':
      return head.subarray(0, 4).toString('latin1') === 'GIF8';
    case 'image/webp':
      return head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP';
    default:
      return false;
  }
}

/** Runs after multer: deletes the upload unless its content really is the declared image type. */
export async function verifyImageUpload(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.file) return next();
  const head = Buffer.alloc(12);
  const handle = await open(req.file.path, 'r');
  try {
    await handle.read(head, 0, 12, 0);
  } finally {
    await handle.close();
  }
  if (!matchesSignature(head, req.file.mimetype)) {
    await unlink(req.file.path).catch(() => {});
    return next(new AppError('The file is not a valid image', 400));
  }
  next();
}
