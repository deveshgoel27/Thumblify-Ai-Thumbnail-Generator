import express from 'express';
import { generateThumbnail, deleteThumbnail } from '../controllers/ThumbnailController';
import protect from '../middleware/auth';

const ThumbnailRouter = express.Router();

ThumbnailRouter.post('/generate',protect, generateThumbnail);
ThumbnailRouter.delete('/delete/:id',protect, deleteThumbnail)

export default ThumbnailRouter;