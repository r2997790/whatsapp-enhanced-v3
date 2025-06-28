const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

class WhatsAppManager {
    constructor() {
        this.client = null;
        this.qrCode = null;
        this.isReady = false;
        this.status = 'disconnected';
        this.initializationAttempts = 0;
        this.maxInitializationAttempts = 3;
        this.autoReconnect = true;
        this.reconnectTimeout = null;
        
        // Auto-initialize on startup
        this.initializeClient();
    }

    emitToSocket(event, data) {
        if (global.io) {
            global.io.emit(event, data);
            console.log(`📱 [${new Date().toLocaleTimeString()}] ${event}:`, JSON.stringify(data).substring(0, 100));
        }
    }

    async initializeClient() {
        try {
            this.initializationAttempts++;
            console.log(`🔄 [${new Date().toLocaleTimeString()}] Attempting to initialize WhatsApp client (attempt ${this.initializationAttempts}/${this.maxInitializationAttempts})`);
            
            // Clear any existing reconnect timeout
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }
            
            this.client = new Client({
                authStrategy: new LocalAuth({
                    dataPath: './data/whatsapp-session'
                }),
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
                        '--disable-gpu',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding',
                        '--disable-web-security',
                        '--disable-features=TranslateUI',
                        '--disable-ipc-flooding-protection'
                    ],
                    executablePath: process.env.GOOGLE_CHROME_BIN || undefined
                }
            });
            
            this.setupEventListeners();
            this.status = 'connecting';
            this.emitToSocket('status_update', this.getStatus());
            
            await this.client.initialize();
            
        } catch (error) {
            console.error('❌ Error initializing WhatsApp client:', error);
            this.status = 'error';
            this.emitToSocket('status_update', this.getStatus());
            
            if (this.initializationAttempts < this.maxInitializationAttempts && this.autoReconnect) {
                console.log('🔄 Retrying initialization in 5 seconds...');
                this.reconnectTimeout = setTimeout(() => {
                    this.initializeClient();
                }, 5000);
            } else {
                console.error('❌ Max initialization attempts reached. Running in demo mode.');
                this.status = 'demo_mode';
                this.emitToSocket('status_update', this.getStatus());
            }
        }
    }

    setupEventListeners() {
        this.client.on('qr', async (qr) => {
            try {
                console.log('📱 QR Code received');
                this.qrCode = await qrcode.toDataURL(qr);
                this.status = 'qr_ready';
                console.log('📱 QR Code generated successfully');
                
                // Emit QR code and status to all connected clients
                this.emitToSocket('qr_code', { qr: this.qrCode });
                this.emitToSocket('status_update', this.getStatus());
            } catch (error) {
                console.error('❌ Error generating QR code:', error);
            }
        });

        this.client.on('ready', () => {
            console.log('✅ WhatsApp Client is ready!');
            this.isReady = true;
            this.status = 'ready';
            this.initializationAttempts = 0; // Reset attempts on success
            
            // Emit ready status to all connected clients
            this.emitToSocket('status_update', this.getStatus());
            this.emitToSocket('connection_ready', { 
                message: 'WhatsApp is now connected and ready!',
                timestamp: new Date().toISOString()
            });
        });

        this.client.on('authenticated', () => {
            console.log('✅ WhatsApp Client authenticated');
            this.status = 'authenticated';
            
            // Emit authentication success
            this.emitToSocket('status_update', this.getStatus());
            this.emitToSocket('authenticated', { 
                message: 'WhatsApp authentication successful!',
                timestamp: new Date().toISOString()
            });
        });

        this.client.on('auth_failure', (msg) => {
            console.error('❌ WhatsApp authentication failed:', msg);
            this.status = 'auth_failure';
            
            // Emit authentication failure
            this.emitToSocket('status_update', this.getStatus());
            this.emitToSocket('auth_failure', { 
                message: 'WhatsApp authentication failed. Please scan the QR code again.',
                error: msg,
                timestamp: new Date().toISOString()
            });
        });

        this.client.on('disconnected', (reason) => {
            console.log('⚠️  WhatsApp Client disconnected:', reason);
            this.isReady = false;
            this.status = 'disconnected';
            this.qrCode = null;
            
            // Emit disconnection
            this.emitToSocket('status_update', this.getStatus());
            this.emitToSocket('disconnected', { 
                message: 'WhatsApp disconnected.',
                reason: reason,
                timestamp: new Date().toISOString()
            });
            
            // Auto-reconnect after 10 seconds if enabled
            if (this.autoReconnect) {
                console.log('🔄 Attempting to reconnect in 10 seconds...');
                this.reconnectTimeout = setTimeout(() => {
                    this.initializeClient();
                }, 10000);
            }
        });

        this.client.on('message', (message) => {
            // Log received messages for debugging
            console.log('📩 Message received:', message.from, message.body.substring(0, 50));
            
            // Emit received message to frontend (optional)
            this.emitToSocket('message_received', {
                from: message.from,
                body: message.body,
                timestamp: message.timestamp
            });
        });

        this.client.on('loading_screen', (percent, message) => {
            console.log('⏳ Loading:', percent + '%', message);
            this.emitToSocket('loading_update', { percent, message });
        });
    }

    async sendMessage(number, message) {
        if (this.status === 'demo_mode') {
            // In demo mode, simulate sending message
            console.log(`[DEMO MODE] Would send message to ${number}: ${message}`);
            
            // Emit demo message sent
            this.emitToSocket('message_sent', {
                demo: true,
                number: number,
                message: message,
                timestamp: new Date().toISOString()
            });
            
            return { success: true, demo: true };
        }
        
        if (!this.isReady) {
            throw new Error('WhatsApp client is not ready. Please scan QR code first.');
        }

        try {
            const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
            const result = await this.client.sendMessage(chatId, message);
            console.log(`✅ Message sent successfully to ${number}`);
            
            // Emit successful message sent
            this.emitToSocket('message_sent', {
                success: true,
                number: number,
                message: message,
                timestamp: new Date().toISOString()
            });
            
            return result;
        } catch (error) {
            console.error(`❌ Failed to send message to ${number}:`, error);
            
            // Emit message send failure
            this.emitToSocket('message_send_error', {
                number: number,
                message: message,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            throw error;
        }
    }

    // Connection control methods
    async connect() {
        console.log('🔌 Manual connect requested');
        if (this.client) {
            await this.destroy();
        }
        this.autoReconnect = true;
        this.initializationAttempts = 0;
        await this.initializeClient();
        return { success: true, message: 'Connection started' };
    }

    async reconnect() {
        console.log('🔄 Manual reconnect requested');
        if (this.client) {
            await this.destroy();
        }
        this.autoReconnect = true;
        this.initializationAttempts = 0;
        await this.initializeClient();
        return { success: true, message: 'Reconnection started' };
    }

    async disconnect() {
        console.log('🔌 Manual disconnect requested');
        this.autoReconnect = false;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        await this.destroy();
        this.status = 'disconnected';
        this.emitToSocket('status_update', this.getStatus());
        return { success: true, message: 'Disconnected successfully' };
    }

    async refreshQR() {
        console.log('🔄 QR refresh requested');
        if (this.status === 'qr_ready' && this.client) {
            // Force QR regeneration by reconnecting
            await this.reconnect();
            return { success: true, message: 'QR code refresh started' };
        } else {
            return { success: false, message: 'QR code not available for refresh' };
        }
    }

    getQRCode() {
        return this.qrCode;
    }

    getStatus() {
        const connectedClients = global.io ? global.io.engine.clientsCount : 0;
        
        return {
            status: this.status,
            isReady: this.isReady,
            demoMode: this.status === 'demo_mode',
            hasQR: !!this.qrCode,
            autoReconnect: this.autoReconnect,
            timestamp: new Date().toISOString(),
            connectedClients: connectedClients
        };
    }

    async destroy() {
        try {
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }
            
            if (this.client) {
                await this.client.destroy();
            }
            this.client = null;
            this.qrCode = null;
            this.isReady = false;
        } catch (error) {
            console.error('❌ Error destroying WhatsApp client:', error);
        }
    }
}

const whatsappManager = new WhatsAppManager();

// Socket status checker - emit status every 30 seconds
setInterval(() => {
    if (global.io) {
        const clientsCount = global.io.engine.clientsCount;
        console.log(`🔍 [${new Date().toLocaleTimeString()}] Socket check: clients=${clientsCount}, status=${whatsappManager.status}, hasQR=${!!whatsappManager.qrCode}, isConnected=${whatsappManager.isReady}`);
        
        if (clientsCount > 0) {
            global.io.emit('status_update', whatsappManager.getStatus());
            
            if (whatsappManager.qrCode) {
                console.log('📱 [${new Date().toLocaleTimeString()}] QR Code generated, creating data URL...');
                global.io.emit('qr_code', { qr: whatsappManager.qrCode });
                console.log('✅ [${new Date().toLocaleTimeString()}] QR Code sent to all connected clients');
            }
        }
    }
}, 30000);

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await whatsappManager.destroy();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await whatsappManager.destroy();
    process.exit(0);
});

module.exports = {
    WhatsAppManager, // Export the class
    whatsappManager,
    getQR: (req, res) => {
        try {
            const qr = whatsappManager.getQRCode();
            if (qr) {
                res.json({ success: true, qr });
            } else {
                res.json({ 
                    success: false, 
                    message: 'QR code not available',
                    status: whatsappManager.status
                });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    getStatus: (req, res) => {
        try {
            res.json(whatsappManager.getStatus());
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    sendMessage: async (req, res) => {
        try {
            const { number, message } = req.body;
            if (!number || !message) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Number and message are required' 
                });
            }
            
            const result = await whatsappManager.sendMessage(number, message);
            res.json({ 
                success: true, 
                message: 'Message sent successfully',
                demo: result.demo || false
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    // New connection control endpoints
    connect: async (req, res) => {
        try {
            const result = await whatsappManager.connect();
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    reconnect: async (req, res) => {
        try {
            const result = await whatsappManager.reconnect();
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    disconnect: async (req, res) => {
        try {
            const result = await whatsappManager.disconnect();
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    refreshQR: async (req, res) => {
        try {
            const result = await whatsappManager.refreshQR();
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
