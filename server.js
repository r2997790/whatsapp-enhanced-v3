const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs-extra');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 8080;

// Ensure data directories exist
async function ensureDirectories() {
    try {
        await fs.ensureDir('./data/templates');
        await fs.ensureDir('./data/contacts');
        await fs.ensureDir('./uploads');
        await fs.ensureDir('./data/whatsapp-session');
        console.log('✅ Data directories created successfully');
    } catch (error) {
        console.error('Error creating directories:', error);
    }
}

// Initialize directories
ensureDirectories();

// Configure multer for contact imports
const contactUpload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Global IO reference for modules
global.io = io;

// Import modules with error handling
let whatsappModule, bulkModule, templatesModule, contactsModule, personalizationModule;

try {
    whatsappModule = require('./modules/whatsapp');
    console.log('✅ WhatsApp module loaded');
} catch (error) {
    console.error('❌ Error loading WhatsApp module:', error.message);
    // Create a fallback module with connection control endpoints
    whatsappModule = {
        getQR: (req, res) => res.json({ success: false, message: 'WhatsApp module unavailable' }),
        getStatus: (req, res) => res.json({ status: 'unavailable', isReady: false }),
        sendMessage: (req, res) => res.status(500).json({ success: false, message: 'WhatsApp unavailable' }),
        connect: (req, res) => res.json({ success: false, message: 'WhatsApp module unavailable' }),
        reconnect: (req, res) => res.json({ success: false, message: 'WhatsApp module unavailable' }),
        disconnect: (req, res) => res.json({ success: false, message: 'WhatsApp module unavailable' }),
        refreshQR: (req, res) => res.json({ success: false, message: 'WhatsApp module unavailable' })
    };
}

try {
    bulkModule = require('./modules/bulk-messaging');
    console.log('✅ Bulk messaging module loaded');
} catch (error) {
    console.error('❌ Error loading bulk messaging module:', error.message);
}

try {
    templatesModule = require('./modules/templates');
    console.log('✅ Templates module loaded');
} catch (error) {
    console.error('❌ Error loading templates module:', error.message);
}

try {
    contactsModule = require('./modules/contacts');
    console.log('✅ Contacts module loaded');
} catch (error) {
    console.error('❌ Error loading contacts module:', error.message);
}

try {
    personalizationModule = require('./modules/personalization');
    console.log('✅ Personalization module loaded');
} catch (error) {
    console.error('❌ Error loading personalization module:', error.message);
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        modules: {
            whatsapp: !!whatsappModule,
            bulk: !!bulkModule,
            templates: !!templatesModule,
            contacts: !!contactsModule,
            personalization: !!personalizationModule
        }
    });
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WhatsApp routes
if (whatsappModule) {
    app.get('/api/qr', whatsappModule.getQR);
    app.get('/api/status', whatsappModule.getStatus);
    app.post('/api/send-message', whatsappModule.sendMessage);
    
    // New connection control endpoints
    app.post('/api/whatsapp/connect', whatsappModule.connect || ((req, res) => {
        res.json({ success: false, message: 'Connect function not implemented' });
    }));
    
    app.post('/api/whatsapp/reconnect', whatsappModule.reconnect || ((req, res) => {
        res.json({ success: false, message: 'Reconnect function not implemented' });
    }));
    
    app.post('/api/whatsapp/disconnect', whatsappModule.disconnect || ((req, res) => {
        res.json({ success: false, message: 'Disconnect function not implemented' });
    }));
    
    app.post('/api/whatsapp/refresh-qr', whatsappModule.refreshQR || ((req, res) => {
        res.json({ success: false, message: 'Refresh QR function not implemented' });
    }));
}

// Bulk messaging routes
if (bulkModule) {
    app.post('/api/bulk-send-manual', bulkModule.handleManualBulk);
    app.post('/api/bulk-send-csv', bulkModule.uploadMiddleware, bulkModule.handleCSVBulk);
}

// Template routes
if (templatesModule) {
    app.get('/api/templates', templatesModule.getTemplates);
    app.get('/api/templates/categories', templatesModule.getCategories);
    app.get('/api/templates/:id', templatesModule.getTemplate);
    app.post('/api/templates', templatesModule.createTemplate);
    app.put('/api/templates/:id', templatesModule.updateTemplate);
    app.delete('/api/templates/:id', templatesModule.deleteTemplate);
    app.post('/api/templates/:id/process', templatesModule.processTemplate);
}

// Contact routes
if (contactsModule) {
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
}

// Personalization routes
if (personalizationModule) {
    app.get('/api/personalization/tokens', personalizationModule.getSuggestedTokens);
    app.post('/api/personalization/personalize', personalizationModule.personalizeMessage);
    app.post('/api/personalization/previews', personalizationModule.generatePreviews);
    app.post('/api/personalization/bulk-send', personalizationModule.sendPersonalizedBulk);
    app.post('/api/personalization/group-send', personalizationModule.sendPersonalizedGroup);
    app.post('/api/personalization/validate', personalizationModule.validateTokens);
    app.post('/api/personalization/extract-tokens', personalizationModule.extractTokens);
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Route not found' 
    });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Access the app at: http://localhost:${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

module.exports = app;
