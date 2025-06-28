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

        // Bulk messaging forms
        document.getElementById('manual-bulk-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendManualBulkMessages();
        });

        document.getElementById('csv-bulk-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendCSVBulkMessages();
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

    async sendManualBulkMessages() {
        const contactsText = document.getElementById('bulk-contacts').value;
        const message = document.getElementById('bulk-message').value;
        const delay = parseInt(document.getElementById('bulk-delay').value) * 1000;
        
        if (!contactsText || !message) {
            alert('Please fill in both contacts and message');
            return;
        }
        
        // Parse contacts from text
        const phoneNumbers = contactsText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        if (phoneNumbers.length === 0) {
            alert('Please enter at least one phone number');
            return;
        }
        
        // Convert to contact format
        const contacts = phoneNumbers.map(phone => ({
            name: '',
            phone: phone,
            email: ''
        }));
        
        try {
            this.showBulkProgress('Sending messages...');
            
            const response = await fetch('/api/bulk-send-manual', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contacts: contacts,
                    message: message,
                    delay: delay
                })
            });
            
            const data = await response.json();
            this.displayBulkResults(data);
            
        } catch (error) {
            console.error('Error sending bulk messages:', error);
            alert('Error sending bulk messages. Please try again.');
        }
    }

    async sendCSVBulkMessages() {
        const fileInput = document.getElementById('csv-file');
        const message = document.getElementById('csv-message').value;
        const delay = parseInt(document.getElementById('csv-delay').value) * 1000;
        
        if (!fileInput.files[0] || !message) {
            alert('Please select a CSV file and enter a message');
            return;
        }
        
        const formData = new FormData();
        formData.append('csvFile', fileInput.files[0]);
        formData.append('message', message);
        formData.append('delay', delay);
        
        try {
            this.showBulkProgress('Processing CSV and sending messages...');
            
            const response = await fetch('/api/bulk-send-csv', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            this.displayBulkResults(data);
            
        } catch (error) {
            console.error('Error sending CSV bulk messages:', error);
            alert('Error sending CSV bulk messages. Please try again.');
        }
    }

    showBulkProgress(message) {
        const resultsDiv = document.getElementById('bulk-results');
        const summaryDiv = document.getElementById('bulk-summary');
        const detailsDiv = document.getElementById('bulk-details');
        
        summaryDiv.innerHTML = `<div class="alert alert-info">${message}</div>`;
        detailsDiv.innerHTML = '';
        resultsDiv.style.display = 'block';
    }

    displayBulkResults(data) {
        const resultsDiv = document.getElementById('bulk-results');
        const summaryDiv = document.getElementById('bulk-summary');
        const detailsDiv = document.getElementById('bulk-details');
        
        if (data.success) {
            // Display summary
            const summary = data.summary;
            summaryDiv.innerHTML = `
                <div class="row">
                    <div class="col-md-4">
                        <div class="card bg-primary text-white">
                            <div class="card-body text-center">
                                <h5>${summary.total}</h5>
                                <small>Total Messages</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-success text-white">
                            <div class="card-body text-center">
                                <h5>${summary.successful}</h5>
                                <small>Successful</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-danger text-white">
                            <div class="card-body text-center">
                                <h5>${summary.failed}</h5>
                                <small>Failed</small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Display detailed results
            let detailsHtml = '<h6>Detailed Results:</h6>';
            data.results.forEach((result, index) => {
                const statusClass = result.status === 'success' ? 'success' : 'danger';
                const statusIcon = result.status === 'success' ? '✓' : '✗';
                
                detailsHtml += `
                    <div class="alert alert-${statusClass} py-2">
                        <small>
                            ${statusIcon} ${result.contact.name || result.contact.phone} - 
                            ${result.status === 'success' ? 'Sent' : 'Failed: ' + result.error}
                            <span class="float-end">${new Date(result.timestamp).toLocaleTimeString()}</span>
                        </small>
                    </div>
                `;
            });
            
            detailsDiv.innerHTML = detailsHtml;
        } else {
            summaryDiv.innerHTML = `<div class="alert alert-danger">Error: ${data.message}</div>`;
            detailsDiv.innerHTML = '';
        }
        
        resultsDiv.style.display = 'block';
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
