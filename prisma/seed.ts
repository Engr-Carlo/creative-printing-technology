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
    { id: 'machine-manual-hp-01', name: 'HP-01', type: 'Printing Press', departmentId: manual.id },
    { id: 'machine-manual-hp-02', name: 'HP-02', type: 'Printing Press', departmentId: manual.id },
    { id: 'machine-manual-hp-03', name: 'HP-03', type: 'Printing Press', departmentId: manual.id },
    { id: 'machine-manual-hp-04', name: 'HP-04', type: 'Printing Press', departmentId: manual.id },
    { id: 'machine-manual-hp-05', name: 'HP-05', type: 'Printing Press', departmentId: manual.id },
    { id: 'machine-manual-hp-06', name: 'HP-06', type: 'Printing Press', departmentId: manual.id },
    { id: 'machine-manual-pc-01', name: 'PC-01', type: 'Cutting Machine', departmentId: manual.id },
    { id: 'machine-manual-mbo-01', name: 'MBO-01', type: 'Folding Machine', departmentId: manual.id },
    { id: 'machine-manual-mbo-02', name: 'MBO-02', type: 'Folding Machine', departmentId: manual.id },
    { id: 'machine-manual-mbo-03', name: 'MBO-03', type: 'Folding Machine', departmentId: manual.id },
    { id: 'machine-manual-mbo-04', name: 'MBO-04', type: 'Folding Machine', departmentId: manual.id },
    { id: 'machine-manual-mm-01', name: 'MM-01', type: 'Stitching Machine', departmentId: manual.id },
  ];

  for (const machine of machines) {
    await prisma.machine.upsert({
      where: { id: machine.id },
      update: {
        name: machine.name,
        type: machine.type,
        departmentId: machine.departmentId,
      },
      create: {
        ...machine,
      },
    });
  }

  // Create Users
  console.log('Creating users...');
  const hashedPassword = await bcrypt.hash('1234', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@cpt.com' },
    update: {
      name: 'Admin',
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
    create: {
      email: 'admin@cpt.com',
      name: 'Admin',
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  });

  const lineLeader = await prisma.user.upsert({
    where: { email: 'lineleader@cpt.com' },
    update: {
      name: 'Line Leader',
      password: hashedPassword,
      role: UserRole.EMPLOYEE,
      departmentId: manual.id,
    },
    create: {
      email: 'lineleader@cpt.com',
      name: 'Line Leader',
      password: hashedPassword,
      role: UserRole.EMPLOYEE,
      departmentId: manual.id,
    },
  });

  const encoder = await prisma.user.upsert({
    where: { email: 'encoder@cpt.com' },
    update: {
      name: 'Encoder',
      password: hashedPassword,
      role: UserRole.ENCODER,
    },
    create: {
      email: 'encoder@cpt.com',
      name: 'Encoder',
      password: hashedPassword,
      role: UserRole.ENCODER,
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
      departmentId: manual.id,
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
      rawMaterials: RawMaterialStatus.AVAILABLE,
      departmentId: manual.id,
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
      rawMaterials: RawMaterialStatus.NOT_SUFFICIENT,
      departmentId: manual.id,
    },
  });

  // Create Processes for Item 1
  console.log('Creating processes...');
  const machineR1 = await prisma.machine.findFirst({
    where: { departmentId: manual.id, name: 'HP-01' },
  });
  const machineR2 = await prisma.machine.findFirst({
    where: { departmentId: manual.id, name: 'HP-02' },
  });
  const machineR3 = await prisma.machine.findFirst({
    where: { departmentId: manual.id, name: 'HP-03' },
  });
  const machinePolarCutter = await prisma.machine.findFirst({
    where: { departmentId: manual.id, name: 'PC-01' },
  });
  const machineMB01 = await prisma.machine.findFirst({
    where: { departmentId: manual.id, name: 'MBO-01' },
  });
  const machineMB02 = await prisma.machine.findFirst({
    where: { departmentId: manual.id, name: 'MBO-02' },
  });
  const machineMullerMartini = await prisma.machine.findFirst({
    where: { departmentId: manual.id, name: 'MM-01' },
  });

  // Item1 is FOLDED: Printing → Pre-Fold/Inspection → Trimming → Folding → Inspection
  const foldedProcesses = [
    { name: 'Printing', order: 1, status: ProcessStatus.COMPLETED, machineId: machineR1?.id },
    { name: 'Pre-Fold/Inspection', order: 2, status: ProcessStatus.DELAYED, machineId: undefined },
    { name: 'Trimming', order: 3, status: ProcessStatus.COMPLETED, machineId: machinePolarCutter?.id },
    { name: 'Folding', order: 4, status: ProcessStatus.DELAYED, machineId: machineMB01?.id },
    { name: 'Inspection', order: 5, status: ProcessStatus.DELAYED, machineId: undefined },
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

  // Item2 is SHEETED: Printing → Pre-Fold/Inspection → Trimming → Inspection
  const sheetedProcesses = [
    { name: 'Printing', order: 1, status: ProcessStatus.COMPLETED, machineId: machineR2?.id },
    { name: 'Pre-Fold/Inspection', order: 2, status: ProcessStatus.COMPLETED, machineId: undefined },
    { name: 'Trimming', order: 3, status: ProcessStatus.IN_PROGRESS, machineId: machinePolarCutter?.id },
    { name: 'Inspection', order: 4, status: ProcessStatus.IN_PROGRESS, machineId: undefined },
  ];

  for (const proc of sheetedProcesses) {
    await prisma.process.create({
      data: {
        ...proc,
        itemId: item2.id,
        assignedToId: lineLeader.id,
      },
    });
  }

  // Item3 is STITCHING: Printing → Pre-Fold/Inspection → Trimming → Folding → Stitching → Inspection
  const stitchingProcesses = [
    { name: 'Printing', order: 1, status: ProcessStatus.NOT_STARTED, machineId: machineR3?.id },
    { name: 'Pre-Fold/Inspection', order: 2, status: ProcessStatus.NOT_STARTED, machineId: undefined },
    { name: 'Trimming', order: 3, status: ProcessStatus.NOT_STARTED, machineId: machinePolarCutter?.id },
    { name: 'Folding', order: 4, status: ProcessStatus.NOT_STARTED, machineId: machineMB02?.id },
    { name: 'Stitching', order: 5, status: ProcessStatus.NOT_STARTED, machineId: machineMullerMartini?.id },
    { name: 'Inspection', order: 6, status: ProcessStatus.NOT_STARTED, machineId: undefined },
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
      userId: lineLeader.id,
    },
  });

  // Create Sample Notes
  console.log('Creating notes...');
  await prisma.note.create({
    data: {
      content: 'Production started on schedule. Machine HP-01 operating normally.',
      itemId: item1.id,
      userId: lineLeader.id,
    },
  });

  await prisma.note.create({
    data: {
      content: 'Material quality check passed. Proceeding to next process.',
      itemId: item2.id,
      userId: lineLeader.id,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📧 Test Accounts:');
  console.log('Admin: admin@cpt.com / 1234');
  console.log('Line Leader: lineleader@cpt.com / 1234');
  console.log('Encoder: encoder@cpt.com / 1234');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
