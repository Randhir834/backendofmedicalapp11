import mongoose from "mongoose";
import Doctor from "../models/doctor.model.js";
import Patient from "../models/patient.model.js";
import Referral from "../models/referral.model.js";

function isValidObjectId(id) {
  return Boolean(id) && mongoose.Types.ObjectId.isValid(String(id));
}

function mapDoctorToMini(doctorDoc) {
  const d = doctorDoc || {};
  return {
    id: d._id?.toString?.() ?? "",
    fullName: d.fullName ?? "",
    specialty: d.specialty ?? "",
  };
}

function mapReferral(doc) {
  const r = doc || {};
  return {
    id: r._id?.toString?.() ?? "",
    status: r.status ?? "pending",
    respondedAt: r.respondedAt ? new Date(r.respondedAt).toISOString() : null,
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
    patientId: r.patientId?._id ? r.patientId._id.toString() : r.patientId?.toString?.() ?? "",
    fromDoctor: r.fromDoctorId?._id ? mapDoctorToMini(r.fromDoctorId) : null,
    toDoctor: r.toDoctorId?._id ? mapDoctorToMini(r.toDoctorId) : null,
  };
}

export async function createReferral(req, res, next) {
  try {
    const userId = String(req.user?.sub || "").trim();
    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const doctor = await Doctor.findOne({ userId }).select({ _id: 1 }).lean();
    if (!doctor) {
      return res.status(403).json({ success: false, message: "Only doctors can refer patients" });
    }

    const patientId = String(req.body?.patientId || "").trim();
    const toDoctorId = String(req.body?.toDoctorId || "").trim();

    if (!isValidObjectId(patientId)) {
      return res.status(400).json({ success: false, message: "Valid patientId is required" });
    }
    if (!isValidObjectId(toDoctorId)) {
      return res.status(400).json({ success: false, message: "Valid toDoctorId is required" });
    }

    if (String(doctor._id) === String(toDoctorId)) {
      return res.status(400).json({ success: false, message: "Cannot refer to yourself" });
    }

    const [patientExists, toDoctorExists] = await Promise.all([
      Patient.findById(patientId).select({ _id: 1 }).lean(),
      Doctor.findById(toDoctorId).select({ _id: 1 }).lean(),
    ]);

    if (!patientExists) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }
    if (!toDoctorExists) {
      return res.status(404).json({ success: false, message: "Referred doctor not found" });
    }

    const pending = await Referral.findOne({
      patientId: new mongoose.Types.ObjectId(patientId),
      status: "pending",
    })
      .select({ _id: 1 })
      .lean();

    if (pending) {
      return res.status(409).json({ success: false, message: "Patient already has a pending referral" });
    }

    const created = await Referral.create({
      patientId: new mongoose.Types.ObjectId(patientId),
      fromDoctorId: new mongoose.Types.ObjectId(doctor._id),
      toDoctorId: new mongoose.Types.ObjectId(toDoctorId),
      status: "pending",
      respondedAt: null,
    });

    const populated = await Referral.findById(created._id)
      .populate({ path: "fromDoctorId", select: "fullName specialty" })
      .populate({ path: "toDoctorId", select: "fullName specialty" })
      .lean();

    return res.status(201).json({ success: true, referral: mapReferral(populated) });
  } catch (err) {
    return next(err);
  }
}

export async function getMyPendingReferral(req, res, next) {
  try {
    const userId = String(req.user?.sub || "").trim();
    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const patient = await Patient.findOne({ userId }).select({ _id: 1 }).lean();
    if (!patient) {
      return res.status(403).json({ success: false, message: "Only patients can view referrals" });
    }

    const referral = await Referral.findOne({ patientId: patient._id, status: "pending" })
      .sort({ createdAt: -1 })
      .populate({ path: "fromDoctorId", select: "fullName specialty" })
      .populate({ path: "toDoctorId", select: "fullName specialty" })
      .lean();

    return res.status(200).json({ success: true, referral: referral ? mapReferral(referral) : null });
  } catch (err) {
    return next(err);
  }
}

export async function respondToMyReferral(req, res, next) {
  try {
    const userId = String(req.user?.sub || "").trim();
    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const patient = await Patient.findOne({ userId }).select({ _id: 1 }).lean();
    if (!patient) {
      return res.status(403).json({ success: false, message: "Only patients can respond to referrals" });
    }

    const referralId = String(req.params?.referralId || "").trim();
    if (!isValidObjectId(referralId)) {
      return res.status(400).json({ success: false, message: "Valid referralId is required" });
    }

    const action = String(req.body?.action || "").trim().toLowerCase();
    const nextStatus = action === "accept" ? "accepted" : action === "deny" ? "denied" : null;
    if (!nextStatus) {
      return res.status(400).json({ success: false, message: "Valid action is required (accept/deny)" });
    }

    const referral = await Referral.findOne({ _id: referralId, patientId: patient._id })
      .populate({ path: "fromDoctorId", select: "fullName specialty" })
      .populate({ path: "toDoctorId", select: "fullName specialty" })
      .lean();

    if (!referral) {
      return res.status(404).json({ success: false, message: "Referral not found" });
    }

    if (referral.status !== "pending") {
      return res.status(409).json({ success: false, message: "Referral already responded" });
    }

    await Referral.updateOne(
      { _id: referral._id },
      { $set: { status: nextStatus, respondedAt: new Date(), updatedAt: new Date() } }
    );

    const updated = await Referral.findById(referral._id)
      .populate({ path: "fromDoctorId", select: "fullName specialty" })
      .populate({ path: "toDoctorId", select: "fullName specialty" })
      .lean();

    return res.status(200).json({ success: true, referral: mapReferral(updated) });
  } catch (err) {
    return next(err);
  }
}
