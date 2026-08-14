import { Router } from 'express';
import * as ctrl from '../controllers/room.controller.js';
import { validate } from '../middleware/validate.js';
import { createRoomSchema, joinRoomSchema, roomIdSchema } from '../services/room.service.js';

const router = Router();

router.get('/', ctrl.list);
router.post('/', validate({ body: createRoomSchema }), ctrl.create);
router.get('/:roomId', validate({ params: roomIdSchema }), ctrl.get);
router.post('/:code/join', validate({ params: joinRoomSchema }), ctrl.join);
router.delete('/:roomId/leave', validate({ params: roomIdSchema }), ctrl.leave);

export default router;
