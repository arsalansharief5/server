import express from 'express';
import cors from 'cors';
import { userRoutes } from './routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);

// Health check route
app.get('/health', (req, res) => {
  console.log('Health check endpoint hit');
  res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});