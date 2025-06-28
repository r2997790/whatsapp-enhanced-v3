const fs = require('fs-extra');
const path = require('path');

class TemplateManager {
    constructor() {
        this.templatesDir = path.join(__dirname, '..', 'data', 'templates');
        this.templatesFile = path.join(this.templatesDir, 'templates.json');
        this.initializeTemplates();
    }

    async initializeTemplates() {
        try {
            await fs.ensureDir(this.templatesDir);
            
            // Create templates file if it doesn't exist
            if (!await fs.pathExists(this.templatesFile)) {
                const defaultTemplates = [
                    {
                        id: 'welcome',
                        name: 'Welcome Message',
                        content: 'Welcome {{name}}! Thank you for joining us. We\'re excited to have you on board.',
                        category: 'onboarding',
                        variables: ['name'],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    {
                        id: 'reminder',
                        name: 'Appointment Reminder',
                        content: 'Hi {{name}}, this is a reminder that you have an appointment on {{date}} at {{time}}. Please confirm your attendance.',
                        category: 'appointments',
                        variables: ['name', 'date', 'time'],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    {
                        id: 'promotional',
                        name: 'Promotional Offer',
                        content: 'Hi {{name}}! We have a special {{discount}}% discount just for you. Use code {{code}} before {{expiry}}. Shop now!',
                        category: 'marketing',
                        variables: ['name', 'discount', 'code', 'expiry'],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                ];
                
                await fs.writeJson(this.templatesFile, defaultTemplates, { spaces: 2 });
            }
        } catch (error) {
            console.error('Error initializing templates:', error);
        }
    }

    async getTemplates() {
        try {
            const templates = await fs.readJson(this.templatesFile);
            return templates;
        } catch (error) {
            console.error('Error reading templates:', error);
            return [];
        }
    }

    async getTemplate(id) {
        try {
            const templates = await this.getTemplates();
            return templates.find(template => template.id === id);
        } catch (error) {
            console.error('Error getting template:', error);
            return null;
        }
    }

    async createTemplate(templateData) {
        try {
            const templates = await this.getTemplates();
            
            // Generate unique ID
            const id = templateData.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
            
            // Extract variables from content
            const variables = this.extractVariables(templateData.content);
            
            const newTemplate = {
                id: id,
                name: templateData.name,
                content: templateData.content,
                category: templateData.category || 'general',
                variables: variables,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            templates.push(newTemplate);
            await fs.writeJson(this.templatesFile, templates, { spaces: 2 });
            
            return newTemplate;
        } catch (error) {
            console.error('Error creating template:', error);
            throw error;
        }
    }

    async updateTemplate(id, updateData) {
        try {
            const templates = await this.getTemplates();
            const templateIndex = templates.findIndex(template => template.id === id);
            
            if (templateIndex === -1) {
                throw new Error('Template not found');
            }
            
            // Update template
            const updatedTemplate = {
                ...templates[templateIndex],
                ...updateData,
                variables: updateData.content ? this.extractVariables(updateData.content) : templates[templateIndex].variables,
                updatedAt: new Date().toISOString()
            };
            
            templates[templateIndex] = updatedTemplate;
            await fs.writeJson(this.templatesFile, templates, { spaces: 2 });
            
            return updatedTemplate;
        } catch (error) {
            console.error('Error updating template:', error);
            throw error;
        }
    }

    async deleteTemplate(id) {
        try {
            const templates = await this.getTemplates();
            const filteredTemplates = templates.filter(template => template.id !== id);
            
            if (templates.length === filteredTemplates.length) {
                throw new Error('Template not found');
            }
            
            await fs.writeJson(this.templatesFile, filteredTemplates, { spaces: 2 });
            return true;
        } catch (error) {
            console.error('Error deleting template:', error);
            throw error;
        }
    }

    extractVariables(content) {
        const variableRegex = /\{\{(\w+)\}\}/g;
        const variables = [];
        let match;
        
        while ((match = variableRegex.exec(content)) !== null) {
            if (!variables.includes(match[1])) {
                variables.push(match[1]);
            }
        }
        
        return variables;
    }

    processTemplate(template, variables = {}) {
        let processedContent = template.content;
        
        // Replace variables with provided values
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            processedContent = processedContent.replace(regex, variables[key] || `{{${key}}}`);
        });
        
        return processedContent;
    }

    async getTemplateCategories() {
        try {
            const templates = await this.getTemplates();
            const categories = [...new Set(templates.map(template => template.category))];
            return categories.sort();
        } catch (error) {
            console.error('Error getting categories:', error);
            return [];
        }
    }
}

const templateManager = new TemplateManager();

module.exports = {
    templateManager,
    
    // API handlers
    getTemplates: async (req, res) => {
        try {
            const templates = await templateManager.getTemplates();
            res.json({ success: true, templates });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    getTemplate: async (req, res) => {
        try {
            const { id } = req.params;
            const template = await templateManager.getTemplate(id);
            
            if (!template) {
                return res.status(404).json({ success: false, message: 'Template not found' });
            }
            
            res.json({ success: true, template });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    createTemplate: async (req, res) => {
        try {
            const { name, content, category } = req.body;
            
            if (!name || !content) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Name and content are required' 
                });
            }
            
            const template = await templateManager.createTemplate({
                name,
                content,
                category
            });
            
            res.json({ success: true, template });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    updateTemplate: async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            const template = await templateManager.updateTemplate(id, updateData);
            res.json({ success: true, template });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    deleteTemplate: async (req, res) => {
        try {
            const { id } = req.params;
            await templateManager.deleteTemplate(id);
            res.json({ success: true, message: 'Template deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    getCategories: async (req, res) => {
        try {
            const categories = await templateManager.getTemplateCategories();
            res.json({ success: true, categories });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    processTemplate: async (req, res) => {
        try {
            const { id } = req.params;
            const { variables } = req.body;
            
            const template = await templateManager.getTemplate(id);
            if (!template) {
                return res.status(404).json({ success: false, message: 'Template not found' });
            }
            
            const processedContent = templateManager.processTemplate(template, variables);
            res.json({ 
                success: true, 
                processedContent,
                originalTemplate: template
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
