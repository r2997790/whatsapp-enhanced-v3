class WhatsAppEnhanced {
    constructor() {
        this.currentTemplate = null;
        this.templates = [];
        this.isWhatsAppAvailable = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkServerHealth();
        this.checkStatus();
        this.startStatusPolling();
        this.loadTemplates();
    }

    async checkServerHealth() {
        try {
            const response = await fetch('/health');
            const data = await response.json();
            console.log('Server health:', data);
            this.isWhatsAppAvailable = data.modules.whatsapp;
        } catch (error) {
            console.error('Error checking server health:', error);
        }
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

        // Template events
        document.getElementById('create-template-btn').addEventListener('click', () => {
            this.showTemplateForm();
        });

        document.getElementById('save-template-btn').addEventListener('click', () => {
            this.saveTemplate();
        });

        document.getElementById('send-template-btn').addEventListener('click', () => {
            this.sendTemplateMessage();
        });

        // Template content variable detection
        document.getElementById('template-content').addEventListener('input', (e) => {
            this.detectVariables(e.target.value);
        });

        // Category filter
        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.filterTemplatesByCategory(e.target.value);
        });

        // Tab change events
        document.getElementById('templates-tab').addEventListener('click', () => {
            this.loadTemplates();
        });
    }

    async checkStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            this.updateStatus(data.status, data.demoMode);
            
            if (data.status === 'qr_ready') {
                this.loadQRCode();
            }
        } catch (error) {
            console.error('Error checking status:', error);
            this.updateStatus('unavailable');
        }
    }

    async loadQRCode() {
        try {
            const response = await fetch('/api/qr');
            const data = await response.json();
            
            if (data.success && data.qr) {
                document.getElementById('qr-image').src = data.qr;
                document.getElementById('qr-container').style.display = 'block';
            } else {
                console.log('QR code not available:', data.message);
            }
        } catch (error) {
            console.error('Error loading QR code:', error);
        }
    }

    updateStatus(status, demoMode = false) {
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
            'ready': 'Connected & Ready',
            'demo_mode': 'Demo Mode (WhatsApp Unavailable)',
            'unavailable': 'WhatsApp Service Unavailable',
            'error': 'Connection Error'
        };
        
        let displayText = statusTexts[status] || status;
        if (demoMode) {
            displayText = 'Demo Mode - Full UI Available';
            statusIndicator.classList.add('status-ready'); // Show as ready for demo
        }
        
        statusText.textContent = displayText;
        
        // Hide QR code if not needed
        if (status !== 'qr_ready') {
            qrContainer.style.display = 'none';
        }

        // Show demo mode notice
        this.showDemoNotice(demoMode || status === 'demo_mode' || status === 'unavailable');
    }

    showDemoNotice(isDemo) {
        let demoNotice = document.getElementById('demo-notice');
        
        if (isDemo && !demoNotice) {
            const noticeHtml = `
                <div id="demo-notice" class="alert alert-info alert-dismissible fade show" role="alert">
                    <strong>Demo Mode:</strong> WhatsApp connection is unavailable, but you can still explore all features. 
                    Templates, contacts, and bulk messaging interfaces are fully functional for demonstration.
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            document.querySelector('.container').insertAdjacentHTML('afterbegin', noticeHtml);
        } else if (!isDemo && demoNotice) {
            demoNotice.remove();
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
                const demoText = data.demo ? ' (Demo Mode - Message not actually sent)' : '';
                alert('Message sent successfully!' + demoText);
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

    // Template Management Functions
    async loadTemplates() {
        try {
            const response = await fetch('/api/templates');
            const data = await response.json();
            
            if (data.success) {
                this.templates = data.templates;
                this.displayTemplates(this.templates);
                this.loadCategories();
            }
        } catch (error) {
            console.error('Error loading templates:', error);
            this.showTemplateError();
        }
    }

    showTemplateError() {
        const templatesContainer = document.getElementById('templates-list');
        templatesContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning">
                    Templates service is currently unavailable. Please try again later.
                </div>
            </div>
        `;
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/templates/categories');
            const data = await response.json();
            
            if (data.success) {
                const categorySelect = document.getElementById('category-filter');
                categorySelect.innerHTML = '<option value="">All Categories</option>';
                
                data.categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
                    categorySelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    displayTemplates(templates) {
        const templatesContainer = document.getElementById('templates-list');
        
        if (templates.length === 0) {
            templatesContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        No templates found. Create your first template to get started!
                    </div>
                </div>
            `;
            return;
        }
        
        templatesContainer.innerHTML = templates.map(template => `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card template-card h-100" onclick="app.viewTemplate('${template.id}')">
                    <div class="card-body">
                        <h6 class="card-title">${template.name}</h6>
                        <span class="badge bg-secondary mb-2">${template.category}</span>
                        <p class="card-text small text-muted">${template.content.substring(0, 100)}${template.content.length > 100 ? '...' : ''}</p>
                        <div class="small text-muted">
                            Variables: ${template.variables.map(v => `{{${v}}}`).join(', ') || 'None'}
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-sm btn-primary me-2" onclick="event.stopPropagation(); app.useTemplate('${template.id}')">Use</button>
                        <button class="btn btn-sm btn-outline-secondary me-2" onclick="event.stopPropagation(); app.editTemplate('${template.id}')">Edit</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); app.deleteTemplate('${template.id}')">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    filterTemplatesByCategory(category) {
        const filteredTemplates = category ? 
            this.templates.filter(template => template.category === category) : 
            this.templates;
        this.displayTemplates(filteredTemplates);
    }

    showTemplateForm(template = null) {
        const modal = new bootstrap.Modal(document.getElementById('template-form-modal'));
        const form = document.getElementById('template-form');
        const title = document.getElementById('template-form-title');
        
        if (template) {
            title.textContent = 'Edit Template';
            document.getElementById('template-id').value = template.id;
            document.getElementById('template-name').value = template.name;
            document.getElementById('template-category').value = template.category;
            document.getElementById('template-content').value = template.content;
            this.detectVariables(template.content);
        } else {
            title.textContent = 'Create Template';
            form.reset();
            document.getElementById('template-id').value = '';
            document.getElementById('detected-variables').innerHTML = 'Type in the content area to detect variables';
        }
        
        modal.show();
    }

    detectVariables(content) {
        const variableRegex = /\{\{(\w+)\}\}/g;
        const variables = [];
        let match;
        
        while ((match = variableRegex.exec(content)) !== null) {
            if (!variables.includes(match[1])) {
                variables.push(match[1]);
            }
        }
        
        const detectedDiv = document.getElementById('detected-variables');
        if (variables.length > 0) {
            detectedDiv.innerHTML = variables.map(v => `<span class="badge bg-info me-1">{{${v}}}</span>`).join('');
        } else {
            detectedDiv.innerHTML = 'No variables detected';
        }
    }

    async saveTemplate() {
        const templateId = document.getElementById('template-id').value;
        const name = document.getElementById('template-name').value;
        const category = document.getElementById('template-category').value;
        const content = document.getElementById('template-content').value;
        
        if (!name || !content) {
            alert('Please fill in template name and content');
            return;
        }
        
        try {
            const url = templateId ? `/api/templates/${templateId}` : '/api/templates';
            const method = templateId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    category: category || 'general',
                    content: content
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('template-form-modal'));
                modal.hide();
                this.loadTemplates();
                alert(templateId ? 'Template updated successfully!' : 'Template created successfully!');
            } else {
                alert('Error saving template: ' + data.message);
            }
        } catch (error) {
            console.error('Error saving template:', error);
            alert('Error saving template. Please try again.');
        }
    }

    async editTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (template) {
            this.showTemplateForm(template);
        }
    }

    async deleteTemplate(templateId) {
        if (!confirm('Are you sure you want to delete this template?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/templates/${templateId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.loadTemplates();
                alert('Template deleted successfully!');
            } else {
                alert('Error deleting template: ' + data.message);
            }
        } catch (error) {
            console.error('Error deleting template:', error);
            alert('Error deleting template. Please try again.');
        }
    }

    async useTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;
        
        this.currentTemplate = template;
        
        // Generate variable input form
        const variablesForm = document.getElementById('template-variables-form');
        if (template.variables.length > 0) {
            variablesForm.innerHTML = template.variables.map(variable => `
                <div class="mb-3">
                    <label for="var-${variable}" class="form-label">${variable.charAt(0).toUpperCase() + variable.slice(1)}</label>
                    <input type="text" class="form-control template-variable" id="var-${variable}" data-variable="${variable}" placeholder="Enter ${variable}">
                </div>
            `).join('');
            
            // Add event listeners for preview updates
            document.querySelectorAll('.template-variable').forEach(input => {
                input.addEventListener('input', () => this.updateTemplatePreview());
            });
        } else {
            variablesForm.innerHTML = '<p class="text-muted">This template has no variables to fill.</p>';
        }
        
        this.updateTemplatePreview();
        
        const modal = new bootstrap.Modal(document.getElementById('use-template-modal'));
        modal.show();
    }

    updateTemplatePreview() {
        if (!this.currentTemplate) return;
        
        let preview = this.currentTemplate.content;
        const variableInputs = document.querySelectorAll('.template-variable');
        
        variableInputs.forEach(input => {
            const variable = input.dataset.variable;
            const value = input.value || `{{${variable}}}`;
            const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
            preview = preview.replace(regex, value);
        });
        
        document.getElementById('template-message-preview').textContent = preview;
    }

    async sendTemplateMessage() {
        const recipient = document.getElementById('template-recipient').value;
        
        if (!recipient) {
            alert('Please enter a recipient phone number');
            return;
        }
        
        if (!this.currentTemplate) {
            alert('No template selected');
            return;
        }
        
        // Collect variable values
        const variables = {};
        document.querySelectorAll('.template-variable').forEach(input => {
            variables[input.dataset.variable] = input.value;
        });
        
        try {
            // Process template with variables
            const response = await fetch(`/api/templates/${this.currentTemplate.id}/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ variables })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Send the processed message
                const sendResponse = await fetch('/api/send-message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        number: recipient,
                        message: data.processedContent
                    })
                });
                
                const sendData = await sendResponse.json();
                
                if (sendData.success) {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('use-template-modal'));
                    modal.hide();
                    const demoText = sendData.demo ? ' (Demo Mode)' : '';
                    alert('Template message sent successfully!' + demoText);
                } else {
                    alert('Error sending message: ' + sendData.message);
                }
            } else {
                alert('Error processing template: ' + data.message);
            }
        } catch (error) {
            console.error('Error sending template message:', error);
            alert('Error sending template message. Please try again.');
        }
    }

    async viewTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (template) {
            alert(`Template: ${template.name}\nCategory: ${template.category}\nContent: ${template.content}\nVariables: ${template.variables.join(', ') || 'None'}`);
        }
    }

    startStatusPolling() {
        // Check status every 5 seconds (less frequent to reduce load)
        setInterval(() => {
            this.checkStatus();
        }, 5000);
    }
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new WhatsAppEnhanced();
});
