/**
 * tpex-healthcare-backend\src\config\mail.js
 *
 * Auto-generated documentation comments.
 */
 import nodemailer from "nodemailer";

 /**
  * createTransporter.
  */
 /**
  * createTransporter.
  */
 /**
  * createTransporter.
  */
 export function createTransporter() {
   const service = process.env.EMAIL_SERVICE;
   const host = process.env.EMAIL_HOST;
   const port = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined;
   const secure = process.env.EMAIL_SECURE ? process.env.EMAIL_SECURE === "true" : undefined;
   const user = process.env.EMAIL_USER;
   const pass = process.env.EMAIL_PASS;

   if ((!service && !host) || !user || !pass) {
     const err = new Error("Email configuration missing: EMAIL_SERVICE or EMAIL_HOST, and EMAIL_USER/EMAIL_PASS");
     err.statusCode = 500;
     throw err;
   }

   const base = {
     auth: {
       user,
       pass,
     },
     connectionTimeout: 15_000,
     greetingTimeout: 15_000,
     socketTimeout: 20_000,
   };

   if (host) {
     return nodemailer.createTransport({
       ...base,
       host,
       port: port ?? 587,
       secure: secure ?? false,
     });
   }

   return nodemailer.createTransport({
     ...base,
     service,
   });
 }
