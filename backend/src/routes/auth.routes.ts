import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../services/auth.service.js';

const router = Router();

router.post('/register', validate({ body: registerSchema }), ctrl.register);
router.post('/login', validate({ body: loginSchema }), ctrl.login);
router.get('/me', authenticate, ctrl.me);

export default router;