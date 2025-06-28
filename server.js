const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');

// Import modules
const whatsappModule = require('./modules/whatsapp');
const bulkModule = require('./modules/bulk-messaging');
const templatesModule = require('./modules/templates');
const contactsModule = require('./modules/contacts');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for contact imports
const contactUpload = multer({ storage: multer.memoryStorage() });

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

// Contact routes
app.get('/api/contacts', contactsModule.getContacts);
app.get('/api/contacts/tags', contactsModule.getContactTags);
app.get('/api/contacts/:id', contactsModule.getContact);
app.post('/api/contacts', contactsModule.createContact);
app.put('/api/contacts/:id', contactsModule.updateContact);
app.delete('/api/contacts/:id', contactsModule.deleteContact);
app.post('/api/contacts/import', contactUpload.single('csvFile'), contactsModule.importContacts);

// Group routes
app.get('/api/groups', contactsModule.getGroups);
app.post('/api/groups', contactsModule.createGroup);
app.put('/api/groups/:id', contactsModule.updateGroup);
app.delete('/api/groups/:id', contactsModule.deleteGroup);
app.get('/api/groups/:id/contacts', contactsModule.getGroupContacts);
app.post('/api/groups/:groupId/contacts/:contactId', contactsModule.addContactToGroup);
app.delete('/api/groups/:groupId/contacts/:contactId', contactsModule.removeContactFromGroup);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the app at: http://localhost:${PORT}`);
});
