import { useState } from "react";
import { json, redirect } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
  useNavigate,
} from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Card,
  Bleed,
  Button,
  ChoiceList,
  Divider,
  FormLayout,
  Heading,
  Layout,
  Page,
  Select,
  Stack,
  TextField,
  TextContainer,
  Thumbnail,
} from "@shopify/polaris";
import { createQRCode, validateQRCode } from "../models/QRCode.server";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  return json({ shop: session.shop });
}

export async function action({ request }) {
  const formData = new URLSearchParams(await request.text());
  const data = {
    title: formData.get("title"),
    productId: formData.get("productId"),
    productHandle: formData.get("productHandle"),
    productVariantId: formData.get("productVariantId"),
    destination: formData.get("destination"),
    shop: formData.get("shop"),
  };

  const validationErrors = validateQRCode(data);
  if (Object.keys(validationErrors).length) {
    return json({ errors: validationErrors });
  }

  await createQRCode(data);

  return redirect("/app/qrcodes");
}

export default function NewQRCode() {
  const { shop } = useLoaderData();
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    title: "",
    productId: "",
    productHandle: "",
    productVariantId: "",
    destination: "product",
    shop,
  });

  const handleChange = (field) => (value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    fetch("/app/qrcodes/new", {
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
    <Page title="Create QR code">
      <Layout>
        <Layout.Section>
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
                  Create QR Code
                </Button>
              </FormLayout>
            </form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
