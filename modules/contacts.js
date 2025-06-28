const fs = require('fs-extra');
const path = require('path');
const csv = require('csv-parser');

class ContactManager {
    constructor() {
        this.contactsDir = path.join(__dirname, '..', 'data', 'contacts');
        this.contactsFile = path.join(this.contactsDir, 'contacts.json');
        this.groupsFile = path.join(this.contactsDir, 'groups.json');
        this.initializeContacts();
    }

    async initializeContacts() {
        try {
            await fs.ensureDir(this.contactsDir);
            
            // Create contacts file if it doesn't exist
            if (!await fs.pathExists(this.contactsFile)) {
                const defaultContacts = [
                    {
                        id: 'demo-contact-1',
                        name: 'John Doe',
                        phone: '+1234567890',
                        email: 'john@example.com',
                        company: 'Acme Corp',
                        tags: ['customer', 'vip'],
                        customFields: {
                            birthday: '1990-05-15',
                            location: 'New York'
                        },
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    {
                        id: 'demo-contact-2',
                        name: 'Jane Smith',
                        phone: '+0987654321',
                        email: 'jane@example.com',
                        company: 'Tech Solutions',
                        tags: ['lead', 'prospect'],
                        customFields: {
                            birthday: '1985-12-22',
                            location: 'California'
                        },
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                ];
                
                await fs.writeJson(this.contactsFile, defaultContacts, { spaces: 2 });
            }
            
            // Create groups file if it doesn't exist
            if (!await fs.pathExists(this.groupsFile)) {
                const defaultGroups = [
                    {
                        id: 'customers',
                        name: 'Customers',
                        description: 'All our valued customers',
                        contactIds: ['demo-contact-1'],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    {
                        id: 'prospects',
                        name: 'Prospects',
                        description: 'Potential customers and leads',
                        contactIds: ['demo-contact-2'],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                ];
                
                await fs.writeJson(this.groupsFile, defaultGroups, { spaces: 2 });
            }
        } catch (error) {
            console.error('Error initializing contacts:', error);
        }
    }

    async getContacts() {
        try {
            const contacts = await fs.readJson(this.contactsFile);
            return contacts;
        } catch (error) {
            console.error('Error reading contacts:', error);
            return [];
        }
    }

    async getContact(id) {
        try {
            const contacts = await this.getContacts();
            return contacts.find(contact => contact.id === id);
        } catch (error) {
            console.error('Error getting contact:', error);
            return null;
        }
    }

    async createContact(contactData) {
        try {
            const contacts = await this.getContacts();
            
            // Generate unique ID
            const id = contactData.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
            
            const newContact = {
                id: id,
                name: contactData.name,
                phone: contactData.phone,
                email: contactData.email || '',
                company: contactData.company || '',
                tags: contactData.tags || [],
                customFields: contactData.customFields || {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            contacts.push(newContact);
            await fs.writeJson(this.contactsFile, contacts, { spaces: 2 });
            
            return newContact;
        } catch (error) {
            console.error('Error creating contact:', error);
            throw error;
        }
    }

    async updateContact(id, updateData) {
        try {
            const contacts = await this.getContacts();
            const contactIndex = contacts.findIndex(contact => contact.id === id);
            
            if (contactIndex === -1) {
                throw new Error('Contact not found');
            }
            
            // Update contact
            const updatedContact = {
                ...contacts[contactIndex],
                ...updateData,
                updatedAt: new Date().toISOString()
            };
            
            contacts[contactIndex] = updatedContact;
            await fs.writeJson(this.contactsFile, contacts, { spaces: 2 });
            
            return updatedContact;
        } catch (error) {
            console.error('Error updating contact:', error);
            throw error;
        }
    }

    async deleteContact(id) {
        try {
            const contacts = await this.getContacts();
            const filteredContacts = contacts.filter(contact => contact.id !== id);
            
            if (contacts.length === filteredContacts.length) {
                throw new Error('Contact not found');
            }
            
            await fs.writeJson(this.contactsFile, filteredContacts, { spaces: 2 });
            
            // Remove contact from all groups
            await this.removeContactFromAllGroups(id);
            
            return true;
        } catch (error) {
            console.error('Error deleting contact:', error);
            throw error;
        }
    }

    async searchContacts(query) {
        try {
            const contacts = await this.getContacts();
            const searchTerm = query.toLowerCase();
            
            return contacts.filter(contact => 
                contact.name.toLowerCase().includes(searchTerm) ||
                contact.phone.includes(searchTerm) ||
                contact.email.toLowerCase().includes(searchTerm) ||
                contact.company.toLowerCase().includes(searchTerm) ||
                contact.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            );
        } catch (error) {
            console.error('Error searching contacts:', error);
            return [];
        }
    }

    async importContactsFromCSV(csvData) {
        try {
            const contacts = await this.getContacts();
            const newContacts = [];
            
            // Parse CSV data
            const rows = csvData.split('\n');
            const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
            
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].split(',');
                if (row.length < 2) continue; // Skip empty rows
                
                const contactData = {};
                headers.forEach((header, index) => {
                    if (row[index]) {
                        contactData[header] = row[index].trim();
                    }
                });
                
                if (contactData.name && contactData.phone) {
                    const contact = await this.createContact({
                        name: contactData.name,
                        phone: contactData.phone,
                        email: contactData.email || '',
                        company: contactData.company || '',
                        tags: contactData.tags ? contactData.tags.split(';') : []
                    });
                    newContacts.push(contact);
                }
            }
            
            return newContacts;
        } catch (error) {
            console.error('Error importing contacts:', error);
            throw error;
        }
    }

    // Group Management
    async getGroups() {
        try {
            const groups = await fs.readJson(this.groupsFile);
            return groups;
        } catch (error) {
            console.error('Error reading groups:', error);
            return [];
        }
    }

    async getGroup(id) {
        try {
            const groups = await this.getGroups();
            return groups.find(group => group.id === id);
        } catch (error) {
            console.error('Error getting group:', error);
            return null;
        }
    }

    async createGroup(groupData) {
        try {
            const groups = await this.getGroups();
            
            // Generate unique ID
            const id = groupData.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
            
            const newGroup = {
                id: id,
                name: groupData.name,
                description: groupData.description || '',
                contactIds: groupData.contactIds || [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            groups.push(newGroup);
            await fs.writeJson(this.groupsFile, groups, { spaces: 2 });
            
            return newGroup;
        } catch (error) {
            console.error('Error creating group:', error);
            throw error;
        }
    }

    async updateGroup(id, updateData) {
        try {
            const groups = await this.getGroups();
            const groupIndex = groups.findIndex(group => group.id === id);
            
            if (groupIndex === -1) {
                throw new Error('Group not found');
            }
            
            // Update group
            const updatedGroup = {
                ...groups[groupIndex],
                ...updateData,
                updatedAt: new Date().toISOString()
            };
            
            groups[groupIndex] = updatedGroup;
            await fs.writeJson(this.groupsFile, groups, { spaces: 2 });
            
            return updatedGroup;
        } catch (error) {
            console.error('Error updating group:', error);
            throw error;
        }
    }

    async deleteGroup(id) {
        try {
            const groups = await this.getGroups();
            const filteredGroups = groups.filter(group => group.id !== id);
            
            if (groups.length === filteredGroups.length) {
                throw new Error('Group not found');
            }
            
            await fs.writeJson(this.groupsFile, filteredGroups, { spaces: 2 });
            return true;
        } catch (error) {
            console.error('Error deleting group:', error);
            throw error;
        }
    }

    async addContactToGroup(groupId, contactId) {
        try {
            const group = await this.getGroup(groupId);
            if (!group) {
                throw new Error('Group not found');
            }
            
            if (!group.contactIds.includes(contactId)) {
                group.contactIds.push(contactId);
                await this.updateGroup(groupId, { contactIds: group.contactIds });
            }
            
            return group;
        } catch (error) {
            console.error('Error adding contact to group:', error);
            throw error;
        }
    }

    async removeContactFromGroup(groupId, contactId) {
        try {
            const group = await this.getGroup(groupId);
            if (!group) {
                throw new Error('Group not found');
            }
            
            const updatedContactIds = group.contactIds.filter(id => id !== contactId);
            await this.updateGroup(groupId, { contactIds: updatedContactIds });
            
            return group;
        } catch (error) {
            console.error('Error removing contact from group:', error);
            throw error;
        }
    }

    async removeContactFromAllGroups(contactId) {
        try {
            const groups = await this.getGroups();
            
            for (const group of groups) {
                if (group.contactIds.includes(contactId)) {
                    await this.removeContactFromGroup(group.id, contactId);
                }
            }
        } catch (error) {
            console.error('Error removing contact from all groups:', error);
        }
    }

    async getGroupContacts(groupId) {
        try {
            const group = await this.getGroup(groupId);
            if (!group) {
                throw new Error('Group not found');
            }
            
            const contacts = await this.getContacts();
            return contacts.filter(contact => group.contactIds.includes(contact.id));
        } catch (error) {
            console.error('Error getting group contacts:', error);
            return [];
        }
    }

    // Utility methods
    async getContactTags() {
        try {
            const contacts = await this.getContacts();
            const allTags = new Set();
            
            contacts.forEach(contact => {
                contact.tags.forEach(tag => allTags.add(tag));
            });
            
            return Array.from(allTags).sort();
        } catch (error) {
            console.error('Error getting contact tags:', error);
            return [];
        }
    }

    async getContactsByTag(tag) {
        try {
            const contacts = await this.getContacts();
            return contacts.filter(contact => contact.tags.includes(tag));
        } catch (error) {
            console.error('Error getting contacts by tag:', error);
            return [];
        }
    }
}

const contactManager = new ContactManager();

module.exports = {
    contactManager,
    
    // API handlers
    getContacts: async (req, res) => {
        try {
            const { search, tag } = req.query;
            let contacts;
            
            if (search) {
                contacts = await contactManager.searchContacts(search);
            } else if (tag) {
                contacts = await contactManager.getContactsByTag(tag);
            } else {
                contacts = await contactManager.getContacts();
            }
            
            res.json({ success: true, contacts });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    getContact: async (req, res) => {
        try {
            const { id } = req.params;
            const contact = await contactManager.getContact(id);
            
            if (!contact) {
                return res.status(404).json({ success: false, message: 'Contact not found' });
            }
            
            res.json({ success: true, contact });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    createContact: async (req, res) => {
        try {
            const { name, phone, email, company, tags, customFields } = req.body;
            
            if (!name || !phone) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and phone are required'
                });
            }
            
            const contact = await contactManager.createContact({
                name,
                phone,
                email,
                company,
                tags: tags || [],
                customFields: customFields || {}
            });
            
            res.json({ success: true, contact });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    updateContact: async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            const contact = await contactManager.updateContact(id, updateData);
            res.json({ success: true, contact });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    deleteContact: async (req, res) => {
        try {
            const { id } = req.params;
            await contactManager.deleteContact(id);
            res.json({ success: true, message: 'Contact deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    getGroups: async (req, res) => {
        try {
            const groups = await contactManager.getGroups();
            res.json({ success: true, groups });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    createGroup: async (req, res) => {
        try {
            const { name, description, contactIds } = req.body;
            
            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'Group name is required'
                });
            }
            
            const group = await contactManager.createGroup({
                name,
                description,
                contactIds: contactIds || []
            });
            
            res.json({ success: true, group });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    updateGroup: async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            const group = await contactManager.updateGroup(id, updateData);
            res.json({ success: true, group });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    deleteGroup: async (req, res) => {
        try {
            const { id } = req.params;
            await contactManager.deleteGroup(id);
            res.json({ success: true, message: 'Group deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    getGroupContacts: async (req, res) => {
        try {
            const { id } = req.params;
            const contacts = await contactManager.getGroupContacts(id);
            res.json({ success: true, contacts });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    addContactToGroup: async (req, res) => {
        try {
            const { groupId, contactId } = req.params;
            const group = await contactManager.addContactToGroup(groupId, contactId);
            res.json({ success: true, group });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    removeContactFromGroup: async (req, res) => {
        try {
            const { groupId, contactId } = req.params;
            const group = await contactManager.removeContactFromGroup(groupId, contactId);
            res.json({ success: true, group });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    getContactTags: async (req, res) => {
        try {
            const tags = await contactManager.getContactTags();
            res.json({ success: true, tags });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    importContacts: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'CSV file is required'
                });
            }
            
            const csvData = req.file.buffer.toString('utf8');
            const newContacts = await contactManager.importContactsFromCSV(csvData);
            
            res.json({
                success: true,
                message: `Imported ${newContacts.length} contacts`,
                contacts: newContacts
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
