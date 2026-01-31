import { handler } from './build/handler.js';
import express from 'express';

const app = express();

// Let SvelteKit handle everything
app.use(handler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
