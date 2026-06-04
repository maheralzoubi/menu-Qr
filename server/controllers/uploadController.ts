import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

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
  uploadMiddleware(req, res, (err) => {
    if (err) { res.status(400).json({ message: err.message }); return; }
    if (!req.file) { res.status(400).json({ message: 'No file uploaded' }); return; }

    const url = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    res.json({ url });
  });
};
