import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { buildCodeDocContent, buildWhiteboardDocContent } from '../src/utils/docContent.js';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@syncspace.dev';
  const password = 'demo1234';

  console.log('[seed] creating demo user...');
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Demo User',
      passwordHash: await hash(password, 12),
    },
  });

  console.log('[seed] creating "Demo Workspace"...');
  const existing = await prisma.workspace.findFirst({
    where: { name: 'Demo Workspace' },
  });
  const workspace =
    existing ??
    (await prisma.workspace.create({
      data: { name: 'Demo Workspace', ownerId: user.id },
    }));

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: user.id, role: 'OWNER' },
  });

  const existingDocs = await prisma.document.count({ where: { workspaceId: workspace.id } });
  if (existingDocs === 0) {
    console.log('[seed] creating starter documents...');
    await prisma.document.createMany({
      data: [
        {
          title: 'Starter Code (TypeScript)',
          type: 'CODE',
          workspaceId: workspace.id,
          ownerId: user.id,
          content: buildCodeDocContent(),
        },
        {
          title: 'Team Whiteboard',
          type: 'WHITEBOARD',
          workspaceId: workspace.id,
          ownerId: user.id,
          content: buildWhiteboardDocContent(),
        },
      ],
    });
  }

  console.log('');
  console.log('Seed complete. Log in with:');
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
}

main()
  .catch((error) => {
    console.error('[seed] failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });