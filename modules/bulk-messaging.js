const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { whatsappManager } = require('./whatsapp');

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

class BulkMessaging {
    constructor() {
        this.uploadMiddleware = upload.single('csvFile');
    }

    async parseCSV(filePath) {
        return new Promise((resolve, reject) => {
            const contacts = [];
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    // Expected CSV columns: name, phone, email (optional)
                    if (row.phone || row.number) {
                        contacts.push({
                            name: row.name || '',
                            phone: row.phone || row.number,
                            email: row.email || ''
                        });
                    }
                })
                .on('end', () => {
                    // Clean up uploaded file
                    fs.unlinkSync(filePath);
                    resolve(contacts);
                })
                .on('error', reject);
        });
    }

    async sendBulkMessages(contacts, message, delay = 2000) {
        const results = [];
        
        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            
            try {
                await whatsappManager.sendMessage(contact.phone, message);
                results.push({
                    contact: contact,
                    status: 'success',
                    timestamp: new Date().toISOString()
                });
                console.log(`Message sent to ${contact.name || contact.phone}`);
            } catch (error) {
                results.push({
                    contact: contact,
                    status: 'failed',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                console.error(`Failed to send message to ${contact.name || contact.phone}:`, error.message);
            }
            
            // Add delay between messages to avoid being flagged as spam
            if (i < contacts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        return results;
    }

    // Handle bulk message sending from manual input
    async handleManualBulk(req, res) {
        try {
            const { contacts, message, delay } = req.body;
            
            if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Contacts array is required'
                });
            }
            
            if (!message) {
                return res.status(400).json({
                    success: false,
                    message: 'Message is required'
                });
            }
            
            // Validate WhatsApp connection
            if (!whatsappManager.isReady) {
                return res.status(400).json({
                    success: false,
                    message: 'WhatsApp is not connected'
                });
            }
            
            const results = await this.sendBulkMessages(contacts, message, delay || 2000);
            
            res.json({
                success: true,
                message: 'Bulk messages processed',
                results: results,
                summary: {
                    total: results.length,
                    successful: results.filter(r => r.status === 'success').length,
                    failed: results.filter(r => r.status === 'failed').length
                }
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Handle bulk message sending from CSV upload
    async handleCSVBulk(req, res) {
        try {
            const { message, delay } = req.body;
            
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'CSV file is required'
                });
            }
            
            if (!message) {
                return res.status(400).json({
                    success: false,
                    message: 'Message is required'
                });
            }
            
            // Validate WhatsApp connection
            if (!whatsappManager.isReady) {
                return res.status(400).json({
                    success: false,
                    message: 'WhatsApp is not connected'
                });
            }
            
            // Parse CSV file
            const contacts = await this.parseCSV(req.file.path);
            
            if (contacts.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No valid contacts found in CSV file'
                });
            }
            
            const results = await this.sendBulkMessages(contacts, message, delay || 2000);
            
            res.json({
                success: true,
                message: 'Bulk messages from CSV processed',
                results: results,
                summary: {
                    total: results.length,
                    successful: results.filter(r => r.status === 'success').length,
                    failed: results.filter(r => r.status === 'failed').length
                }
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

const bulkMessaging = new BulkMessaging();

module.exports = {
    bulkMessaging,
    uploadMiddleware: bulkMessaging.uploadMiddleware,
    handleManualBulk: bulkMessaging.handleManualBulk.bind(bulkMessaging),
    handleCSVBulk: bulkMessaging.handleCSVBulk.bind(bulkMessaging)
};
