import { Router } from 'express';
import * as ctrl from '../controllers/workspace.controller.js';
import { validate } from '../middleware/validate.js';
import {
  addMemberSchema,
  createWorkspaceSchema,
  memberRoleSchema,
} from '../services/workspace.service.js';

const router = Router();

router.get('/', ctrl.list);
router.post('/', validate({ body: createWorkspaceSchema }), ctrl.create);
router.get('/:workspaceId', ctrl.get);
router.delete('/:workspaceId', ctrl.remove);

router.post('/:workspaceId/members', validate({ body: addMemberSchema }), ctrl.addMember);
router.patch(
  '/:workspaceId/members/:memberId',
  validate({ body: memberRoleSchema }),
  ctrl.updateRole
);
router.delete('/:workspaceId/members/:memberId', ctrl.removeMember);

export default router;
