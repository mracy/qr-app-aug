const { PrismaClient } = require('@prisma/client');
const { ObjectId } = require('mongodb'); // Required for generating valid ObjectIds

const prisma = new PrismaClient();

async function main() {
  try {
    // Create a new Session
    let session = await prisma.session.findUnique({
      where: { id: 'session1' }
    });

    if (!session) {
      session = await prisma.session.create({
        data: {
          id: 'session1',
          shop: 'myshop',
          state: 'active',
          isOnline: true,
          accessToken: 'someAccessToken',
          userId: BigInt('123456789'),
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          accountOwner: true,
          locale: 'en-US',
          emailVerified: true,
        },
      });
      console.log('Created session:', session);
    } else {
      console.log('Session already exists:', session);
    }

    // Create a new QRCode
    const qrCodeId = new ObjectId().toString(); // Generate a valid ObjectId
    let qrCode = await prisma.qRCode.findUnique({
      where: { id: qrCodeId }
    });

    if (!qrCode) {
      qrCode = await prisma.qRCode.create({
        data: {
          id: qrCodeId,
          title: 'My QR Code',
          shop: 'myshop',
          productId: 'prod123',
          productTitle: 'Product Title',
          productImage: 'https://example.com/product.jpg',
          productHandle: 'my-product',
          productVariantId: 'variant123',
          destination: 'https://example.com',
        },
      });
      console.log('Created QRCode:', qrCode);
    } else {
      console.log('QRCode already exists:', qrCode);
    }

    // Create a new Product with variants and images
    let product = await prisma.product.findUnique({
      where: { productId: 'prod123' }
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          productId: 'prod123',
          title: 'Sample Product',
          variants: {
            create: [
              {
                shopifyGID: 'gid123',
                productId: 'prod123', // Ensure this field matches your schema
                title: 'Variant 1',
                inventoryQuantity: 100,
                imageUrl: 'https://example.com/image1.jpg',
                imageAlt: 'Image 1 Alt Text',
              },
            ],
          },
          images: {
            create: [
              {
                shopifyGID: 'gid456',
                productId: 'prod123', // Ensure this field matches your schema
                src: 'https://example.com/image1.jpg',
                altText: 'Image 1 Alt Text',
              },
            ],
          },
        },
      });

      console.log('Created Product:', product);
    } else {
      console.log('Product already exists:', product);
    }

    // Create a new Customer
    let customer = await prisma.customer.findUnique({
      where: { shopCustomerId: 'cust123' }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          shopId: 'shop123',
          shopCustomerId: 'cust123',
          displayName: 'Jane Doe',
          email: 'jane.doe@example.com',
          phone: '123-456-7890',
          addresses: '123 Main St',
          totalSpent: 200.0,
        },
      });
      console.log('Created Customer:', customer);
    } else {
      console.log('Customer already exists:', customer);
    }

  } catch (error) {
    console.error('Error creating data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
