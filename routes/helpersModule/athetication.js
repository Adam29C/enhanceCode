const jwt=require("jsonwebtoken")
module.exports = async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        console.log("authHeaderauthHeaderauthHeader:::",authHeader)
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                status: "Failure",
                message: "Authorization token is missing or malformed",
            });
        }
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.jsonSecretToken);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(400).json({
                status: "Failure",
                message: "Token has expired",
            });
        } else if (error.name === "JsonWebTokenError") {
            return res.status(400).json({
                status: "Failure",
                message: "Invalid token",
            });
        } else {
            return res.status(500).json({
                status: "Failure",
                message: "Internal server error",
            });
        }
    }
};