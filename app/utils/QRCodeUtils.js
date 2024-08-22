import qrcode from "qrcode";

export function generateQRCodeUrl(data) {
  return qrcode.toDataURL(data);
}
