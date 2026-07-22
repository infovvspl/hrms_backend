const pool = require("../config/database");

/**
 * Middleware to check if the current user has the required permission.
 * Company admins automatically bypass this check.
 * Employees are checked against their assigned role's permissions.
 *
 * @param {string} requiredPermission - The name of the required permission (e.g., "Leave Management")
 */
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const { role, id } = req.user;

      // 1. Company admin automatically has all permissions
      if (role === "company") {
        return next();
      }

      // 2. Fetch the employee's role info from the database
      const empResult = await pool.query(
        `SELECT u.role_id, r.role_name 
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.id
         WHERE u.id = $1`,
        [id]
      );

      if (empResult.rows.length === 0 || !empResult.rows[0].role_id) {
        return res.status(403).json({
          success: false,
          message: "Access Denied: No role assigned to your account.",
        });
      }

      const { role_id, role_name } = empResult.rows[0];

      // 3. Admin/Manager roles automatically bypass permission checks
      const adminRoles = ["HR Manager", "Super Admin", "IT Admin", "Admin"];
      if (adminRoles.includes(role_name)) {
        return next();
      }

      // 3. Check if the role_id is mapped to the required permission
      const permsResult = await pool.query(
        `SELECT p.name 
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = $1 AND p.name = $2`,
        [role_id, requiredPermission]
      );

      if (permsResult.rows.length > 0) {
        return next();
      }

      // 4. If permission is not found, deny access
      return res.status(403).json({
        success: false,
        message: `Access Denied: Requires '${requiredPermission}' permission.`,
      });
    } catch (error) {
      console.error("RBAC Middleware Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during permission check.",
      });
    }
  };
};

module.exports = checkPermission;
