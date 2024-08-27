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
  EmptyState,
  InlineStack,
  InlineError,
  Layout,
  Page,
  Text,
  TextField,
  Thumbnail,
  BlockStack,
  PageActions,
} from "@shopify/polaris";
import { ImageIcon } from "@shopify/polaris-icons";

import db from "../db.server";
import { getQRCode, validateQRCode } from "../models/QRCode.server";

export async function loader({ request, params }) {
  const { admin } = await authenticate.admin(request);

  if (params.id === "new") {
    return json({
      destination: "product",
      title: "",
    });
  }

  const qrCodeId = String(params.id); // Ensure id is a string
  return json(await getQRCode(qrCodeId, admin.graphql));
}


export async function action({ request, params }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  /** @type {any} */
  const data = {
    ...Object.fromEntries(await request.formData()),
    shop,
  };

  console.log("Received data:", data); // Add logging to check data

  if (data.action === "delete") {
    await db.qRCode.delete({ where: { id: String(params.id) } }); // Ensure id is a string
    return redirect("/app");
  }

  const errors = validateQRCode(data);

  if (errors) {
    return json({ errors }, { status: 422 });
  }

  const qrCode =
    params.id === "new"
      ? await db.qRCode.create({ data })
      : await db.qRCode.update({ where: { id: String(params.id) }, data }); // Ensure id is a string

  return redirect(`/app/qrcodes/${qrCode.id}`);
}


export default function QRCodeForm() {
  const errors = useActionData()?.errors || {};
  const qrCode = useLoaderData();
  const [formState, setFormState] = useState(qrCode);
  const [cleanFormState, setCleanFormState] = useState(qrCode);
  const isDirty = JSON.stringify(formState) !== JSON.stringify(cleanFormState);

  const nav = useNavigation();
  const isSaving =
    nav.state === "submitting" && nav.formData?.get("action") !== "delete";
  const isDeleting =
    nav.state === "submitting" && nav.formData?.get("action") === "delete";

  const navigate = useNavigate();

  async function selectProduct() {
    // Retrieve the currently selected product ID and variant IDs from the form state
    const selectedProductId = formState.productId;
    const productVariantIds = Array.isArray(formState.productVariantId)
      ? formState.productVariantId
      : [formState.productVariantId]; // Convert to array if it's a string

    try {
      // Open the Shopify resource picker
      const { selection } = await window.shopify.resourcePicker({
        type: "product",
        action: "select",
        variants: true, // Allow variant selection
        selectionIds: selectedProductId
          ? [
              {
                id: selectedProductId,
                variants: productVariantIds.map(variantId => ({ id: variantId })),
              }
            ]
          : [],
      });

      console.log("Selected products and variants:", selection);

      // If products were selected, update the form state
      if (selection && selection.length > 0) {
        const selectedProduct = selection[0];
        const { images, id, title, handle, variants } = selectedProduct;

        // Find the specific variant that was selected or use a default
        const selectedVariants = variants.filter(variant =>
          productVariantIds.includes(variant.id)
        );

        const selectedVariant = selectedVariants.length > 0
          ? selectedVariants[0]
          : (variants.length > 0 ? variants[0] : null);

        // Update the form state with the selected product and variant details
        setFormState({
          ...formState,
          productId: id,
          productVariantId: selectedVariant?.id || null,
          productTitle: title,
          productHandle: handle,
          productAlt: images[0]?.altText || '',
          productImage: images[0]?.originalSrc || '',
          isSelected: true, // Mark the product as selected
        });

        console.log(`Updated form state with product ID: ${id}`);
        console.log(`Updated form state with variant ID: ${selectedVariant?.id || 'None'}`);
      }
    } catch (error) {
      console.error('Error selecting product:', error);
    }
  }

  const submit = useSubmit();
  function handleSave() {
    const data = {
      title: formState.title,
      productId: formState.productId || "",
      productVariantId: formState.productVariantId || "",
      productHandle: formState.productHandle || "",
      destination: formState.destination,
    };

    console.log("Submitting data:", data); // Add logging to check data

    setCleanFormState({ ...formState });
    submit(data, { method: "post" });
  }


  return (
    <Page>
      <ui-title-bar title={qrCode.id ? "Edit QR code" : "Create new QR code"}>
        <button variant="breadcrumb" onClick={() => navigate("/app")}>
          QR codes
        </button>
      </ui-title-bar>
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingLg">
                  Title
                </Text>
                <TextField
                  id="title"
                  helpText="Only store staff can see this title"
                  label="Title"
                  labelHidden
                  autoComplete="off"
                  value={formState.title}
                  onChange={(title) => setFormState({ ...formState, title })}
                  error={errors.title}
                />
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="500">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingLg">
                    Product
                  </Text>
                </InlineStack>
                {formState.productId ? (
                  <InlineStack blockAlign="center" gap="500">
                    <Thumbnail
                      source={formState.productImage || ImageIcon}
                      alt={formState.productAlt || 'Product Image'}
                    />
                    <Text as="span" variant="headingMd" fontWeight="semibold">
                      {formState.productTitle}
                    </Text>
                    <span role="img" aria-label="selected">
                      ✅ {/* Simple tick/checkmark */}
                    </span>
                    <Button onClick={selectProduct} variant="plain">
                      Change product
                    </Button>
                  </InlineStack>
                ) : (
                  <BlockStack gap="200">
                    <Button onClick={selectProduct} id="select-product">
                      Select product
                    </Button>
                    {errors.productId ? (
                      <InlineError
                        message={errors.productId}
                        fieldID="myFieldID"
                      />
                    ) : null}
                  </BlockStack>
                )}
                <Bleed marginInlineStart="200" marginInlineEnd="200">
                  <Divider />
                </Bleed>
                <InlineStack gap="500" align="space-between" blockAlign="start">
                  <ChoiceList
                    title="Scan destination"
                    choices={[
                      { label: "Link to product page", value: "product" },
                      {
                        label: "Link to checkout page with product in the cart",
                        value: "cart",
                      },
                    ]}
                    selected={[formState.destination]}
                    onChange={(destination) =>
                      setFormState({
                        ...formState,
                        destination: destination[0],
                      })
                    }
                    error={errors.destination}
                  />
                  {qrCode.destinationUrl ? (
                    <Button
                      variant="plain"
                      url={qrCode.destinationUrl}
                      target="_blank"
                    >
                      Go to destination URL
                    </Button>
                  ) : null}
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card>
            <Text as="h2" variant="headingLg">
              QR code
            </Text>
            {qrCode ? (
              <EmptyState image={qrCode.image} imageContained={true} />
            ) : (
              <EmptyState image="">
                Your QR code will appear here after you save
              </EmptyState>
            )}
            <BlockStack gap="300">
              <Button
                disabled={!qrCode?.image}
                url={qrCode?.image}
                download
                variant="primary"
              >
                Download
              </Button>
              <Button
                disabled={!qrCode.id}
                url={`/qrcodes/${qrCode.id}`}
                target="_blank"
              >
                Go to public URL
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <PageActions
            secondaryActions={[
              {
                content: "Delete",
                loading: isDeleting,
                disabled: !qrCode.id || !qrCode || isSaving || isDeleting,
                onAction: () =>
                  submit({ action: "delete" }, { method: "post" }),
              },
            ]}
            primaryAction={{
              content: qrCode.id ? "Save" : "Create",
              loading: isSaving,
              onAction: handleSave,
              disabled: isSaving,
            }}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
