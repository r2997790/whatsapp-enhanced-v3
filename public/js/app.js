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
        
        this.initializeSocket();
        this.initializeEventListeners();
        this.loadInitialData();
    }

    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Socket.IO connected');
            this.isConnected = true;
            this.updateWebSocketStatus('connected', 'Connected');
        });

        this.socket.on('disconnect', () => {
            console.log('Socket.IO disconnected');
            this.isConnected = false;
            this.updateWebSocketStatus('disconnected', 'Disconnected');
        });

        this.socket.on('status_update', (status) => {
            this.updateStatus(status);
        });

        this.socket.on('qr_code', (data) => {
            this.displayQRCode(data.qr);
        });

        this.socket.on('connection_ready', (data) => {
            this.showNotification('success', 'WhatsApp Connected!', data.message);
        });

        this.socket.on('authenticated', (data) => {
            this.showNotification('success', 'Authenticated!', data.message);
        });

        this.socket.on('auth_failure', (data) => {
            this.showNotification('error', 'Authentication Failed', data.message);
        });

        this.socket.on('disconnected', (data) => {
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
    }

    updateWebSocketStatus(status, text) {
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
        
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.getElementById('status-text');
        const clientCount = document.getElementById('client-count');
        const qrContainer = document.getElementById('qr-container');
        const loadingStatus = document.getElementById('loading-status');
        
        // Update status indicator
        statusIndicator.className = `status-indicator status-${status.status}`;
        
        // Update status text
        let statusMessage = this.getStatusMessage(status.status, status.demoMode);
        statusText.textContent = statusMessage;
        
        // Update client count
        if (status.connectedClients !== undefined) {
            clientCount.textContent = `${status.connectedClients} clients`;
            clientCount.style.display = 'inline';
        }
        
        // Update connection buttons based on status
        this.updateConnectionButtons(status.status);
        
        // Show/hide QR container
        if (status.status === 'qr_ready') {
            qrContainer.style.display = 'block';
            loadingStatus.style.display = 'none';
        } else if (status.status === 'ready' || status.status === 'authenticated') {
            qrContainer.style.display = 'none';
            loadingStatus.style.display = 'none';
        } else {
            loadingStatus.style.display = 'none';
        }
    }

    updateConnectionButtons(status) {
        const connectBtn = document.getElementById('connect-btn');
        const reconnectBtn = document.getElementById('reconnect-btn');
        const disconnectBtn = document.getElementById('disconnect-btn');
        const refreshQrBtn = document.getElementById('refresh-qr-btn');
        
        // Hide all buttons first
        connectBtn.style.display = 'none';
        reconnectBtn.style.display = 'none';
        disconnectBtn.style.display = 'none';
        refreshQrBtn.style.display = 'none';
        
        switch (status) {
            case 'disconnected':
                connectBtn.style.display = 'inline-block';
                break;
            case 'qr_ready':
                reconnectBtn.style.display = 'inline-block';
                refreshQrBtn.style.display = 'inline-block';
                disconnectBtn.style.display = 'inline-block';
                break;
            case 'authenticated':
            case 'ready':
                disconnectBtn.style.display = 'inline-block';
                reconnectBtn.style.display = 'inline-block';
                break;
            case 'auth_failure':
            case 'error':
                connectBtn.style.display = 'inline-block';
                break;
        }
    }

    getStatusMessage(status, demoMode) {
        if (demoMode) return 'Demo Mode - WhatsApp simulation active';
        
        switch (status) {
            case 'disconnected': return 'Disconnected';
            case 'qr_ready': return 'Scan QR Code to Connect';
            case 'authenticated': return 'Authenticated - Loading...';
            case 'ready': return 'Connected and Ready';
            case 'auth_failure': return 'Authentication Failed';
            case 'error': return 'Connection Error';
            default: return 'Unknown Status';
        }
    }

    displayQRCode(qrDataUrl) {
        const qrImage = document.getElementById('qr-image');
        const qrContainer = document.getElementById('qr-container');
        
        qrImage.src = qrDataUrl;
        qrContainer.style.display = 'block';
    }

    updateLoadingProgress(percent, message) {
        const loadingStatus = document.getElementById('loading-status');
        const progressBar = document.getElementById('loading-progress');
        const loadingMessage = document.getElementById('loading-message');
        
        loadingStatus.style.display = 'block';
        progressBar.style.width = `${percent}%`;
        progressBar.textContent = `${percent}%`;
        loadingMessage.textContent = message;
    }

    // Connection control functions
    async connectWhatsApp() {
        try {
            this.showNotification('info', 'Connecting...', 'Initializing WhatsApp connection');
            const response = await fetch('/api/whatsapp/connect', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('success', 'Connection Started', result.message);
            } else {
                this.showNotification('error', 'Connection Failed', result.message);
            }
        } catch (error) {
            this.showNotification('error', 'Connection Error', 'Failed to start WhatsApp connection');
        }
    }

    async reconnectWhatsApp() {
        try {
            this.showNotification('info', 'Reconnecting...', 'Restarting WhatsApp connection');
            const response = await fetch('/api/whatsapp/reconnect', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('success', 'Reconnection Started', result.message);
            } else {
                this.showNotification('error', 'Reconnection Failed', result.message);
            }
        } catch (error) {
            this.showNotification('error', 'Reconnection Error', 'Failed to reconnect to WhatsApp');
        }
    }

    async disconnectWhatsApp() {
        try {
            this.showNotification('info', 'Disconnecting...', 'Stopping WhatsApp connection');
            const response = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('success', 'Disconnected', result.message);
            } else {
                this.showNotification('error', 'Disconnection Failed', result.message);
            }
        } catch (error) {
            this.showNotification('error', 'Disconnection Error', 'Failed to disconnect from WhatsApp');
        }
    }

    async refreshQR() {
        try {
            this.showNotification('info', 'Refreshing...', 'Generating new QR code');
            const response = await fetch('/api/whatsapp/refresh-qr', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('success', 'QR Refreshed', result.message);
            } else {
                this.showNotification('error', 'Refresh Failed', result.message);
            }
        } catch (error) {
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
        // Quick send form
        document.getElementById('quick-send-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendQuickMessage();
        });

        // Bulk messaging forms
        document.getElementById('manual-bulk-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendManualBulk();
        });

        document.getElementById('csv-bulk-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendCSVBulk();
        });

        // Template management
        document.getElementById('create-template-btn').addEventListener('click', () => {
            this.showTemplateModal();
        });

        document.getElementById('save-template-btn').addEventListener('click', () => {
            this.saveTemplate();
        });

        document.getElementById('template-content').addEventListener('input', () => {
            this.detectTemplateVariables();
        });

        // Contact management
        const addContactBtn = document.getElementById('add-contact-btn');
        if (addContactBtn) {
            addContactBtn.addEventListener('click', () => {
                this.showAddContactModal();
            });
        }

        const saveContactBtn = document.getElementById('save-contact-btn');
        if (saveContactBtn) {
            saveContactBtn.addEventListener('click', () => {
                this.saveContact();
            });
        }

        const importContactsBtn = document.getElementById('import-contacts-btn');
        if (importContactsBtn) {
            importContactsBtn.addEventListener('click', () => {
                this.showImportContactsModal();
            });
        }

        const importContactsBtnModal = document.getElementById('import-contacts-btn-modal');
        if (importContactsBtnModal) {
            importContactsBtnModal.addEventListener('click', () => {
                this.importContacts();
            });
        }

        const createGroupBtn = document.getElementById('create-group-btn');
        if (createGroupBtn) {
            createGroupBtn.addEventListener('click', () => {
                this.showCreateGroupModal();
            });
        }

        const saveGroupBtn = document.getElementById('save-group-btn');
        if (saveGroupBtn) {
            saveGroupBtn.addEventListener('click', () => {
                this.saveGroup();
            });
        }

        // Search and filters
        const contactSearch = document.getElementById('contact-search');
        if (contactSearch) {
            contactSearch.addEventListener('input', (e) => {
                this.filterContacts(e.target.value);
            });
        }

        const contactTagFilter = document.getElementById('contact-tag-filter');
        if (contactTagFilter) {
            contactTagFilter.addEventListener('change', (e) => {
                this.filterContactsByTag(e.target.value);
            });
        }

        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.filterTemplatesByCategory(e.target.value);
        });

        // Personalization
        const personalizeMessage = document.getElementById('personalize-message');
        if (personalizeMessage) {
            personalizeMessage.addEventListener('input', () => {
                this.updatePersonalizationTokens();
                this.updatePersonalizationPreview();
            });
        }

        const personalizeForm = document.getElementById('personalize-form');
        if (personalizeForm) {
            personalizeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendPersonalizedMessage();
            });
        }

        const bulkPersonalizeForm = document.getElementById('bulk-personalize-form');
        if (bulkPersonalizeForm) {
            bulkPersonalizeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendBulkPersonalized();
            });
        }

        const groupPersonalizeForm = document.getElementById('group-personalize-form');
        if (groupPersonalizeForm) {
            groupPersonalizeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendGroupPersonalized();
            });
        }

        // Tab change listeners
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const target = e.target.getAttribute('data-bs-target');
                if (target === '#contacts') {
                    this.loadContacts();
                    this.loadGroups();
                } else if (target === '#templates') {
                    this.loadTemplates();
                } else if (target === '#personalization') {
                    this.loadSuggestedTokens();
                    this.loadGroupsForPersonalization();
                }
            });
        });
    }

    async loadInitialData() {
        try {
            await this.loadTemplates();
            await this.loadContacts();
            await this.loadGroups();
            await this.loadSuggestedTokens();
            this.updateContactTagFilter();
        } catch (error) {
            console.error('Error loading initial data:', error);
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

    // Template Functions
    async loadTemplates() {
        try {
            const response = await fetch('/api/templates');
            const result = await response.json();
            
            if (result.success) {
                this.templates = result.templates;
                this.displayTemplates();
                this.updateCategoryFilter();
            }
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    }

    displayTemplates() {
        const container = document.getElementById('templates-list');
        
        if (this.templates.length === 0) {
            container.innerHTML = '<div class="col-12"><p class="text-muted">No templates found. Create your first template!</p></div>';
            return;
        }

        container.innerHTML = this.templates.map(template => `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card template-card h-100" onclick="app.useTemplate('${template.id}')">
                    <div class="card-body">
                        <h6 class="card-title">${template.name}</h6>
                        <span class="badge bg-primary mb-2">${template.category || 'General'}</span>
                        <p class="card-text small">${template.content.substring(0, 100)}${template.content.length > 100 ? '...' : ''}</p>
                        <div class="d-flex justify-content-between">
                            <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); app.editTemplate('${template.id}')">Edit</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); app.deleteTemplate('${template.id}')">Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
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
        
        if (results) {
            container.style.display = 'block';
            summary.innerHTML = `<strong>Total: ${results.length}</strong>`;
            // Add more detailed results display if needed
        }
    }

    // Stub functions for the rest of the functionality
    showTemplateModal() { console.log('Template modal'); }
    saveTemplate() { console.log('Save template'); }
    detectTemplateVariables() { console.log('Detect variables'); }
    showAddContactModal() { console.log('Add contact modal'); }
    saveContact() { console.log('Save contact'); }
    showImportContactsModal() { console.log('Import contacts modal'); }
    importContacts() { console.log('Import contacts'); }
    showCreateGroupModal() { console.log('Create group modal'); }
    saveGroup() { console.log('Save group'); }
    filterContacts() { console.log('Filter contacts'); }
    filterContactsByTag() { console.log('Filter by tag'); }
    filterTemplatesByCategory() { console.log('Filter templates'); }
    updatePersonalizationTokens() { console.log('Update tokens'); }
    updatePersonalizationPreview() { console.log('Update preview'); }
    sendPersonalizedMessage() { console.log('Send personalized'); }
    sendBulkPersonalized() { console.log('Bulk personalized'); }
    sendGroupPersonalized() { console.log('Group personalized'); }
    loadContacts() { console.log('Load contacts'); }
    loadGroups() { console.log('Load groups'); }
    loadSuggestedTokens() { console.log('Load tokens'); }
    loadGroupsForPersonalization() { console.log('Load groups for personalization'); }
    updateContactTagFilter() { console.log('Update contact tag filter'); }
    updateCategoryFilter() { console.log('Update category filter'); }
    useTemplate() { console.log('Use template'); }
    editTemplate() { console.log('Edit template'); }
    deleteTemplate() { console.log('Delete template'); }
}

// Initialize the application
const app = new WhatsAppEnhanced();

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    app.showNotification('error', 'Application Error', 'An unexpected error occurred');
});
