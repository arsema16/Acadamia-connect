/**
 * Shared RBAC middleware for Academia Connect V2.
 *
 * requireAuth(role) — returns a middleware function that:
 *   - Returns HTTP 401 if no active session (unauthenticated)
 *   - Returns HTTP 403 if the session role does not match the required role
 *   - Calls next() if the session is valid and the role matches
 *
 * Pass null or omit role to only check for an active session (any role).
 */
function requireAuth(role) {
  return function (req, res, next) {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (role && req.session.role !== role) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    
    // Attach user context to request for convenience
    req.userId = req.session.userId;
    req.userRole = req.session.role;
    req.schoolId = req.session.schoolId;
    req.userName = req.session.name;
    
    next();
  };
}

/**
 * Combined authentication and school isolation middleware
 * Ensures user is authenticated and has school context
 */
function requireAuthWithSchool(role) {
  return function (req, res, next) {
    // First check authentication
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    
    // Check role if specified
    if (role && req.session.role !== role) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    
    // Check school context
    if (!req.session.schoolId) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized - No school context" 
      });
    }
    
    // Attach user and school context to request
    req.userId = req.session.userId;
    req.userRole = req.session.role;
    req.schoolId = req.session.schoolId;
    req.userName = req.session.name;
    
    next();
  };
}

module.exports = { requireAuth, requireAuthWithSchool };
