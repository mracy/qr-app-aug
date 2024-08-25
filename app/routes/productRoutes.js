import express from 'express';
import { getProducts } from '../services/productService';

const router = express.Router();

router.get('/products', async (req, res) => {
  try {
    const products = await getProducts();
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

export default router;
