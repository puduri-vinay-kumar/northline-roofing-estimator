import * as sqlite from './db.js';
import * as postgres from './postgres.js';

const store = process.env.DATABASE_URL ? postgres : sqlite;

export const openDatabase = (...args) => store.openDatabase(...args);
export const getPublishedConfig = (...args) => store.getPublishedConfig(...args);
export const getEditableConfig = (...args) => store.getEditableConfig(...args);
export const saveDraft = (...args) => store.saveDraft(...args);
export const publishDraft = (...args) => store.publishDraft(...args);
export const listLeads = (...args) => store.listLeads(...args);
export const insertLead = (...args) => store.insertLead(...args);
