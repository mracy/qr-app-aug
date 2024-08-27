import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createProduct(data) {
  console.log('Creating product with data:', data); // Log input data for debugging

  try {
    const product = await prisma.product.create({
      data: {
        title: data.title,
        totalQuantity: data.totalQuantity || 0, // Use default if not provided
        variants: {
          create: data.variants.map(variant => ({
            title: variant.title,
            inventoryQuantity: variant.inventoryQuantity,
            image: variant.image ? {
              create: {
                url: variant.image.url,
                altText: variant.image.altText,
              },
            } : undefined,
          })),
        },
        images: {
          create: data.images.map(image => ({
            url: image.url,
            altText: image.altText,
          })),
        },
      },
    });

    console.log('Created product:', product); // Log the created product

    return product;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
