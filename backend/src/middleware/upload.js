import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config.js';
import { AppError } from '../utils/errors.js';

const extensions = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    try { fs.mkdirSync(config.uploadDir, { recursive: true }); callback(null, config.uploadDir); }
    catch (error) { callback(error); }
  },
  filename: (req, file, callback) => callback(null, `${crypto.randomUUID()}${extensions[file.mimetype] ?? ''}`)
});

export const uploadLogo = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => extensions[file.mimetype]
    ? callback(null, true) : callback(new AppError(400, 'Logo must be PNG, JPEG, or WEBP'))
}).single('logo');

export function verifyUploadedLogo(req, res, next) {
  if (!req.file) return next();
  const bytes = fs.readFileSync(req.file.path).subarray(0, 12);
  const hex = bytes.toString('hex');
  const valid = hex.startsWith('89504e470d0a1a0a') || hex.startsWith('ffd8ff') ||
    (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP');
  if (!valid) {
    fs.rmSync(req.file.path, { force: true });
    return next(new AppError(400, 'Uploaded file content is not a supported image'));
  }
  next();
}
