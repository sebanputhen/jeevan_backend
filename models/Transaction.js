const mongoose = require("mongoose");
const { parse, format, isAfter } = require("date-fns");

const transactionSchema = new mongoose.Schema(
  {
    forane: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Forane",
      required: true,
    },
    parish: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parish",
      required: true,
    },
    family: {
      type: String,
      required: true,
    },
    person: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Person",
      required: true,
    },
    amountPaid: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: function () {
        const formattedDate = format(new Date(), "dd/MM/yyyy");
        return parse(formattedDate, "dd/MM/yyyy", new Date());
      },
      validate: {
        validator: function (value,err) {
          return !isAfter(value, new Date());
        },
        message: "Date cannot be after today.",
      },
      set: function (value) {
        if (typeof value === "string") {
          return parse(value, "dd/MM/yyyy", new Date());
        }
        return value;
      },
      get: function (value) {
        return value ? format(value, "dd/MM/yyyy") : null;
      },
    },
  },
  {
    timestamps: true,
  },
  {
    toJSON: {
      getters: true,
    },
    toObject: {
      getters: true,
    },
  }
);

transactionSchema.pre("save", async function (next) {
  const personId = this.person;
  const dateObject = parse(this.date, "dd/MM/yyyy", new Date());
  const year = dateObject.getFullYear();
  const existingTransaction = await this.constructor
    .findOne({
      person: personId,
      date: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      },
    })
    .exec();
  if (existingTransaction) {
    throw new Error("Only one transaction per person per year is allowed.");
  }
  next();
});

const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = Transaction;
