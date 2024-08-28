// app/routes/customers.jsx

import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server"; // Import your Shopify authentication method
import { PrismaClient } from '@prisma/client';
import { Card, DataTable, Frame, Layout, Page, Text } from "@shopify/polaris";
import { useLoaderData } from "@remix-run/react";

// Initialize Prisma Client
const prisma = new PrismaClient();

// Loader function to fetch customer data from Shopify and store it in MongoDB
export const loader = async ({ request }) => {
  try {
    // Authenticate with Shopify
    const { admin, session } = await authenticate.admin(request);
    const response = await admin.graphql(`
      query {
        customers(first: 250) {
          edges {
            node {
              id
              displayName
              email
              phone
              addresses {
                address1
              }
            }
          }
        }
      }
    `);

    // Parse the response
    const responseJson = await response.json();
    const customers = responseJson.data.customers.edges;

    const customerList = customers.map(customer => ({
      id: customer.node.id,
      displayName: customer.node.displayName || 'N/A',
      email: customer.node.email || 'N/A',
      phone: customer.node.phone || 'N/A',
      addresses: customer.node.addresses.map(addr => addr.address1).join(', ') || 'N/A'
    }));

    // Extract shopId from session data
    const shopId = session.shop; // Adjust based on your session structure

    // Insert or update customers in MongoDB
    await Promise.all(customerList.map(async (customer) => {
      await prisma.customer.upsert({
        where: { shopCustomerId: customer.id },
        update: {
          displayName: customer.displayName,
          email: customer.email,
          phone: customer.phone,
          addresses: customer.addresses
        },
        create: {
          shopId: shopId,
          shopCustomerId: customer.id,
          displayName: customer.displayName,
          email: customer.email,
          phone: customer.phone,
          addresses: customer.addresses
        }
      });
    }));

    // Sort customers alphabetically by displayName
    const sortedCustomers = customerList.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return json(sortedCustomers);
  } catch (error) {
    console.error('Error:', error);
    return json({ error: 'Failed to load customer data' });
  }
};

// React component to display customer data
export default function Customers() {
  const customers = useLoaderData();

  const rows = customers.map((customer, index) => [
    index + 1, // Serial Number
    customer.id,
    customer.displayName,
    customer.email,
    customer.phone,
    customer.addresses
  ]);

  return (
    <Frame>
      <Page fullWidth>
        <Layout>
          <Layout.Section>
            <Card>
              <Text as="h2" variant="headingMd">
                All Customers
              </Text>
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                headings={['S.N', 'Customer ID', 'Name', 'Email', 'Phone', 'Addresses']}
                rows={rows}
              />
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
