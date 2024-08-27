import express from 'express';
import { createProduct, getProducts } from '../services/productService';

const router = express.Router();

router.post('/products', async (req, res) => {
  try {
    const product = await createProduct(req.body);
    res.status(201).json(product);
  } catch (e) {
    console.error('Error creating product:', e);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.get('/products', async (req, res) => {
  try {
    const products = await getProducts();
    res.json(products);
  } catch (e) {
    console.error('Error fetching products:', e);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

export default router;
