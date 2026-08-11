'use strict';

const baseH = require('./helpers');
const { getReportSchema, findTabByLabel, fieldId } = require('./schemas');

function parseCsv(value) {
  if (!value || typeof value !== 'string') return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

function parseFieldsParam(raw) {
  if (!raw) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const map = new Map();
    for (const [tabId, val] of Object.entries(raw)) {
      const ids = Array.isArray(val) ? val : parseCsv(String(val));
      if (ids.length) map.set(tabId, new Set(ids));
    }
    return map.size ? map : null;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parseFieldsParam(parsed);
    } catch (_e) {
      // fall through
    }
    const map = new Map();
    for (const part of raw.split(';').map((s) => s.trim()).filter(Boolean)) {
      const [tabId, fieldList] = part.split(':');
      if (!tabId || !fieldList) continue;
      const ids = parseCsv(fieldList);
      if (ids.length) map.set(tabId, new Set(ids));
    }
    return map.size ? map : null;
  }
  return null;
}

function parseReportFilters(reportId, { tabs, fields } = {}) {
  const schema = getReportSchema(reportId);
  if (!schema) {
    return { tabs: null, fields: null, schema: null };
  }

  let tabSet = null;
  const tabIds = Array.isArray(tabs) ? tabs : parseCsv(tabs);
  if (tabIds.length) {
    const valid = new Set(schema.tabs.map((t) => t.id));
    tabSet = new Set(tabIds.filter((id) => valid.has(id)));
    if (!tabSet.size) tabSet = null;
  }

  let fieldMap = parseFieldsParam(fields);
  if (fieldMap?.size) {
    const validTabs = new Set(schema.tabs.map((t) => t.id));
    const cleaned = new Map();
    for (const [tabId, ids] of fieldMap.entries()) {
      if (!validTabs.has(tabId)) continue;
      const tab = schema.tabs.find((t) => t.id === tabId);
      const validFields = new Set(tab.fields.map((f) => f.id));
      const selected = new Set([...ids].filter((id) => validFields.has(id)));
      if (selected.size) cleaned.set(tabId, selected);
    }
    fieldMap = cleaned.size ? cleaned : null;
  }

  return { tabs: tabSet, fields: fieldMap, schema };
}

function filterTableColumns(headers, rows, tabSchema, selectedFieldIds) {
  if (!selectedFieldIds?.size || !tabSchema?.fields?.length) {
    return { headers, rows };
  }

  const labelToId = new Map(tabSchema.fields.map((f) => [f.label, f.id]));
  const indices = [];
  const outHeaders = [];

  headers.forEach((header, i) => {
    const id = labelToId.get(header) || fieldId(header);
    if (selectedFieldIds.has(id)) {
      indices.push(i);
      outHeaders.push(header);
    }
  });

  if (!indices.length) return { headers: [], rows: [] };

  return {
    headers: outHeaders,
    rows: rows.map((r) => indices.map((i) => r[i])),
  };
}

function filterKvPairs(pairs, tabSchema, selectedFieldIds) {
  if (!selectedFieldIds?.size || !tabSchema?.fields?.length) return pairs;
  const labelToId = new Map(tabSchema.fields.map((f) => [f.label, f.id]));
  return pairs.filter(([label]) => {
    const id = labelToId.get(label) || fieldId(label);
    return selectedFieldIds.has(id);
  });
}

function createNoopSheet(name = '') {
  let rows = 0;
  const sheet = {
    name,
    _skipped: true,
    get rowCount() { return rows; },
    addRow() {
      rows += 1;
      return sheet;
    },
    getRow() {
      return { font: {}, commit() {} };
    },
    columns: { forEach() {} },
  };
  return sheet;
}

function createReportHelpers(reportId, filters) {
  const schema = filters?.schema || getReportSchema(reportId);
  const tabSet = filters?.tabs || null;
  const fieldMap = filters?.fields || null;

  function includeTab(tab) {
    if (!tabSet?.size) return true;
    return tabSet.has(tab.id);
  }

  return {
    ...baseH,
    addSheet(wb, label) {
      const tab = findTabByLabel(schema, label);
      if (tab && !includeTab(tab)) return createNoopSheet(label);
      const ws = baseH.addSheet(wb, label);
      ws.name = label;
      return ws;
    },
    writeTable(ws, headers, rows) {
      if (!ws || ws._skipped) return;
      const tab = findTabByLabel(schema, ws.name);
      if (tab && fieldMap?.get(tab.id)?.size) {
        ({ headers, rows } = filterTableColumns(headers, rows, tab, fieldMap.get(tab.id)));
        if (!headers.length) return;
      }
      baseH.writeTable(ws, headers, rows);
    },
    writeKvSheet(ws, title, pairs) {
      if (!ws || ws._skipped) return;
      const tab = findTabByLabel(schema, ws.name);
      let filtered = pairs;
      if (tab && fieldMap?.get(tab.id)?.size) {
        filtered = filterKvPairs(pairs, tab, fieldMap.get(tab.id));
        if (!filtered.length) return;
      }
      baseH.writeKvSheet(ws, title, filtered);
    },
  };
}

module.exports = {
  parseReportFilters,
  createReportHelpers,
  filterTableColumns,
};
