#!/usr/bin/env node

/**
 * Simple script to add an admin to the database.
 * Usage: node scripts/add-admin.js [email]
 * 
 * This script connects to MongoDB and adds the specified email
 * as an admin in the Admin collection.
 */

import mongoose from "mongoose";
import Admin from "../src/models/admin.model.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

async function addAdmin(email) {
  try {
    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is required");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB successfully");

    // Normalize and validate email
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      throw new Error(`Invalid email format: ${email}`);
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: normalizedEmail });
    if (existingAdmin) {
      console.log(`Admin with email ${normalizedEmail} already exists`);
      console.log("Admin ID:", existingAdmin._id.toString());
      console.log("Created at:", existingAdmin.createdAt);
      return;
    }

    // Create new admin
    const admin = await Admin.create({
      email: normalizedEmail,
      createdByEmail: "script", // Indicates this was created via script
    });

    console.log(`✅ Successfully added admin: ${normalizedEmail}`);
    console.log("Admin ID:", admin._id.toString());
    console.log("Created at:", admin.createdAt);

  } catch (error) {
    console.error("❌ Error adding admin:", error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
}

async function listAdmins() {
  try {
    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is required");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB successfully");

    // List all admins
    const admins = await Admin.find({}).sort({ createdAt: 1 });
    
    if (admins.length === 0) {
      console.log("No admins found in the database");
    } else {
      console.log(`Found ${admins.length} admin(s):`);
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. Email: ${admin.email}`);
        console.log(`   ID: ${admin._id.toString()}`);
        console.log(`   Created: ${admin.createdAt}`);
        console.log(`   Created by: ${admin.createdByEmail || 'N/A'}`);
        console.log();
      });
    }

  } catch (error) {
    console.error("❌ Error listing admins:", error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

if (command === 'list') {
  listAdmins();
} else if (command && isValidEmail(command)) {
  addAdmin(command);
} else if (process.env.ADMIN_EMAIL) {
  console.log(`Using ADMIN_EMAIL from environment: ${process.env.ADMIN_EMAIL}`);
  addAdmin(process.env.ADMIN_EMAIL);
} else {
  console.log("Usage:");
  console.log("  node scripts/add-admin.js <email>  - Add specific email as admin");
  console.log("  node scripts/add-admin.js list     - List all admins");
  console.log("  node scripts/add-admin.js          - Use ADMIN_EMAIL from .env file");
  console.log();
  console.log("Examples:");
  console.log("  node scripts/add-admin.js admin@example.com");
  console.log("  node scripts/add-admin.js list");
  process.exit(1);
}