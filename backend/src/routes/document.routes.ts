import { Router } from 'express';
import * as ctrl from '../controllers/document.controller.js';
import { validate } from '../middleware/validate.js';
import { createDocumentSchema, updateDocumentSchema } from '../services/document.service.js';

const router = Router();

router.get('/', ctrl.list);
router.post('/', validate({ body: createDocumentSchema }), ctrl.create);
router.get('/:documentId', ctrl.get);
router.patch('/:documentId', validate({ body: updateDocumentSchema }), ctrl.update);
router.delete('/:documentId', ctrl.remove);

export default router;
