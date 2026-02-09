const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000; // CRITICAL: Use process.env.PORT

// Serve static files from public folder
app.use(express.static('../public'));

// Your routes
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from Render!' });
});

// Health check endpoint (optional but recommended)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
