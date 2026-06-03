import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import admin from 'firebase-admin';
import { ensureFirebase } from '../config/firebase';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

export const uploadMiddleware = upload.single('image');

export const uploadImage = (req: Request, res: Response, next: NextFunction) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) { res.status(400).json({ message: err.message }); return; }
    if (!req.file) { res.status(400).json({ message: 'No file uploaded' }); return; }

    try {
      ensureFirebase();
      const ext = path.extname(req.file.originalname);
      const filename = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

      const fileRef = admin.storage().bucket().file(filename);
      await fileRef.save(req.file.buffer, { metadata: { contentType: req.file.mimetype } });
      await fileRef.makePublic();

      res.json({ url: fileRef.publicUrl() });
    } catch (e) {
      next(e);
    }
  });
};
