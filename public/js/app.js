class WhatsAppEnhanced {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkStatus();
        this.startStatusPolling();
    }

    setupEventListeners() {
        // Quick send form
        document.getElementById('quick-send-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendQuickMessage();
        });
    }

    async checkStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            this.updateStatus(data.status);
            
            if (data.status === 'qr_ready') {
                this.loadQRCode();
            }
        } catch (error) {
            console.error('Error checking status:', error);
        }
    }

    async loadQRCode() {
        try {
            const response = await fetch('/api/qr');
            const data = await response.json();
            
            if (data.success && data.qr) {
                document.getElementById('qr-image').src = data.qr;
                document.getElementById('qr-container').style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading QR code:', error);
        }
    }

    updateStatus(status) {
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.getElementById('status-text');
        const qrContainer = document.getElementById('qr-container');
        
        // Remove all status classes
        statusIndicator.className = 'status-indicator';
        
        // Add current status class
        statusIndicator.classList.add(`status-${status}`);
        
        // Update status text
        const statusTexts = {
            'disconnected': 'Disconnected',
            'qr_ready': 'Scan QR Code',
            'authenticated': 'Authenticated',
            'ready': 'Connected & Ready'
        };
        
        statusText.textContent = statusTexts[status] || status;
        
        // Hide QR code if not needed
        if (status !== 'qr_ready') {
            qrContainer.style.display = 'none';
        }
    }

    async sendQuickMessage() {
        const phoneNumber = document.getElementById('phone-number').value;
        const message = document.getElementById('message').value;
        
        if (!phoneNumber || !message) {
            alert('Please fill in both phone number and message');
            return;
        }
        
        try {
            const response = await fetch('/api/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    number: phoneNumber,
                    message: message
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Message sent successfully!');
                document.getElementById('message').value = '';
            } else {
                alert('Error sending message: ' + data.message);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error sending message. Please try again.');
        }
    }

    startStatusPolling() {
        // Check status every 3 seconds
        setInterval(() => {
            this.checkStatus();
        }, 3000);
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WhatsAppEnhanced();
});
