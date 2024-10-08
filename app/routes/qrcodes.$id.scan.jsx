// app/routes/qrcodes.$id.scan.jsx

import { redirect } from "@remix-run/node";
import invariant from "tiny-invariant";
import db from "../db.server";
import { getDestinationUrl } from "../models/QRCode.server";

export const loader = async ({ params }) => {
  invariant(params.id, "Could not find QR code destination");

  const id = String(params.id); // Convert ID to string
  console.log(`Fetching QR code with id: ${id}`);

  const qrCode = await db.qRCode.findFirst({ where: { id } });
  console.log(`Found QR code: ${JSON.stringify(qrCode)}`);

  invariant(qrCode, "Could not find QR code destination");

  await db.qRCode.update({
    where: { id: id }, // Ensure id is a string
    data: { scans: { increment: 1 } },
  });
  console.log(`Updated QR code with id: ${id}`);

  return redirect(getDestinationUrl(qrCode));
};
