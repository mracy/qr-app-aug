import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { PrismaClient } from '@prisma/client';
import { Card, DataTable, Frame, Layout, Page, Text, Thumbnail } from "@shopify/polaris";
import { useLoaderData } from "@remix-run/react";

// Initialize Prisma Client
const prisma = new PrismaClient();

// Helper function to fetch data with pagination
const fetchPaginatedData = async (admin, query, key) => {
  let allData = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const response = await admin.graphql(query(cursor));
    const jsonResponse = await response.json();
    const data = jsonResponse.data[key].edges;
    allData = [...allData, ...data];
    hasNextPage = jsonResponse.data[key].pageInfo.hasNextPage;
    cursor = data.length ? data[data.length - 1].cursor : null;
  }

  return allData;
};

// Loader function to fetch and process product data
export const loader = async ({ request }) => {
  try {
    // Authenticate and fetch products, orders, and locations
    const { admin } = await authenticate.admin(request);

    // Define queries
    const productsQuery = (cursor) => `
      query {
        products(first: 250${cursor ? `, after: "${cursor}"` : ''}) {
          edges {
            node {
              id
              title
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 250) {
                edges {
                  node {
                    id
                    title
                    inventoryQuantity
                    image {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;

    const ordersQuery = (cursor) => `
      query {
        orders(first: 250${cursor ? `, after: "${cursor}"` : ''}) {
          edges {
            node {
              id
              lineItems(first: 250) {
                edges {
                  node {
                    product {
                      id
                      title
                      images(first: 1) {
                        edges {
                          node {
                            url
                            altText
                          }
                        }
                      }
                    }
                    variant {
                      id
                      image {
                        url
                        altText
                      }
                    }
                    quantity
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;

    const locationsQuery = (cursor) => `
      query {
        locations(first: 250${cursor ? `, after: "${cursor}"` : ''}) {
          edges {
            node {
              id
            }
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;

    // Fetch data
    const products = await fetchPaginatedData(admin, productsQuery, 'products');
    const orders = await fetchPaginatedData(admin, ordersQuery, 'orders');
    const locations = await fetchPaginatedData(admin, locationsQuery, 'locations');

    // Aggregate quantities and prepare data
    const productQuantities = {};

    orders.forEach(order => {
      order.node.lineItems.edges.forEach(lineItem => {
        const productId = lineItem.node.product.id;
        const quantity = lineItem.node.quantity;

        if (!productQuantities[productId]) {
          const product = products.find(p => p.node.id === productId).node;
          productQuantities[productId] = {
            id: productId,
            title: product.title,
            imageUrl: product.images.edges[0]?.node.url || 'https://via.placeholder.com/150',
            imageAlt: product.images.edges[0]?.node.altText || 'Product Image',
            variants: product.variants.edges.map(variant => ({
              id: variant.node.id,
              title: variant.node.title,
              inventoryQuantity: variant.node.inventoryQuantity,
              variantImageUrl: variant.node.image?.url || 'https://via.placeholder.com/150',
              variantImageAlt: variant.node.image?.altText || 'Variant Image'
            })),
            totalQuantity: 0
          };
        }
        productQuantities[productId].totalQuantity += quantity;
      });
    });

    // Include products with zero sales
    products.forEach(p => {
      if (!productQuantities[p.node.id]) {
        productQuantities[p.node.id] = {
          id: p.node.id,
          title: p.node.title,
          imageUrl: p.node.images.edges[0]?.node.url || 'https://via.placeholder.com/150',
          imageAlt: p.node.images.edges[0]?.node.altText || 'Product Image',
          variants: p.node.variants.edges.map(variant => ({
            id: variant.node.id,
            title: variant.node.title,
            inventoryQuantity: variant.node.inventoryQuantity,
            variantImageUrl: variant.node.image?.url || 'https://via.placeholder.com/150',
            variantImageAlt: variant.node.image?.altText || 'Variant Image'
          })),
          totalQuantity: 0
        };
      }
    });

    // Convert to array and sort
    const sortedProducts = Object.values(productQuantities).sort((a, b) => b.totalQuantity - a.totalQuantity);

    // Sort variants' IDs in ascending order for each product
    sortedProducts.forEach(product => {
      product.variants.sort((a, b) => a.id.localeCompare(b.id));
    });

    // Insert or update products, variants, and images in MongoDB
    await Promise.all(sortedProducts.map(async (product) => {
      // Upsert product
      await prisma.product.upsert({
        where: { productId: product.id },
        update: {
          title: product.title,
        },
        create: {
          productId: product.id,
          title: product.title,
        }
      });

      // Ensure the `variants` array exists and is being properly iterated over
      if (product.variants) {
       await Promise.all(product.variants.map(async (variant) => {
         await prisma.variant.upsert({
           where: { shopifyGID: variant.id },
           update: {
             title: variant.title,
             inventoryQuantity: variant.inventoryQuantity,
             imageUrl: variant.variantImageUrl,
             imageAlt: variant.variantImageAlt,
           },
           create: {
             shopifyGID: variant.id,
             productId: product.id,
             title: variant.title,
             inventoryQuantity: variant.inventoryQuantity,
             imageUrl: variant.variantImageUrl,
             imageAlt: variant.variantImageAlt,
           }
         });

         await prisma.image.upsert({
           where: { shopifyGID: variant.id },
           update: {
             src: variant.variantImageUrl,
             altText: variant.variantImageAlt,
           },
           create: {
             productId: product.id,
             src: variant.variantImageUrl,
             altText: variant.variantImageAlt,
             shopifyGID: variant.id
           }
         });
       }));
      }
    }));

    // Prepare locations data
    const locationIds = locations.map(location => location.node.id);

    return json({ sortedProducts, locationIds });
  } catch (error) {
    console.error('Error fetching or processing product data:', error);
    return json({ sortedProducts: [], locationIds: [] });
  }
};

// Products component for rendering the product list
export default function Products() {
  const { sortedProducts, locationIds } = useLoaderData();

  // Ensure the products data is properly formatted
  const rows = sortedProducts.map((product, index) => {
    // Assign numerical order to variant IDs
    const variantRows = product.variants.map((variant, idx) => ({
      ...variant,
      order: idx + 1
    }));

    return {
      id: index + 1,
      title: product.title,
      image: product.imageUrl,
      variants: variantRows,
      totalQuantity: product.totalQuantity
    };
  });

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card title="Product List">
            <DataTable
              columnContentTypes={[
                'text',
                'text',
                'text',
                'text'
              ]}
              headings={[
                'ID',
                'Title',
                'Image',
                'Total Quantity'
              ]}
              rows={rows.map(product => [
                product.id,
                product.title,
                <Thumbnail source={product.image} alt={product.title} />,
                product.totalQuantity,
              ])}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
