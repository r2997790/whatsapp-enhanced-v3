// Personalization management functions - handle variable replacement and personalized messaging
class PersonalizationManager {
    constructor(app) {
        this.app = app;
        this.suggestedTokens = [
            'name', 'phone', 'email', 'company', 'first_name', 'last_name',
            'city', 'country', 'current_date', 'current_time', 'amount', 'product', 'service'
        ];
        this.currentTemplate = null;
        this.currentVariables = [];
        this.selectedContacts = [];
        this.currentRecipientType = '';
    }

    // Extract variables from template content
    extractVariables(content) {
        if (!content) return [];
        const matches = content.match(/\{\{([^}]+)\}\}/g);
        if (!matches) return [];
        
        const variables = matches.map(match => match.replace(/[{}]/g, '').trim());
        return [...new Set(variables)]; // Remove duplicates
    }

    // Get suggested tokens
    getSuggestedTokens() {
        return this.suggestedTokens;
    }

    // Load suggested tokens from server
    async loadSuggestedTokens() {
        try {
            this.app.debugLog('Loading suggested tokens...');
            const response = await fetch('/api/personalization/tokens');
            const result = await response.json();
            
            if (result.success && result.tokens) {
                this.suggestedTokens = [...new Set([...this.suggestedTokens, ...result.tokens])];
                this.displaySuggestedTokens();
                this.app.debugLog(`Loaded ${this.suggestedTokens.length} suggested tokens`);
            }
        } catch (error) {
            this.app.debugLog(`Error loading suggested tokens: ${error.message}`);
        }
    }

    // Display suggested tokens
    displaySuggestedTokens() {
        const container = document.getElementById('suggested-tokens');
        if (!container) return;
        
        container.innerHTML = this.suggestedTokens.map(token => 
            `<span class="badge bg-info me-1 mb-1 suggested-token" onclick="app.personalizationManager.insertToken('${token}')" style="cursor: pointer;">${token}</span>`
        ).join('');
    }

    // Insert token into active text area
    insertToken(token) {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
            const start = activeElement.selectionStart;
            const end = activeElement.selectionEnd;
            const text = activeElement.value;
            const before = text.substring(0, start);
            const after = text.substring(end);
            
            activeElement.value = before + `{{${token}}}` + after;
            activeElement.selectionStart = activeElement.selectionEnd = start + token.length + 4;
            activeElement.focus();
            
            // Trigger input event to update variable detection
            activeElement.dispatchEvent(new Event('input', { bubbles: true }));
            
            this.app.showNotification('success', 'Token Inserted', `{{${token}}} added to message`);
            
            // Update stats if in main personalization tab
            this.updatePersonalizationStats();
        } else {
            this.app.showNotification('warning', 'No Target', 'Click in a text field first, then click a token to insert it');
        }
    }

    // Update personalization statistics
    updatePersonalizationStats() {
        const messageElement = document.getElementById('personalization-message');
        if (!messageElement) return;

        const message = messageElement.value;
        const tokens = this.extractVariables(message);
        
        // Update token count
        const tokenCountElement = document.getElementById('message-tokens-count');
        if (tokenCountElement) {
            tokenCountElement.textContent = tokens.length;
        }

        // Update selected recipients count
        const recipientCountElement = document.getElementById('selected-recipients-count');
        if (recipientCountElement) {
            recipientCountElement.textContent = this.selectedContacts.length;
        }
    }

    // Clear template selection
    clearTemplateSelection() {
        const templateSelect = document.getElementById('personalization-template-select');
        const messageTextarea = document.getElementById('personalization-message');
        
        if (templateSelect) templateSelect.value = '';
        if (messageTextarea) messageTextarea.value = '';
        
        this.currentTemplate = null;
        this.generatePersonalizedPreview();
        this.updatePersonalizationStats();
    }

    // Clear all form data
    clearAll() {
        this.clearTemplateSelection();
        
        const recipientType = document.getElementById('personalization-recipient-type');
        const recipients = document.getElementById('personalization-recipients');
        const contactSelection = document.getElementById('personalization-contact-selection');
        const preview = document.getElementById('personalization-preview');
        const sendBtn = document.getElementById('send-personalized-btn');
        
        if (recipientType) recipientType.value = '';
        if (recipients) recipients.style.display = 'none';
        if (contactSelection) contactSelection.style.display = 'none';
        if (sendBtn) sendBtn.disabled = true;
        
        this.selectedContacts = [];
        this.currentRecipientType = '';
        
        if (preview) {
            preview.innerHTML = '<em class="text-muted">Enter a message and select recipients to see personalized previews</em>';
        }
        
        this.updatePersonalizationStats();
    }

    // Personalize message with contact data
    personalizeMessage(template, contact) {
        if (!template || !contact) return template;
        
        let personalizedMessage = template;
        
        // Replace common tokens
        const replacements = {
            'name': contact.name || contact.firstName + ' ' + (contact.lastName || ''),
            'first_name': contact.firstName || contact.name?.split(' ')[0] || '',
            'last_name': contact.lastName || contact.name?.split(' ').slice(1).join(' ') || '',
            'phone': contact.phone || '',
            'email': contact.email || '',
            'company': contact.company || '',
            'city': contact.city || '',
            'country': contact.country || '',
            'current_date': new Date().toLocaleDateString(),
            'current_time': new Date().toLocaleTimeString(),
            'amount': contact.amount || '',
            'product': contact.product || '',
            'service': contact.service || ''
        };
        
        // Add any custom fields from contact
        if (contact.customFields) {
            Object.assign(replacements, contact.customFields);
        }
        
        // Replace all variables in the template
        Object.keys(replacements).forEach(key => {
            const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
            personalizedMessage = personalizedMessage.replace(regex, replacements[key] || `{{${key}}}`);
        });
        
        return personalizedMessage;
    }

    // Utility function to escape HTML
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PersonalizationManager;
}