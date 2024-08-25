// prisma/migrations/add-qrcode-table.js

async function addQRCodeTable() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Example of adding a QRCode collection
    await prisma.$executeRaw`db.createCollection('QRCode')`;
    console.log('QRCode table created successfully.');
  } catch (error) {
    console.error('Error creating QRCode table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addQRCodeTable();
