/**
 * Role EAV Service
 * 
 * This service provides EAV (Entity-Attribute-Value) functionality for Role permissions.
 * It implements the "EAV for Dynamic Permissions" pattern as specified in the requirements.
 * 
 * Key Features:
 * - Get/set role permissions via EAV attributes
 * - Check if a role has a specific permission
 * - Aggregate permissions across multiple roles (for multi-role users)
 * - Initialize default permissions for new roles
 * 
 * EAV Entity Type: 'Role'
 * Permission attributes are stored in attribute_values with entityType='Role'
 */

const { sequelize } = require('../config/db');
const { QueryTypes } = require('sequelize');

// Cache for attribute definitions to reduce database queries
let attributeDefinitionCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get attribute definitions for Role entity type
 * @returns {Promise<Array>} Array of attribute definitions
 */
async function getAttributeDefinitions() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (attributeDefinitionCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return attributeDefinitionCache;
  }
  
  const definitions = await sequelize.query(
    `SELECT ad.id, ad.name, ad."displayName", ad.description, ad."valueType", ad."defaultValue"
     FROM attribute_definitions ad
     JOIN entity_types et ON ad."entityTypeId" = et.id
     WHERE et.name = 'Role' AND et."deletedAt" IS NULL AND ad."deletedAt" IS NULL AND ad."isActive" = true
     ORDER BY ad."sortOrder"`,
    { type: QueryTypes.SELECT }
  );
  
  attributeDefinitionCache = definitions;
  cacheTimestamp = now;
  
  return definitions;
}

/**
 * Clear the attribute definition cache
 */
function clearCache() {
  attributeDefinitionCache = null;
  cacheTimestamp = null;
}

/**
 * Get all permission attributes for a specific role
 * @param {string} roleId - The role ID
 * @returns {Promise<Object>} Object containing success status and permission data
 */
async function getRolePermissions(roleId) {
  try {
    const permissions = await sequelize.query(
      `SELECT ad.name, ad."valueType", ad."defaultValue",
              av."valueString", av."valueInteger", av."valueDecimal", 
              av."valueBoolean", av."valueDate", av."valueDatetime", 
              av."valueText", av."valueJson"
       FROM attribute_definitions ad
       JOIN entity_types et ON ad."entityTypeId" = et.id
       LEFT JOIN attribute_values av ON ad.id = av."attributeId" 
         AND av."entityType" = 'Role' AND av."entityId" = :roleId AND av."deletedAt" IS NULL
       WHERE et.name = 'Role' AND et."deletedAt" IS NULL AND ad."deletedAt" IS NULL AND ad."isActive" = true
       ORDER BY ad."sortOrder"`,
      {
        type: QueryTypes.SELECT,
        replacements: { roleId }
      }
    );
    
    const result = {};
    
    for (const perm of permissions) {
      let value = getValueByType(perm);
      
      // If no value set, use default
      if (value === null || value === undefined) {
        value = parseDefaultValue(perm.defaultValue, perm.valueType);
      }
      
      result[perm.name] = value;
    }
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting role permissions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a specific permission value for a role
 * @param {string} roleId - The role ID
 * @param {string} permissionName - The permission attribute name
 * @returns {Promise<Object>} Object containing success status and permission value
 */
async function getRolePermission(roleId, permissionName) {
  try {
    const result = await sequelize.query(
      `SELECT ad.name, ad."valueType", ad."defaultValue",
              av."valueString", av."valueInteger", av."valueDecimal", 
              av."valueBoolean", av."valueDate", av."valueDatetime", 
              av."valueText", av."valueJson"
       FROM attribute_definitions ad
       JOIN entity_types et ON ad."entityTypeId" = et.id
       LEFT JOIN attribute_values av ON ad.id = av."attributeId" 
         AND av."entityType" = 'Role' AND av."entityId" = :roleId AND av."deletedAt" IS NULL
       WHERE et.name = 'Role' AND ad.name = :permissionName 
         AND et."deletedAt" IS NULL AND ad."deletedAt" IS NULL AND ad."isActive" = true`,
      {
        type: QueryTypes.SELECT,
        replacements: { roleId, permissionName }
      }
    );
    
    if (result.length === 0) {
      return { success: false, error: `Permission '${permissionName}' not found` };
    }
    
    let value = getValueByType(result[0]);
    
    if (value === null || value === undefined) {
      value = parseDefaultValue(result[0].defaultValue, result[0].valueType);
    }
    
    return { success: true, data: { name: permissionName, value } };
  } catch (error) {
    console.error('Error getting role permission:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Set a permission value for a role using upsert pattern
 * Uses PostgreSQL ON CONFLICT for atomic upsert to prevent race conditions
 * and work with the unique constraint on (entityType, entityId, attributeId)
 * 
 * @param {string} roleId - The role ID
 * @param {string} permissionName - The permission attribute name
 * @param {any} value - The permission value to set
 * @returns {Promise<Object>} Object containing success status
 */
async function setRolePermission(roleId, permissionName, value) {
  const transaction = await sequelize.transaction();
  
  try {
    // Get attribute definition
    const attrDef = await sequelize.query(
      `SELECT ad.id, ad."valueType"
       FROM attribute_definitions ad
       JOIN entity_types et ON ad."entityTypeId" = et.id
       WHERE et.name = 'Role' AND ad.name = :permissionName 
         AND et."deletedAt" IS NULL AND ad."deletedAt" IS NULL AND ad."isActive" = true`,
      {
        type: QueryTypes.SELECT,
        replacements: { permissionName },
        transaction
      }
    );
    
    if (attrDef.length === 0) {
      await transaction.rollback();
      return { success: false, error: `Permission '${permissionName}' not defined` };
    }
    
    const { id: attributeId, valueType } = attrDef[0];
    
    // Prepare value columns for upsert
    const valueColumns = prepareValueColumnsForRole(value, valueType);
    
    // Use upsert with ON CONFLICT for atomic operation
    const [upsertResult] = await sequelize.query(
      `INSERT INTO attribute_values 
       (id, "attributeId", "entityType", "entityId", "valueType",
        "valueString", "valueInteger", "valueDecimal", "valueBoolean",
        "valueDate", "valueDatetime", "valueText", "valueJson",
        "sortOrder", "createdAt", "updatedAt", "deletedAt")
       VALUES (gen_random_uuid(), :attributeId, 'Role', :roleId, :valueType,
               :valueString, :valueInteger, :valueDecimal, :valueBoolean,
               :valueDate, :valueDatetime, :valueText, :valueJson,
               0, NOW(), NOW(), NULL)
       ON CONFLICT ("entityType", "entityId", "attributeId") 
       WHERE "deletedAt" IS NULL
       DO UPDATE SET
         "valueString" = EXCLUDED."valueString",
         "valueInteger" = EXCLUDED."valueInteger",
         "valueDecimal" = EXCLUDED."valueDecimal",
         "valueBoolean" = EXCLUDED."valueBoolean",
         "valueDate" = EXCLUDED."valueDate",
         "valueDatetime" = EXCLUDED."valueDatetime",
         "valueText" = EXCLUDED."valueText",
         "valueJson" = EXCLUDED."valueJson",
         "updatedAt" = NOW()
       RETURNING id, (xmax = 0) AS inserted`,
      {
        replacements: {
          attributeId,
          roleId,
          valueType,
          ...valueColumns,
        },
        type: QueryTypes.SELECT,
        transaction
      }
    );
    
    await transaction.commit();
    
    const wasInserted = upsertResult?.inserted === true;
    return { 
      success: true, 
      data: { 
        name: permissionName, 
        value,
        action: wasInserted ? 'created' : 'updated'
      } 
    };
  } catch (error) {
    await transaction.rollback();
    console.error('Error setting role permission:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Prepare value columns for upsert based on value type
 * @param {any} value - The value to store
 * @param {string} valueType - The type of the value
 * @returns {Object} Object with all value columns
 */
function prepareValueColumnsForRole(value, valueType) {
  const columns = {
    valueString: null,
    valueInteger: null,
    valueDecimal: null,
    valueBoolean: null,
    valueDate: null,
    valueDatetime: null,
    valueText: null,
    valueJson: null,
  };

  if (value === null || value === undefined) {
    return columns;
  }

  switch (valueType) {
    case 'string':
      columns.valueString = String(value).substring(0, 500);
      break;
    case 'integer':
      columns.valueInteger = parseInt(value, 10);
      break;
    case 'decimal':
      columns.valueDecimal = parseFloat(value);
      break;
    case 'boolean':
      columns.valueBoolean = Boolean(value);
      break;
    case 'date':
      columns.valueDate = value instanceof Date ? value.toISOString().split('T')[0] : value;
      break;
    case 'datetime':
      columns.valueDatetime = value instanceof Date ? value : new Date(value);
      break;
    case 'text':
      columns.valueText = String(value);
      break;
    case 'json':
      columns.valueJson = typeof value === 'string' ? value : JSON.stringify(value);
      break;
    default:
      columns.valueString = String(value).substring(0, 500);
  }

  return columns;
}

/**
 * Set multiple permissions for a role at once
 * @param {string} roleId - The role ID
 * @param {Object} permissions - Object mapping permission names to values
 * @returns {Promise<Object>} Object containing success status
 */
async function bulkSetRolePermissions(roleId, permissions) {
  const results = [];
  let successCount = 0;
  let failureCount = 0;
  
  for (const [name, value] of Object.entries(permissions)) {
    const result = await setRolePermission(roleId, name, value);
    results.push({ name, ...result });
    
    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }
  }
  
  return {
    success: failureCount === 0,
    successCount,
    failureCount,
    results
  };
}

/**
 * Check if a role has a specific boolean permission
 * @param {string} roleId - The role ID
 * @param {string} permissionName - The permission to check
 * @returns {Promise<boolean>} Whether the role has the permission
 */
async function hasPermission(roleId, permissionName) {
  const result = await getRolePermission(roleId, permissionName);
  
  if (!result.success) {
    return false;
  }
  
  return result.data.value === true;
}

/**
 * Check if any of the given roles has a specific permission
 * @param {Array<string>} roleIds - Array of role IDs
 * @param {string} permissionName - The permission to check
 * @returns {Promise<boolean>} Whether any role has the permission
 */
async function anyRoleHasPermission(roleIds, permissionName) {
  if (!roleIds || roleIds.length === 0) {
    return false;
  }
  
  for (const roleId of roleIds) {
    if (await hasPermission(roleId, permissionName)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get aggregated permissions for multiple roles (OR logic for booleans, MAX for numbers)
 * @param {Array<string>} roleIds - Array of role IDs
 * @returns {Promise<Object>} Aggregated permissions
 */
async function getAggregatedPermissions(roleIds) {
  try {
    if (!roleIds || roleIds.length === 0) {
      return { success: true, data: {} };
    }
    
    const allPermissions = [];
    
    for (const roleId of roleIds) {
      const result = await getRolePermissions(roleId);
      if (result.success) {
        allPermissions.push(result.data);
      }
    }
    
    if (allPermissions.length === 0) {
      return { success: true, data: {} };
    }
    
    // Aggregate permissions (OR for booleans, MAX for numbers)
    const aggregated = { ...allPermissions[0] };
    const definitions = await getAttributeDefinitions();
    const defMap = {};
    for (const def of definitions) {
      defMap[def.name] = def;
    }
    
    for (let i = 1; i < allPermissions.length; i++) {
      const perms = allPermissions[i];
      
      for (const [name, value] of Object.entries(perms)) {
        const def = defMap[name];
        
        if (!def) continue;
        
        switch (def.valueType) {
          case 'boolean':
            // OR logic for boolean permissions
            aggregated[name] = aggregated[name] || value;
            break;
          case 'integer':
          case 'decimal':
            // MAX logic for numeric permissions
            aggregated[name] = Math.max(aggregated[name] || 0, value || 0);
            break;
          case 'json':
            // Merge arrays, or take the latest object
            if (Array.isArray(value) && Array.isArray(aggregated[name])) {
              aggregated[name] = [...new Set([...aggregated[name], ...value])];
            } else if (typeof value === 'object' && typeof aggregated[name] === 'object') {
              aggregated[name] = { ...aggregated[name], ...value };
            }
            break;
          default:
            // For strings, take the first non-empty value
            if (!aggregated[name] && value) {
              aggregated[name] = value;
            }
        }
      }
    }
    
    return { success: true, data: aggregated };
  } catch (error) {
    console.error('Error getting aggregated permissions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get aggregated permissions for a user based on their roles
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} Aggregated permissions
 */
async function getUserPermissions(userId) {
  try {
    // Get all role IDs for the user
    const userRoles = await sequelize.query(
      `SELECT "roleId" FROM user_roles WHERE "userId" = :userId`,
      {
        type: QueryTypes.SELECT,
        replacements: { userId }
      }
    );
    
    const roleIds = userRoles.map(ur => ur.roleId);
    
    return await getAggregatedPermissions(roleIds);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if a user has a specific permission (considering all their roles)
 * @param {string} userId - The user ID
 * @param {string} permissionName - The permission to check
 * @returns {Promise<boolean>} Whether the user has the permission
 */
async function userHasPermission(userId, permissionName) {
  try {
    const userRoles = await sequelize.query(
      `SELECT "roleId" FROM user_roles WHERE "userId" = :userId`,
      {
        type: QueryTypes.SELECT,
        replacements: { userId }
      }
    );
    
    const roleIds = userRoles.map(ur => ur.roleId);
    
    return await anyRoleHasPermission(roleIds, permissionName);
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
}

/**
 * Get available permission definitions
 * @returns {Promise<Object>} Object containing success status and definitions
 */
async function getAvailablePermissions() {
  try {
    const definitions = await getAttributeDefinitions();
    return { success: true, data: definitions };
  } catch (error) {
    console.error('Error getting available permissions:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getValueByType(row) {
  switch (row.valueType) {
    case 'boolean':
      return row.valueBoolean;
    case 'integer':
      return row.valueInteger ? parseInt(row.valueInteger, 10) : null;
    case 'decimal':
      return row.valueDecimal ? parseFloat(row.valueDecimal) : null;
    case 'string':
      return row.valueString;
    case 'text':
      return row.valueText;
    case 'date':
      return row.valueDate;
    case 'datetime':
      return row.valueDatetime;
    case 'json':
      return row.valueJson;
    default:
      return row.valueString;
  }
}

function parseDefaultValue(defaultValue, valueType) {
  if (defaultValue === null || defaultValue === undefined) {
    return null;
  }
  
  switch (valueType) {
    case 'boolean':
      return defaultValue === 'true' || defaultValue === true;
    case 'integer':
      return parseInt(defaultValue, 10);
    case 'decimal':
      return parseFloat(defaultValue);
    case 'json':
      try {
        return JSON.parse(defaultValue);
      } catch {
        return defaultValue;
      }
    default:
      return defaultValue;
  }
}

function getValueColumn(valueType) {
  switch (valueType) {
    case 'boolean':
      return '"valueBoolean"';
    case 'integer':
      return '"valueInteger"';
    case 'decimal':
      return '"valueDecimal"';
    case 'string':
      return '"valueString"';
    case 'text':
      return '"valueText"';
    case 'date':
      return '"valueDate"';
    case 'datetime':
      return '"valueDatetime"';
    case 'json':
      return '"valueJson"';
    default:
      return '"valueString"';
  }
}

function formatValueForInsert(value, valueType) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  switch (valueType) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'integer':
    case 'decimal':
      return value.toString();
    case 'json':
      return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
    case 'string':
    case 'text':
      return `'${value.toString().replace(/'/g, "''")}'`;
    case 'date':
    case 'datetime':
      return `'${value}'`;
    default:
      return `'${value.toString().replace(/'/g, "''")}'`;
  }
}

module.exports = {
  // Role permission operations
  getRolePermissions,
  getRolePermission,
  setRolePermission,
  bulkSetRolePermissions,
  hasPermission,
  anyRoleHasPermission,
  
  // User permission operations (aggregated across roles)
  getUserPermissions,
  userHasPermission,
  
  // Aggregation
  getAggregatedPermissions,
  
  // Metadata
  getAvailablePermissions,
  getAttributeDefinitions,
  
  // Cache management
  clearCache,
};
