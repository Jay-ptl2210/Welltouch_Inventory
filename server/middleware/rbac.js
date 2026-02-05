const authorize = (module, level = 'view') => {
    return (req, res, next) => {
        const user = req.user;

        // Super user has access to everything
        if (user.role === 'super_user') {
            return next();
        }

        // Admin might have specific permissions, or we can treat them as having all view access
        // For this implementation, we follow the granular permissions for everyone except super_user

        const userPermissions = user.permissions || {};
        const modulePermission = userPermissions[module] || 'none';

        if (level === 'view') {
            if (modulePermission === 'view' || modulePermission === 'edit') {
                return next();
            }
        } else if (level === 'edit') {
            if (modulePermission === 'edit') {
                return next();
            }
        }

        return res.status(403).json({
            success: false,
            error: `Access denied. You do not have ${level} permission for ${module}.`
        });
    };
};

const isSuperUser = (req, res, next) => {
    if (req.user && req.user.role === 'super_user') {
        return next();
    }
    return res.status(403).json({
        success: false,
        error: 'Access denied. Super User only.'
    });
};

module.exports = { authorize, isSuperUser };
