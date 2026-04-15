import mongoose from "mongoose";

const referralSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    fromDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    toDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "denied"],
      default: "pending",
      index: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

referralSchema.index({ patientId: 1, status: 1 });
referralSchema.index({ fromDoctorId: 1, status: 1 });
referralSchema.index({ toDoctorId: 1, status: 1 });

const Referral = mongoose.models.Referral || mongoose.model("Referral", referralSchema);

export default Referral;
