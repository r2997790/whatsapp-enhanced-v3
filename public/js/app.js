// Enhanced WhatsApp Application with Socket.IO
class WhatsAppEnhanced {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.currentStatus = 'disconnected';
        this.templates = [];
        this.contacts = [];
        this.groups = [];
        this.suggestedTokens = [];
        
        this.debugLog('WhatsApp Enhanced v3 starting...');
        
        // Initialize managers
        this.templateManager = new TemplateManager(this);
        this.contactManager = new ContactManager(this);
        this.personalizationManager = new PersonalizationManager(this);
        
        this.initializeSocket();
        this.initializeEventListeners();
        this.loadInitialData();
    }

    debugLog(message) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${message}`);
        
        const debugElement = document.getElementById('debug-text');
        if (debugElement) {
            debugElement.innerHTML += `<br>[${timestamp}] ${message}`;
            // Show debug info
            document.getElementById('debug-info').style.display = 'block';
            // Keep only last 10 lines
            const lines = debugElement.innerHTML.split('<br>');
            if (lines.length > 10) {
                debugElement.innerHTML = lines.slice(-10).join('<br>');
            }
        }
    }

    initializeSocket() {
        try {
            this.debugLog('Initializing Socket.IO connection...');
            this.socket = io();
            
            this.socket.on('connect', () => {
                this.debugLog('Socket.IO connected successfully');
                this.isConnected = true;
                this.updateWebSocketStatus('connected', 'Connected');
            });

            this.socket.on('disconnect', () => {
                this.debugLog('Socket.IO disconnected');
                this.isConnected = false;
                this.updateWebSocketStatus('disconnected', 'Disconnected');
            });

            this.socket.on('status_update', (status) => {
                this.debugLog(`Status update received: ${status.status}`);
                this.updateStatus(status);
            });

            this.socket.on('qr_code', (data) => {
                this.debugLog('QR code received from server');
                this.displayQRCode(data.qr);
            });

            this.socket.on('connection_ready', (data) => {
                this.debugLog('WhatsApp connection ready');
                this.showNotification('success', 'WhatsApp Connected!', data.message);
            });

            this.socket.on('authenticated', (data) => {
                this.debugLog('WhatsApp authenticated');
                this.showNotification('success', 'Authenticated!', data.message);
            });

            this.socket.on('auth_failure', (data) => {
                this.debugLog('WhatsApp authentication failed');
                this.showNotification('error', 'Authentication Failed', data.message);
            });

            this.socket.on('disconnected', (data) => {
                this.debugLog('WhatsApp disconnected');
                this.showNotification('warning', 'Disconnected', data.message);
            });

            this.socket.on('message_sent', (data) => {
                if (data.demo) {
                    this.showNotification('info', 'Demo Mode', `Demo message sent to ${data.number}`);
                } else {
                    this.showNotification('success', 'Message Sent', `Message sent to ${data.number}`);
                }
            });

            this.socket.on('message_send_error', (data) => {
                this.showNotification('error', 'Send Failed', `Failed to send message to ${data.number}: ${data.error}`);
            });

            this.socket.on('loading_update', (data) => {
                this.updateLoadingProgress(data.percent, data.message);
            });

        } catch (error) {
            this.debugLog(`Socket initialization error: ${error.message}`);
        }
    }

    updateWebSocketStatus(status, text) {
        this.debugLog(`WebSocket status: ${status} - ${text}`);
        const statusElement = document.getElementById('websocket-status');
        const statusText = document.getElementById('ws-status-text');
        
        if (statusElement) {
            statusElement.className = `connection-status ${status}`;
        }
        if (statusText) {
            statusText.textContent = text;
        }
    }

    updateStatus(status) {
        this.currentStatus = status.status;
        this.debugLog(`Status updated to: ${status.status}`);
        
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.getElementById('status-text');
        const clientCount = document.getElementById('client-count');
        const qrContainer = document.getElementById('qr-container');
        const loadingStatus = document.getElementById('loading-status');
        
        // Update status indicator
        if (statusIndicator) {
            statusIndicator.className = `status-indicator status-${status.status}`;
        }
        
        // Update status text
        let statusMessage = this.getStatusMessage(status.status, status.demoMode);
        if (statusText) {
            statusText.textContent = statusMessage;
        }
        
        // Update client count
        if (status.connectedClients !== undefined && clientCount) {
            clientCount.textContent = `${status.connectedClients} clients`;
            clientCount.style.display = 'inline';
        }
        
        // Update connection buttons based on status
        this.updateConnectionButtons(status.status);
        
        // Show/hide QR container
        if (status.status === 'qr_ready' && qrContainer) {
            qrContainer.style.display = 'block';
            if (loadingStatus) loadingStatus.style.display = 'none';
        } else if ((status.status === 'ready' || status.status === 'authenticated') && qrContainer) {
            qrContainer.style.display = 'none';
            if (loadingStatus) loadingStatus.style.display = 'none';
        } else if (loadingStatus) {
            loadingStatus.style.display = 'none';
        }
    }

    updateConnectionButtons(status) {
        const connectBtn = document.getElementById('connect-btn');
        const reconnectBtn = document.getElementById('reconnect-btn');
        const disconnectBtn = document.getElementById('disconnect-btn');
        const refreshQrBtn = document.getElementById('refresh-qr-btn');
        
        // Hide all buttons first
        if (connectBtn) connectBtn.style.display = 'none';
        if (reconnectBtn) reconnectBtn.style.display = 'none';
        if (disconnectBtn) disconnectBtn.style.display = 'none';
        if (refreshQrBtn) refreshQrBtn.style.display = 'none';
        
        this.debugLog(`Updating buttons for status: ${status}`);
        
        switch (status) {
            case 'disconnected':
                if (connectBtn) connectBtn.style.display = 'inline-block';
                break;
            case 'connecting':
                if (reconnectBtn) reconnectBtn.style.display = 'inline-block';
                if (disconnectBtn) disconnectBtn.style.display = 'inline-block';
                break;
            case 'qr_ready':
                if (reconnectBtn) reconnectBtn.style.display = 'inline-block';
                if (refreshQrBtn) refreshQrBtn.style.display = 'inline-block';
                if (disconnectBtn) disconnectBtn.style.display = 'inline-block';
                break;
            case 'authenticated':
            case 'ready':
                if (disconnectBtn) disconnectBtn.style.display = 'inline-block';
                if (reconnectBtn) reconnectBtn.style.display = 'inline-block';
                break;
            case 'auth_failure':
            case 'error':
                if (connectBtn) connectBtn.style.display = 'inline-block';
                break;
        }
    }

    getStatusMessage(status, demoMode) {
        if (demoMode) return 'Demo Mode - WhatsApp simulation active';
        
        switch (status) {
            case 'disconnected': return 'Disconnected';
            case 'connecting': return 'Connecting...';
            case 'qr_ready': return 'Scan QR Code to Connect';
            case 'authenticated': return 'Authenticated - Loading...';
            case 'ready': return 'Connected and Ready';
            case 'auth_failure': return 'Authentication Failed';
            case 'error': return 'Connection Error';
            default: return 'Unknown Status';
        }
    }

    displayQRCode(qrDataUrl) {
        this.debugLog('Displaying QR code');
        const qrImage = document.getElementById('qr-image');
        const qrContainer = document.getElementById('qr-container');
        
        if (qrImage && qrDataUrl) {
            qrImage.src = qrDataUrl;
        }
        if (qrContainer) {
            qrContainer.style.display = 'block';
        }
    }

    updateLoadingProgress(percent, message) {
        const loadingStatus = document.getElementById('loading-status');
        const progressBar = document.getElementById('loading-progress');
        const loadingMessage = document.getElementById('loading-message');
        
        if (loadingStatus) loadingStatus.style.display = 'block';
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
            progressBar.textContent = `${percent}%`;
        }
        if (loadingMessage) loadingMessage.textContent = message;
    }

    // Connection control functions
    async connectWhatsApp() {
        try {
            this.debugLog('Connect button clicked');
            this.showNotification('info', 'Connecting...', 'Initializing WhatsApp connection');
            
            const response = await fetch('/api/whatsapp/connect', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            this.debugLog(`Connect response: ${JSON.stringify(result)}`);
            
            if (result.success) {
                this.showNotification('success', 'Connection Started', result.message);
            } else {
                this.showNotification('error', 'Connection Failed', result.message);
            }
        } catch (error) {
            this.debugLog(`Connect error: ${error.message}`);
            this.showNotification('error', 'Connection Error', 'Failed to start WhatsApp connection');
        }
    }

    async reconnectWhatsApp() {
        try {
            this.debugLog('Reconnect button clicked');
            this.showNotification('info', 'Reconnecting...', 'Restarting WhatsApp connection');
            
            const response = await fetch('/api/whatsapp/reconnect', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            this.debugLog(`Reconnect response: ${JSON.stringify(result)}`);
            
            if (result.success) {
                this.showNotification('success', 'Reconnection Started', result.message);
            } else {
                this.showNotification('error', 'Reconnection Failed', result.message);
            }
        } catch (error) {
            this.debugLog(`Reconnect error: ${error.message}`);
            this.showNotification('error', 'Reconnection Error', 'Failed to reconnect to WhatsApp');
        }
    }

    async disconnectWhatsApp() {
        try {
            this.debugLog('Disconnect button clicked');
            this.showNotification('info', 'Disconnecting...', 'Stopping WhatsApp connection');
            
            const response = await fetch('/api/whatsapp/disconnect', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            this.debugLog(`Disconnect response: ${JSON.stringify(result)}`);
            
            if (result.success) {
                this.showNotification('success', 'Disconnected', result.message);
            } else {
                this.showNotification('error', 'Disconnection Failed', result.message);
            }
        } catch (error) {
            this.debugLog(`Disconnect error: ${error.message}`);
            this.showNotification('error', 'Disconnection Error', 'Failed to disconnect from WhatsApp');
        }
    }

    async refreshQR() {
        try {
            this.debugLog('Refresh QR button clicked');
            this.showNotification('info', 'Refreshing...', 'Generating new QR code');
            
            const response = await fetch('/api/whatsapp/refresh-qr', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            this.debugLog(`Refresh QR response: ${JSON.stringify(result)}`);
            
            if (result.success) {
                this.showNotification('success', 'QR Refreshed', result.message);
            } else {
                this.showNotification('error', 'Refresh Failed', result.message);
            }
        } catch (error) {
            this.debugLog(`Refresh QR error: ${error.message}`);
            this.showNotification('error', 'Refresh Error', 'Failed to refresh QR code');
        }
    }

    showNotification(type, title, message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${this.getBootstrapAlertClass(type)} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        
        notification.innerHTML = `
            <strong>${title}</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    getBootstrapAlertClass(type) {
        switch (type) {
            case 'success': return 'success';
            case 'error': return 'danger';
            case 'warning': return 'warning';
            case 'info': return 'info';
            default: return 'secondary';
        }
    }

    initializeEventListeners() {
        this.debugLog('Initializing event listeners...');
        
        // Connection control buttons
        const connectBtn = document.getElementById('connect-btn');
        const reconnectBtn = document.getElementById('reconnect-btn');
        const disconnectBtn = document.getElementById('disconnect-btn');
        const refreshQrBtn = document.getElementById('refresh-qr-btn');
        
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connectWhatsApp());
            this.debugLog('Connect button listener added');
        }
        
        if (reconnectBtn) {
            reconnectBtn.addEventListener('click', () => this.reconnectWhatsApp());
            this.debugLog('Reconnect button listener added');
        }
        
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => this.disconnectWhatsApp());
            this.debugLog('Disconnect button listener added');
        }
        
        if (refreshQrBtn) {
            refreshQrBtn.addEventListener('click', () => this.refreshQR());
            this.debugLog('Refresh QR button listener added');
        }

        // Quick send form
        const quickSendForm = document.getElementById('quick-send-form');
        if (quickSendForm) {
            quickSendForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendQuickMessage();
            });
        }

        // Bulk messaging forms
        const manualBulkForm = document.getElementById('manual-bulk-form');
        if (manualBulkForm) {
            manualBulkForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendManualBulk();
            });
        }

        const csvBulkForm = document.getElementById('csv-bulk-form');
        if (csvBulkForm) {
            csvBulkForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendCSVBulk();
            });
        }

        // Template management - delegate to template manager
        const createTemplateBtn = document.getElementById('create-template-btn');
        if (createTemplateBtn) {
            createTemplateBtn.addEventListener('click', () => {
                this.templateManager.showTemplateModal();
            });
        }

        const saveTemplateBtn = document.getElementById('save-template-btn');
        if (saveTemplateBtn) {
            saveTemplateBtn.addEventListener('click', () => {
                this.templateManager.saveTemplate();
            });
        }

        const templateContent = document.getElementById('template-content');
        if (templateContent) {
            templateContent.addEventListener('input', () => {
                this.templateManager.detectTemplateVariables();
            });
        }

        // Contact management - delegate to contact manager
        const addContactBtn = document.getElementById('add-contact-btn');
        if (addContactBtn) {
            addContactBtn.addEventListener('click', () => {
                this.contactManager.showAddContactModal();
            });
        }

        const saveContactBtn = document.getElementById('save-contact-btn');
        if (saveContactBtn) {
            saveContactBtn.addEventListener('click', () => {
                this.contactManager.saveContact();
            });
        }

        const importContactsBtn = document.getElementById('import-contacts-btn');
        if (importContactsBtn) {
            importContactsBtn.addEventListener('click', () => {
                this.contactManager.showImportContactsModal();
            });
        }

        const importContactsBtnModal = document.getElementById('import-contacts-btn-modal');
        if (importContactsBtnModal) {
            importContactsBtnModal.addEventListener('click', () => {
                this.contactManager.importContacts();
            });
        }

        const createGroupBtn = document.getElementById('create-group-btn');
        if (createGroupBtn) {
            createGroupBtn.addEventListener('click', () => {
                this.contactManager.showCreateGroupModal();
            });
        }

        const saveGroupBtn = document.getElementById('save-group-btn');
        if (saveGroupBtn) {
            saveGroupBtn.addEventListener('click', () => {
                this.contactManager.saveGroup();
            });
        }

        // Search and filters
        const contactSearch = document.getElementById('contact-search');
        if (contactSearch) {
            contactSearch.addEventListener('input', (e) => {
                this.contactManager.searchContacts(e.target.value);
            });
        }

        const contactTagFilter = document.getElementById('contact-tag-filter');
        if (contactTagFilter) {
            contactTagFilter.addEventListener('change', (e) => {
                this.contactManager.filterContactsByTag(e.target.value);
            });
        }

        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.templateManager.filterTemplatesByCategory(e.target.value);
            });
        }

        // Personalization input listeners
        const personalizationMessage = document.getElementById('personalization-message');
        if (personalizationMessage) {
            personalizationMessage.addEventListener('input', () => {
                this.personalizationManager.generatePersonalizedPreview();
                this.personalizationManager.updatePersonalizationStats();
            });
        }

        // Tab change listeners
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const target = e.target.getAttribute('data-bs-target');
                if (target === '#contacts') {
                    this.contactManager.loadContacts();
                    this.contactManager.loadGroups();
                } else if (target === '#templates') {
                    this.templateManager.loadTemplates();
                } else if (target === '#personalization') {
                    this.personalizationManager.loadSuggestedTokens();
                    this.personalizationManager.displaySuggestedTokens();
                    this.personalizationManager.loadTemplatesForSelector();
                }
            });
        });
        
        this.debugLog('Event listeners initialized');
    }

    async loadInitialData() {
        try {
            this.debugLog('Loading initial data...');
            await this.templateManager.loadTemplates();
            await this.contactManager.loadContacts();
            await this.contactManager.loadGroups();
            await this.personalizationManager.loadSuggestedTokens();
            this.personalizationManager.displaySuggestedTokens();
            this.personalizationManager.loadTemplatesForSelector();
            this.debugLog('Initial data loaded');
        } catch (error) {
            this.debugLog(`Error loading initial data: ${error.message}`);
        }
    }

    // Quick Message Functions
    async sendQuickMessage() {
        const phoneNumber = document.getElementById('phone-number').value;
        const message = document.getElementById('message').value;

        if (!phoneNumber || !message) {
            this.showNotification('error', 'Validation Error', 'Phone number and message are required');
            return;
        }

        try {
            const response = await fetch('/api/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ number: phoneNumber, message })
            });

            const result = await response.json();
            if (result.success) {
                this.showNotification('success', 'Message Sent', result.message);
                document.getElementById('quick-send-form').reset();
            } else {
                this.showNotification('error', 'Send Failed', result.message);
            }
        } catch (error) {
            this.showNotification('error', 'Network Error', 'Failed to send message');
        }
    }

    // Bulk messaging functions
    async sendManualBulk() {
        const contacts = document.getElementById('bulk-contacts').value;
        const message = document.getElementById('bulk-message').value;
        const delay = document.getElementById('bulk-delay').value;

        if (!contacts || !message) {
            this.showNotification('error', 'Validation Error', 'Contacts and message are required');
            return;
        }

        const phoneNumbers = contacts.split('\n').filter(num => num.trim().length > 0);
        
        try {
            const response = await fetch('/api/bulk-send-manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    numbers: phoneNumbers, 
                    message, 
                    delay: parseInt(delay) 
                })
            });

            const result = await response.json();
            if (result.success) {
                this.showNotification('success', 'Bulk Send Started', result.message);
                this.displayBulkResults(result.results);
            } else {
                this.showNotification('error', 'Bulk Send Failed', result.message);
            }
        } catch (error) {
            this.showNotification('error', 'Network Error', 'Failed to send bulk messages');
        }
    }

    async sendCSVBulk() {
        const fileInput = document.getElementById('csv-file');
        const message = document.getElementById('csv-message').value;
        const delay = document.getElementById('csv-delay').value;

        if (!fileInput.files[0] || !message) {
            this.showNotification('error', 'Validation Error', 'CSV file and message are required');
            return;
        }

        const formData = new FormData();
        formData.append('csvFile', fileInput.files[0]);
        formData.append('message', message);
        formData.append('delay', delay);

        try {
            const response = await fetch('/api/bulk-send-csv', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                this.showNotification('success', 'CSV Bulk Send Started', result.message);
                this.displayBulkResults(result.results);
            } else {
                this.showNotification('error', 'CSV Bulk Send Failed', result.message);
            }
        } catch (error) {
            this.showNotification('error', 'Network Error', 'Failed to send CSV bulk messages');
        }
    }

    displayBulkResults(results) {
        const container = document.getElementById('bulk-results');
        const summary = document.getElementById('bulk-summary');
        const details = document.getElementById('bulk-details');
        
        if (results && container && summary) {
            container.style.display = 'block';
            summary.innerHTML = `<strong>Total: ${results.length}</strong>`;
        }
    }
}

// Initialize the application
const app = new WhatsAppEnhanced();

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (app) {
        app.debugLog(`Global error: ${event.error.message}`);
        app.showNotification('error', 'Application Error', 'An unexpected error occurred');
    }
});

window.addEventListener('load', () => {
    if (app) {
        app.debugLog('Window loaded, application ready');
    }
});
