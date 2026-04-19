/**
 * School Isolation Middleware for Academia Connect V2
 * Ensures complete data separation between schools by enforcing school_id filtering
 * on all database queries and API requests.
 */

/**
 * Middleware to enforce school isolation for all API routes
 * Attaches the authenticated user's school_id to the request object
 * and ensures all subsequent database queries are filtered by school_id
 */
function enforceSchoolIsolation(req, res, next) {
  // Check if user is authenticated and has a school_id
  if (!req.session || !req.session.schoolId) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized - No school context' 
    });
  }
  
  // Attach school_id to request for use in route handlers
  req.schoolId = req.session.schoolId;
  req.userId = req.session.userId;
  req.userRole = req.session.role;
  
  next();
}

/**
 * Middleware to validate that a resource belongs to the authenticated user's school
 * Used for routes that access specific resources by ID
 */
function validateSchoolAccess(tableName, idField = 'id') {
  return (req, res, next) => {
    const resourceId = req.params[idField] || req.body[idField];
    
    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: 'Resource ID is required'
      });
    }
    
    // Import db here to avoid circular dependencies
    const { db } = require('../db/database');
    
    try {
      // Check if the resource belongs to the user's school
      const resource = db.prepare(`SELECT school_id FROM ${tableName} WHERE id = ?`).get(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }
      
      if (resource.school_id !== req.schoolId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - Resource belongs to different school'
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error validating school access'
      });
    }
  };
}

/**
 * Middleware to ensure user can only access their own data
 * Used for student/teacher/parent routes where users should only see their own records
 */
function validateUserAccess(req, res, next) {
  const requestedUserId = req.params.userId || req.params.id;
  
  // If no specific user ID is requested, allow (for listing own data)
  if (!requestedUserId) {
    return next();
  }
  
  // Check if user is trying to access their own data
  if (parseInt(requestedUserId) !== req.userId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied - Can only access your own data'
    });
  }
  
  next();
}

/**
 * Helper function to add school_id filter to database queries
 * This should be used in all route handlers to ensure school isolation
 */
function addSchoolFilter(baseQuery, schoolId) {
  // Add WHERE clause if it doesn't exist, or AND if it does
  if (baseQuery.toLowerCase().includes('where')) {
    return `${baseQuery} AND school_id = ${schoolId}`;
  } else {
    return `${baseQuery} WHERE school_id = ${schoolId}`;
  }
}

/**
 * Helper function to validate and add school_id to INSERT queries
 */
function addSchoolIdToInsert(data, schoolId) {
  return {
    ...data,
    school_id: schoolId
  };
}

module.exports = {
  enforceSchoolIsolation,
  validateSchoolAccess,
  validateUserAccess,
  addSchoolFilter,
  addSchoolIdToInsert
};