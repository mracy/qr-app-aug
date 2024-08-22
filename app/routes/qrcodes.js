// routes/qrcodes.js

import { createQRCode } from '../models/QRCode.server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function handleQRCodeScan(req, res) {
  try {
    const { title, shop, productId, productHandle, productVariantId, destination } = req.body;

    if (!title || !shop || !productId || !productHandle || !productVariantId || !destination) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const qrCode = await prisma.qRCode.create({
      data: {
        title,
        shop,
        productId,
        productHandle,
        productVariantId,
        destination,
        scans: 1, // Assuming a scan is recorded
        createdAt: new Date(),
      },
    });

    res.status(201).json(qrCode);
  } catch (error) {
    console.error('Error handling QR code scan:', error);
    res.status(500).json({ error: 'Failed to store QR code' });
  }
}

export async function handleScan(req, res) {
  try {
    const qrCodeData = req.body;
    const qrCode = await createQRCode(qrCodeData);
    res.status(201).json(qrCode);
  } catch (error) {
    res.status(500).json({ error: 'Failed to store QR code' });
  }
}
