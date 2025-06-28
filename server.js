const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import modules
const whatsappModule = require('./modules/whatsapp');
const bulkModule = require('./modules/bulk-messaging');
const templatesModule = require('./modules/templates');

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

// Bulk messaging routes
app.post('/api/bulk-send-manual', bulkModule.handleManualBulk);
app.post('/api/bulk-send-csv', bulkModule.uploadMiddleware, bulkModule.handleCSVBulk);

// Template routes
app.get('/api/templates', templatesModule.getTemplates);
app.get('/api/templates/categories', templatesModule.getCategories);
app.get('/api/templates/:id', templatesModule.getTemplate);
app.post('/api/templates', templatesModule.createTemplate);
app.put('/api/templates/:id', templatesModule.updateTemplate);
app.delete('/api/templates/:id', templatesModule.deleteTemplate);
app.post('/api/templates/:id/process', templatesModule.processTemplate);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the app at: http://localhost:${PORT}`);
});
