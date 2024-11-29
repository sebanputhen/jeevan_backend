const mongoose = require("mongoose");

const parishSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    building: {
      type: String,
      required: false,
    },
    forane: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Forane",
      required: true,
    },
    phone: {
      type: String,
      required: false,
    },
    street: {
      type: String,
    },
    city: {
      type: String,
      required: false,
    },
    district: {
      type: String,
      required: false,
    },
    state: {
      type: String,
      required: false,
    },
    pincode: {
      type: String,
      required: false,
    }
  },
  {
    timestamps: true,
  }
);

const Parish = mongoose.model("Parish", parishSchema);
module.exports = Parish;
