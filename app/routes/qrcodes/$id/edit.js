import { json, redirect } from "@remix-run/node";
import invariant from "tiny-invariant";
import { useState } from "react";
import {
  useLoaderData,
  useActionData,
  useNavigate,
  useSubmit,
} from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Card,
  Button,
  FormLayout,
  Page,
  TextField,
  Select,
} from "@shopify/polaris";
import { getQRCode, validateQRCode } from "../models/QRCode.server";

export async function loader({ params }) {
  invariant(params.id, "QR code ID is required");
  const qrCode = await getQRCode(params.id, authenticate.admin);
  return json({ qrCode });
}

export async function action({ request, params }) {
  invariant(params.id, "QR code ID is required");
  const formData = new URLSearchParams(await request.text());
  const data = {
    id: params.id,
    title: formData.get("title"),
    productId: formData.get("productId"),
    productHandle: formData.get("productHandle"),
    productVariantId: formData.get("productVariantId"),
    destination: formData.get("destination"),
  };

  const validationErrors = validateQRCode(data);
  if (Object.keys(validationErrors).length) {
    return json({ errors: validationErrors });
  }

  await db.qRCode.update({
    where: { id: params.id },
    data,
  });

  return redirect("/app/qrcodes");
}

export default function EditQRCode() {
  const { qrCode } = useLoaderData();
  const [formData, setFormData] = useState(qrCode);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleChange = (field) => (value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    fetch(`/app/qrcodes/${qrCode.id}`, {
      method: "POST",
      body: new URLSearchParams(formData),
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.errors) {
          setErrors(result.errors);
        } else {
          navigate("/app/qrcodes");
        }
      });
  };

  return (
    <Page title="Edit QR Code">
      <Card sectioned>
        <form onSubmit={handleSubmit}>
          <FormLayout>
            <TextField
              label="Title"
              value={formData.title}
              onChange={handleChange("title")}
              error={errors.title}
            />
            <TextField
              label="Product ID"
              value={formData.productId}
              onChange={handleChange("productId")}
              error={errors.productId}
            />
            <TextField
              label="Product Handle"
              value={formData.productHandle}
              onChange={handleChange("productHandle")}
            />
            <TextField
              label="Product Variant ID"
              value={formData.productVariantId}
              onChange={handleChange("productVariantId")}
            />
            <Select
              label="Destination"
              options={[
                { label: "Product", value: "product" },
                { label: "Cart", value: "cart" },
              ]}
              value={formData.destination}
              onChange={handleChange("destination")}
            />
            <Button submit primary>
              Update QR Code
            </Button>
          </FormLayout>
        </form>
      </Card>
    </Page>
  );
}
