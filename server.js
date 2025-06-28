const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import modules
const whatsappModule = require('./modules/whatsapp');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WhatsApp routes
app.get('/api/qr', whatsappModule.getQR);
app.get('/api/status', whatsappModule.getStatus);
app.post('/api/send-message', whatsappModule.sendMessage);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the app at: http://localhost:${PORT}`);
});
