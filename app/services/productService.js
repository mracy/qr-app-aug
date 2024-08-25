import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getProducts() {
  try {
    const products = await prisma.product.findMany();
    return products;
  } catch (e) {
    console.error('Error fetching products:', e);
    throw e;
  } finally {
    await prisma.$disconnect();
  }
}
