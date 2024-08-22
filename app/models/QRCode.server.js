import qrcode from "qrcode";
import invariant from "tiny-invariant";
import db from "../db.server";  // Assuming db.server.js exports Prisma client
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createQRCode(data) {
  console.log('Creating QR code with data:', data);
  try {
    const qrCode = await prisma.qRCode.create({
      data: {
        title: data.title,
        shop: data.shop,
        productId: data.productId,
        productHandle: data.productHandle,
        productVariantId: data.productVariantId,
        destination: data.destination,
        scans: data.scans || 0,
        createdAt: new Date(),
      },
    });
    console.log('QR code created:', qrCode);
    return qrCode;
  } catch (error) {
    console.error('Error creating QR code:', error);
    throw error;
  }
}

export async function getQRCode(id, graphql) {
  console.log('Fetching QR code with id:', id);
  try {
    const qrCode = await db.qRCode.findFirst({ where: { id } });
    if (!qrCode) {
      console.log('QR code not found');
      return null;
    }
    return await supplementQRCode(qrCode, graphql);
  } catch (error) {
    console.error('Error fetching QR code:', error);
    throw error;
  }
}

export async function getQRCodes(shop, graphql) {
  console.log('Fetching QR codes for shop:', shop);
  try {
    const qrCodes = await db.qRCode.findMany({
      where: { shop },
      orderBy: { id: "desc" },
    });
    if (qrCodes.length === 0) {
      console.log('No QR codes found');
      return [];
    }
    return Promise.all(
      qrCodes.map((qrCode) => supplementQRCode(qrCode, graphql))
    );
  } catch (error) {
    console.error('Error fetching QR codes:', error);
    throw error;
  }
}

export function getQRCodeImage(id) {
  const url = new URL(`/qrcodes/${id}/scan`, process.env.SHOPIFY_APP_URL);
  return qrcode.toDataURL(url.href);
}

export function getDestinationUrl(qrCode) {
  if (qrCode.destination === "product") {
    return `https://${qrCode.shop}/products/${qrCode.productHandle}`;
  }

  const match = /gid:\/\/shopify\/ProductVariant\/([0-9]+)/.exec(qrCode.productVariantId);
  invariant(match, "Unrecognized product variant ID");

  return `https://${qrCode.shop}/cart/${match[1]}:1`;
}

async function supplementQRCode(qrCode, graphql) {
  try {
    const qrCodeImagePromise = getQRCodeImage(qrCode.id);

    const response = await graphql(
      `
        query supplementQRCode($id: ID!) {
          product(id: $id) {
            title
            images(first: 1) {
              nodes {
                altText
                url
              }
            }
          }
        }
      `,
      {
        variables: {
          id: qrCode.productId,
        },
      }
    );

    const {
      data: { product },
    } = await response.json();

    return {
      ...qrCode,
      productDeleted: !product?.title,
      productTitle: product?.title,
      productImage: product?.images?.nodes[0]?.url,
      productAlt: product?.images?.nodes[0]?.altText,
      destinationUrl: getDestinationUrl(qrCode),
      image: await qrCodeImagePromise,
    };
  } catch (error) {
    console.error('Error supplementing QR code:', error);
    throw error;
  }
}

export function validateQRCode(data) {
  const errors = {};

  if (!data.title) {
    errors.title = "Title is required";
  }

  if (!data.productId) {
    errors.productId = "Product is required";
  }

  if (!data.destination) {
    errors.destination = "Destination is required";
  }

  if (Object.keys(errors).length) {
    return errors;
  }
}
