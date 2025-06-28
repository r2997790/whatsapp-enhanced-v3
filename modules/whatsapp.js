const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

class WhatsAppManager {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            }
        });
        
        this.qrCode = null;
        this.isReady = false;
        this.status = 'disconnected';
        this.initializeClient();
    }

    initializeClient() {
        this.client.on('qr', async (qr) => {
            console.log('QR Code received');
            this.qrCode = await qrcode.toDataURL(qr);
            this.status = 'qr_ready';
        });

        this.client.on('ready', () => {
            console.log('WhatsApp Client is ready!');
            this.isReady = true;
            this.status = 'ready';
        });

        this.client.on('authenticated', () => {
            console.log('WhatsApp Client authenticated');
            this.status = 'authenticated';
        });

        this.client.on('disconnected', (reason) => {
            console.log('WhatsApp Client disconnected:', reason);
            this.isReady = false;
            this.status = 'disconnected';
        });

        this.client.initialize();
    }

    async sendMessage(number, message) {
        if (!this.isReady) {
            throw new Error('WhatsApp client is not ready');
        }

        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        return await this.client.sendMessage(chatId, message);
    }

    getQRCode() {
        return this.qrCode;
    }

    getStatus() {
        return {
            status: this.status,
            isReady: this.isReady
        };
    }
}

const whatsappManager = new WhatsAppManager();

module.exports = {
    whatsappManager,
    getQR: (req, res) => {
        const qr = whatsappManager.getQRCode();
        if (qr) {
            res.json({ success: true, qr });
        } else {
            res.json({ success: false, message: 'QR code not available' });
        }
    },
    getStatus: (req, res) => {
        res.json(whatsappManager.getStatus());
    },
    sendMessage: async (req, res) => {
        try {
            const { number, message } = req.body;
            if (!number || !message) {
                return res.status(400).json({ success: false, message: 'Number and message are required' });
            }
            
            await whatsappManager.sendMessage(number, message);
            res.json({ success: true, message: 'Message sent successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
