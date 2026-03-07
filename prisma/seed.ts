import { PrismaClient, UserRole, DepartmentType, ItemStatus, ProcessStatus, ItemType, RawMaterialStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Departments
  console.log('Creating departments...');
  const cardboard = await prisma.department.upsert({
    where: { id: 'dept-cardboard' },
    update: {},
    create: {
      id: 'dept-cardboard',
      name: 'Cardboard Department',
      type: DepartmentType.CARDBOARD,
    },
  });

  const manual = await prisma.department.upsert({
    where: { id: 'dept-manual' },
    update: {},
    create: {
      id: 'dept-manual',
      name: 'Manual Department',
      type: DepartmentType.MANUAL,
    },
  });

  const label = await prisma.department.upsert({
    where: { id: 'dept-label' },
    update: {},
    create: {
      id: 'dept-label',
      name: 'Label Department',
      type: DepartmentType.LABEL,
    },
  });

  const bookbind = await prisma.department.upsert({
    where: { id: 'dept-bookbind' },
    update: {},
    create: {
      id: 'dept-bookbind',
      name: 'Bookbind Department',
      type: DepartmentType.BOOKBIND,
    },
  });

  const other = await prisma.department.upsert({
    where: { id: 'dept-other' },
    update: {},
    create: {
      id: 'dept-other',
      name: 'Other Items',
      type: DepartmentType.OTHER_ITEMS,
    },
  });

  // Create Machines
  console.log('Creating machines...');
  const machines = [
    { name: 'TW102', type: 'Printing Press', departmentId: cardboard.id },
    { name: 'M1', type: 'Cutting Machine', departmentId: cardboard.id },
    { name: 'M2', type: 'Folding Machine', departmentId: cardboard.id },
    { name: 'M3', type: 'Gluing Machine', departmentId: cardboard.id },
    { name: 'M1', type: 'Stitching Machine', departmentId: manual.id },
    { name: 'M2', type: 'Manual Press', departmentId: manual.id },
    { name: 'M1', type: 'Label Printer', departmentId: label.id },
    { name: 'M2', type: 'Label Cutter', departmentId: label.id },
    { name: 'M1', type: 'Binding Machine', departmentId: bookbind.id },
    { name: 'M2', type: 'Perfect Binder', departmentId: bookbind.id },
  ];

  for (const machine of machines) {
    await prisma.machine.upsert({
      where: { id: `machine-${machine.departmentId}-${machine.name}` },
      update: {},
      create: {
        id: `machine-${machine.departmentId}-${machine.name}`,
        ...machine,
      },
    });
  }

  // Create Users
  console.log('Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@cpt.com' },
    update: {},
    create: {
      email: 'admin@cpt.com',
      name: 'Kendrick Rommel R. Alarcon',
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  });

  const lineLeader = await prisma.user.upsert({
    where: { email: 'lineleader@cpt.com' },
    update: {},
    create: {
      email: 'lineleader@cpt.com',
      name: 'Engr. Louie Di Ko Alam Name',
      password: hashedPassword,
      role: UserRole.EMPLOYEE,
      departmentId: cardboard.id,
    },
  });

  const encoder = await prisma.user.upsert({
    where: { email: 'encoder@cpt.com' },
    update: {},
    create: {
      email: 'encoder@cpt.com',
      name: 'Encoder User',
      password: hashedPassword,
      role: UserRole.ENCODER,
      departmentId: cardboard.id,
    },
  });

  const employee1 = await prisma.user.upsert({
    where: { email: 'employee1@cpt.com' },
    update: {},
    create: {
      email: 'employee1@cpt.com',
      name: 'John Dela Cruz',
      password: hashedPassword,
      role: UserRole.EMPLOYEE,
      departmentId: manual.id,
    },
  });

  const employee2 = await prisma.user.upsert({
    where: { email: 'employee2@cpt.com' },
    update: {},
    create: {
      email: 'employee2@cpt.com',
      name: 'Maria Santos',
      password: hashedPassword,
      role: UserRole.EMPLOYEE,
      departmentId: label.id,
    },
  });

  // Create Sample Items
  console.log('Creating sample items...');
  const item1 = await prisma.item.upsert({
    where: { itemNumber: '#ITEM1001' },
    update: {},
    create: {
      itemNumber: '#ITEM1001',
      name: 'Premium Box Package',
      type: ItemType.FOLDED,
      quantity: 10000,
      color: 'White',
      customer: 'ABC Corporation',
      targetOutput: 10500,
      currentOutput: 243,
      deadline: new Date('2026-01-15'),
      status: ItemStatus.IN_PROGRESS,
      rawMaterials: RawMaterialStatus.RELEASE_TO_PRODUCTION,
      departmentId: cardboard.id,
    },
  });

  const item2 = await prisma.item.upsert({
    where: { itemNumber: '#ITEM2001' },
    update: {},
    create: {
      itemNumber: '#ITEM2001',
      name: 'Product Labels',
      type: ItemType.SHEETED,
      quantity: 5000,
      color: 'Multi-color',
      customer: 'XYZ Inc',
      targetOutput: 5000,
      currentOutput: 1200,
      deadline: new Date('2026-02-10'),
      status: ItemStatus.IN_PROGRESS,
      rawMaterials: RawMaterialStatus.APPROVAL,
      departmentId: label.id,
    },
  });

  const item3 = await prisma.item.upsert({
    where: { itemNumber: '#ITEM3001' },
    update: {},
    create: {
      itemNumber: '#ITEM3001',
      name: 'Manual Booklet',
      type: ItemType.STITCHING,
      quantity: 2000,
      color: 'Black & White',
      customer: 'Tech Solutions',
      targetOutput: 2000,
      currentOutput: 0,
      deadline: new Date('2026-02-20'),
      status: ItemStatus.PENDING,
      rawMaterials: RawMaterialStatus.NOT_AVAILABLE,
      departmentId: manual.id,
    },
  });

  // Create Processes for Item 1
  console.log('Creating processes...');
  const machine1 = await prisma.machine.findFirst({
    where: { departmentId: cardboard.id, name: 'TW102' },
  });
  const machine2 = await prisma.machine.findFirst({
    where: { departmentId: cardboard.id, name: 'M1' },
  });

  // Item1 is FOLDED: Printing, Pre Fold, Trimming, Folding, Inspection
  const foldedProcesses = [
    { name: 'Printing', order: 1, status: ProcessStatus.COMPLETED, machineId: machine1?.id },
    { name: 'Pre Fold', order: 2, status: ProcessStatus.DELAYED, machineId: machine1?.id },
    { name: 'Trimming', order: 3, status: ProcessStatus.COMPLETED, machineId: machine2?.id },
    { name: 'Folding', order: 4, status: ProcessStatus.DELAYED, machineId: machine2?.id },
    { name: 'Inspection', order: 5, status: ProcessStatus.DELAYED, machineId: null },
  ];

  for (const proc of foldedProcesses) {
    await prisma.process.create({
      data: {
        ...proc,
        itemId: item1.id,
        assignedToId: lineLeader.id,
      },
    });
  }

  // Item2 is SHEETED: Printing, Pre Fold, Trimming, Inspection
  const sheetedProcesses = [
    { name: 'Printing', order: 1, status: ProcessStatus.COMPLETED },
    { name: 'Pre Fold', order: 2, status: ProcessStatus.COMPLETED },
    { name: 'Trimming', order: 3, status: ProcessStatus.IN_PROGRESS },
    { name: 'Inspection', order: 4, status: ProcessStatus.IN_PROGRESS },
  ];

  for (const proc of sheetedProcesses) {
    await prisma.process.create({
      data: {
        ...proc,
        itemId: item2.id,
        assignedToId: employee2.id,
      },
    });
  }

  // Item3 is STITCHING: Printing, Pre Fold, Trimming, Folding, Inspection, Stitching
  const stitchingProcesses = [
    { name: 'Printing', order: 1, status: ProcessStatus.NOT_STARTED },
    { name: 'Pre Fold', order: 2, status: ProcessStatus.NOT_STARTED },
    { name: 'Trimming', order: 3, status: ProcessStatus.NOT_STARTED },
    { name: 'Folding', order: 4, status: ProcessStatus.NOT_STARTED },
    { name: 'Inspection', order: 5, status: ProcessStatus.NOT_STARTED },
    { name: 'Stitching', order: 6, status: ProcessStatus.NOT_STARTED },
  ];

  for (const proc of stitchingProcesses) {
    await prisma.process.create({
      data: {
        ...proc,
        itemId: item3.id,
      },
    });
  }

  // Create Item Assignments
  console.log('Creating assignments...');
  await prisma.itemAssignment.create({
    data: {
      itemId: item1.id,
      userId: lineLeader.id,
    },
  });

  await prisma.itemAssignment.create({
    data: {
      itemId: item2.id,
      userId: employee2.id,
    },
  });

  // Create Sample Notes
  console.log('Creating notes...');
  await prisma.note.create({
    data: {
      content: 'Production started on schedule. Machine TW102 operating normally.',
      itemId: item1.id,
      userId: lineLeader.id,
    },
  });

  await prisma.note.create({
    data: {
      content: 'Material quality check passed. Proceeding to next process.',
      itemId: item2.id,
      userId: employee2.id,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📧 Test Accounts:');
  console.log('Admin: admin@cpt.com / password123');
  console.log('Line Leader: lineleader@cpt.com / password123');
  console.log('Encoder: encoder@cpt.com / password123');
  console.log('Employee: employee1@cpt.com / password123');
  console.log('Employee: employee2@cpt.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
