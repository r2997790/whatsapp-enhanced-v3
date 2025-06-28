const { templateManager } = require('./templates');
const { contactManager } = require('./contacts');
const { whatsappManager } = require('./whatsapp');

class PersonalizationEngine {
    constructor() {
        this.defaultTokens = {
            'current_date': () => new Date().toLocaleDateString(),
            'current_time': () => new Date().toLocaleTimeString(),
            'current_year': () => new Date().getFullYear().toString(),
            'current_month': () => new Date().toLocaleDateString('en-US', { month: 'long' }),
            'current_day': () => new Date().toLocaleDateString('en-US', { weekday: 'long' })
        };
    }

    // Process personalization tokens in a message
    personalizeMessage(message, contact = {}, customTokens = {}) {
        let personalizedMessage = message;
        
        // Contact-based tokens
        const contactTokens = {
            'name': contact.name || 'there',
            'first_name': contact.name ? contact.name.split(' ')[0] : 'there',
            'last_name': contact.name ? contact.name.split(' ').slice(1).join(' ') : '',
            'phone': contact.phone || '',
            'email': contact.email || '',
            'company': contact.company || ''
        };
        
        // Add custom fields from contact
        if (contact.customFields) {
            Object.keys(contact.customFields).forEach(key => {
                contactTokens[key] = contact.customFields[key];
            });
        }
        
        // Combine all tokens
        const allTokens = {
            ...this.defaultTokens,
            ...contactTokens,
            ...customTokens
        };
        
        // Replace tokens in message
        Object.keys(allTokens).forEach(token => {
            const regex = new RegExp(`\\{\\{${token}\\}\\}`, 'gi');
            let value = allTokens[token];
            
            // Execute function tokens
            if (typeof value === 'function') {
                value = value();
            }
            
            personalizedMessage = personalizedMessage.replace(regex, value || '');
        });
        
        return personalizedMessage;
    }

    // Extract all tokens from a message
    extractTokens(message) {
        const tokenRegex = /\{\{(\w+)\}\}/g;
        const tokens = [];
        let match;
        
        while ((match = tokenRegex.exec(message)) !== null) {
            if (!tokens.includes(match[1])) {
                tokens.push(match[1]);
            }
        }
        
        return tokens;
    }

    // Get suggested tokens based on available contact fields
    async getSuggestedTokens() {
        try {
            const contacts = await contactManager.getContacts();
            const allCustomFields = new Set();
            
            // Collect all custom field keys
            contacts.forEach(contact => {
                if (contact.customFields) {
                    Object.keys(contact.customFields).forEach(key => {
                        allCustomFields.add(key);
                    });
                }
            });
            
            return {
                default: Object.keys(this.defaultTokens),
                contact: ['name', 'first_name', 'last_name', 'phone', 'email', 'company'],
                custom: Array.from(allCustomFields)
            };
        } catch (error) {
            console.error('Error getting suggested tokens:', error);
            return {
                default: Object.keys(this.defaultTokens),
                contact: ['name', 'first_name', 'last_name', 'phone', 'email', 'company'],
                custom: []
            };
        }
    }

    // Send personalized bulk messages using templates
    async sendPersonalizedBulkMessages(templateId, contacts, customTokens = {}, delay = 2000) {
        try {
            const template = await templateManager.getTemplate(templateId);
            if (!template) {
                throw new Error('Template not found');
            }
            
            const results = [];
            
            for (let i = 0; i < contacts.length; i++) {
                const contact = contacts[i];
                
                try {
                    // Personalize message for this contact
                    const personalizedMessage = this.personalizeMessage(
                        template.content,
                        contact,
                        customTokens
                    );
                    
                    // Send message
                    await whatsappManager.sendMessage(contact.phone, personalizedMessage);
                    
                    results.push({
                        contact: contact,
                        message: personalizedMessage,
                        status: 'success',
                        timestamp: new Date().toISOString()
                    });
                    
                    console.log(`Personalized message sent to ${contact.name || contact.phone}`);
                } catch (error) {
                    results.push({
                        contact: contact,
                        message: '',
                        status: 'failed',
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                    
                    console.error(`Failed to send personalized message to ${contact.name || contact.phone}:`, error.message);
                }
                
                // Add delay between messages
                if (i < contacts.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            
            return results;
        } catch (error) {
            console.error('Error sending personalized bulk messages:', error);
            throw error;
        }
    }

    // Send personalized message to a group
    async sendPersonalizedGroupMessage(templateId, groupId, customTokens = {}, delay = 2000) {
        try {
            const contacts = await contactManager.getGroupContacts(groupId);
            return await this.sendPersonalizedBulkMessages(templateId, contacts, customTokens, delay);
        } catch (error) {
            console.error('Error sending personalized group message:', error);
            throw error;
        }
    }

    // Generate preview of personalized messages for a list of contacts
    async generatePersonalizedPreviews(templateId, contactIds, customTokens = {}) {
        try {
            const template = await templateManager.getTemplate(templateId);
            if (!template) {
                throw new Error('Template not found');
            }
            
            const previews = [];
            
            for (const contactId of contactIds.slice(0, 5)) { // Limit to 5 previews
                const contact = await contactManager.getContact(contactId);
                if (contact) {
                    const personalizedMessage = this.personalizeMessage(
                        template.content,
                        contact,
                        customTokens
                    );
                    
                    previews.push({
                        contact: contact,
                        preview: personalizedMessage
                    });
                }
            }
            
            return previews;
        } catch (error) {
            console.error('Error generating previews:', error);
            throw error;
        }
    }

    // Validate that all required tokens have values for given contacts
    validateTokensForContacts(message, contacts) {
        const tokens = this.extractTokens(message);
        const results = [];
        
        contacts.forEach(contact => {
            const missingTokens = [];
            
            tokens.forEach(token => {
                // Skip default tokens as they always have values
                if (this.defaultTokens[token]) return;
                
                const contactTokens = {
                    'name': contact.name,
                    'first_name': contact.name ? contact.name.split(' ')[0] : '',
                    'last_name': contact.name ? contact.name.split(' ').slice(1).join(' ') : '',
                    'phone': contact.phone,
                    'email': contact.email,
                    'company': contact.company,
                    ...contact.customFields
                };
                
                if (!contactTokens[token] || contactTokens[token] === '') {
                    missingTokens.push(token);
                }
            });
            
            results.push({
                contact: contact,
                missingTokens: missingTokens,
                isValid: missingTokens.length === 0
            });
        });
        
        return results;
    }
}

const personalizationEngine = new PersonalizationEngine();

module.exports = {
    personalizationEngine,
    
    // API handlers
    getSuggestedTokens: async (req, res) => {
        try {
            const tokens = await personalizationEngine.getSuggestedTokens();
            res.json({ success: true, tokens });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    personalizeMessage: async (req, res) => {
        try {
            const { message, contactId, customTokens } = req.body;
            
            if (!message) {
                return res.status(400).json({
                    success: false,
                    message: 'Message content is required'
                });
            }
            
            let contact = {};
            if (contactId) {
                contact = await contactManager.getContact(contactId) || {};
            }
            
            const personalizedMessage = personalizationEngine.personalizeMessage(
                message,
                contact,
                customTokens || {}
            );
            
            res.json({
                success: true,
                personalizedMessage,
                contact
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    generatePreviews: async (req, res) => {
        try {
            const { templateId, contactIds, customTokens } = req.body;
            
            if (!templateId || !contactIds || !Array.isArray(contactIds)) {
                return res.status(400).json({
                    success: false,
                    message: 'Template ID and contact IDs are required'
                });
            }
            
            const previews = await personalizationEngine.generatePersonalizedPreviews(
                templateId,
                contactIds,
                customTokens || {}
            );
            
            res.json({ success: true, previews });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    sendPersonalizedBulk: async (req, res) => {
        try {
            const { templateId, contactIds, customTokens, delay } = req.body;
            
            if (!templateId || !contactIds || !Array.isArray(contactIds)) {
                return res.status(400).json({
                    success: false,
                    message: 'Template ID and contact IDs are required'
                });
            }
            
            // Validate WhatsApp connection
            if (!whatsappManager.isReady) {
                return res.status(400).json({
                    success: false,
                    message: 'WhatsApp is not connected'
                });
            }
            
            // Get contacts
            const contacts = [];
            for (const contactId of contactIds) {
                const contact = await contactManager.getContact(contactId);
                if (contact) {
                    contacts.push(contact);
                }
            }
            
            if (contacts.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No valid contacts found'
                });
            }
            
            const results = await personalizationEngine.sendPersonalizedBulkMessages(
                templateId,
                contacts,
                customTokens || {},
                delay || 2000
            );
            
            res.json({
                success: true,
                message: 'Personalized bulk messages processed',
                results: results,
                summary: {
                    total: results.length,
                    successful: results.filter(r => r.status === 'success').length,
                    failed: results.filter(r => r.status === 'failed').length
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    sendPersonalizedGroup: async (req, res) => {
        try {
            const { templateId, groupId, customTokens, delay } = req.body;
            
            if (!templateId || !groupId) {
                return res.status(400).json({
                    success: false,
                    message: 'Template ID and group ID are required'
                });
            }
            
            // Validate WhatsApp connection
            if (!whatsappManager.isReady) {
                return res.status(400).json({
                    success: false,
                    message: 'WhatsApp is not connected'
                });
            }
            
            const results = await personalizationEngine.sendPersonalizedGroupMessage(
                templateId,
                groupId,
                customTokens || {},
                delay || 2000
            );
            
            res.json({
                success: true,
                message: 'Personalized group messages processed',
                results: results,
                summary: {
                    total: results.length,
                    successful: results.filter(r => r.status === 'success').length,
                    failed: results.filter(r => r.status === 'failed').length
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    validateTokens: async (req, res) => {
        try {
            const { message, contactIds } = req.body;
            
            if (!message || !contactIds || !Array.isArray(contactIds)) {
                return res.status(400).json({
                    success: false,
                    message: 'Message and contact IDs are required'
                });
            }
            
            // Get contacts
            const contacts = [];
            for (const contactId of contactIds) {
                const contact = await contactManager.getContact(contactId);
                if (contact) {
                    contacts.push(contact);
                }
            }
            
            const validation = personalizationEngine.validateTokensForContacts(message, contacts);
            
            res.json({
                success: true,
                validation,
                summary: {
                    total: validation.length,
                    valid: validation.filter(v => v.isValid).length,
                    invalid: validation.filter(v => !v.isValid).length
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    extractTokens: async (req, res) => {
        try {
            const { message } = req.body;
            
            if (!message) {
                return res.status(400).json({
                    success: false,
                    message: 'Message content is required'
                });
            }
            
            const tokens = personalizationEngine.extractTokens(message);
            res.json({ success: true, tokens });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
