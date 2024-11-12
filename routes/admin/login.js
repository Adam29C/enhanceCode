const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const admin = require("../../model/dashBoard/AdminModel");
const {
    registerAdminValidation,
    loginValidationadmin,
} = require("../../validation");

router.post("/registerAdmin", async (req, res) => {
    try {
        const apiKey = req.header("x-api-key");
        if (!apiKey) {
            return res.status(403).json({
                status: 0,
                message: "Access Denied. API Key missing",
            });
        }

        const decodedKey = Buffer.from(apiKey, "base64").toString("ascii");
        const validAPI = await bcrypt.compare(process.env.REGISTER_API_KEY, decodedKey);
        if (!validAPI) {
            return res.status(403).json({
                status: 0,
                message: "Access Denied. Invalid API Key",
            });
        }
        const { error } = registerAdminValidation(req.body);
        if (error) {
            return res.status(400).json({
                status: 0,
                message: "Validation Error",
                error: error.details[0].message,
            });
        }

        const userExists = await admin.findOne({
            $or: [
                { email: req.body.email },
                { username: req.body.username.toLowerCase().replace(/\s/g, "") },
                { mobile: req.body.mobile },
            ],
        });
        if (userExists) {
            return res.status(409).json({
                status: 0,
                message: "User Already Registered with provided email, username, or mobile",
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        const newUser = new admin({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            designation: req.body.designation,
            username: req.body.username.toLowerCase().replace(/\s/g, ""),
            role: req.body.role,
            mobile: req.body.mobile,
            banned: req.body.banned,
            loginStatus: "online",
            last_login: "Null",
            user_counter: req.body.user_counter,
            col_view_permission: req.body.col_view_permission,
        });
        const savedUser = await newUser.save();

        const responseData = { ...savedUser._doc };
        delete responseData.password;

        return res.status(201).json({
            status: 1,
            message: "Admin Registered Successfully",
            data: responseData,
        });
    } catch (error) {
        return res.status(500).json({
            status: 0,
            message: "Something Bad Happened. Please Contact Support",
            error: error.message,
        });
    }
});

router.post("/loginDashboard", async (req, res) => {
    try {
        const { error } = loginValidationadmin(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const username = req.body.user_username.toLowerCase().replace(/\s/g, "");
        const password = req.body.user_password;

        const user = await admin.findOne({ username });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.banned === 0) {
            return res.status(403).json({
                success: false,
                message: "You are banned by admin. Contact admin to unblock."
            });
        }

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }
        if (user.loginFor !== 0 && user.loginFor !== 1) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to login"
            });
        }

        await admin.updateOne({ _id: user._id }, { $set: { loginStatus: "Online" } });

        const token = jwt.sign(
            { key: user._id },
            process.env.jsonSecretToken,
            { expiresIn: "1h" }
        );

        req.session.colView = user.col_view_permission;
        req.session.details = {
            name: user.name,
            user_id: user._id,
            username: user.username,
            designation: user.designation,
            mobile: user.mobile,
            role: user.role,
        };
        req.session.token = token;

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: req.session.details,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "An error occurred during login",
            error: error.message
        });
    }
});

module.exports = router;