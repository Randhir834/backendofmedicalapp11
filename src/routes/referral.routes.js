import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { createReferral, getMyPendingReferral, respondToMyReferral } from "../controllers/referral.controller.js";

const router = Router();

// Doctor: create a referral for a patient
router.post("/", authMiddleware, createReferral);

// Patient: get my pending referral (if any)
router.get("/me/pending", authMiddleware, getMyPendingReferral);

// Patient: accept/deny referral
router.put("/:referralId/respond", authMiddleware, respondToMyReferral);

export default router;
