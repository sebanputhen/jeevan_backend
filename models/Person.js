const mongoose = require("mongoose");
const { parse, format, isAfter } = require("date-fns");

const personSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    baptismName: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      required: true,
      enum: ["male", "female"],
    },
    dob: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return !isAfter(value, new Date());
        },
        message: "Date of birth cannot be after today.",
      },
      set: function (value) {
        return parse(value, "dd/MM/yyyy", new Date());
      },
      get: function (value) {
        return value ? format(value, "dd/MM/yyyy") : null;
      },
    },
    phone: {
      type: String,
      maxlength: 13,
      minlength: 10,
      unique: true,
    },
    email: {
      type: String,
      unique: true,
    },
    education: {
      type: String,
      required: true,
    },
    occupation: {
      type: String,
      required: true,
    },
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
    /*koottayma:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Koottayma",
    },*/
    family: {
      type: String,
      required: true,
      ref: "Family"
    },
    relation: {
      type: String,
      required: true,
      enum: [
        "head",
        "wife",
        "husband",
        "son",
        "daughter",
        "father",
        "mother",
        "brother",
        "sister",
        "son in law",
        "daughter in law",
        "grandson",
        "granddaughter"
      ],
    },
    status: {
      type: String,
      enum: ["alive", "deceased"],
      default: "alive",
    },
  },
  {
    id: false,
    toJSON: {
      transform: function (doc, ret, options) {
        delete ret.id;
        return ret;
      },
      getters: true,
    },
    toObject: {
      transform: function (doc, ret, options) {
        delete ret.id;
        return ret;
      },
      getters: true,
    },
  },
  {
    timestamps: true,
  }
);

personSchema.pre("save", async function (next) {
  const family = await mongoose.model("Family").findOne({ id: this.family });
  if (!family) {
    return next(new Error("Family not found."));
  }
  if (this.relation === "head") {
    const existingHead = await mongoose.model("Person").findOne({
      family: this.family,
      relation: "head",
    });

    if (existingHead) {
      return next(new Error("There is already a head in this family."));
    }
  } else {
    const existingHead = await mongoose.model("Person").findOne({
      family: this.family,
      relation: "head",
    });

    if (!existingHead) {
      return next(new Error("Please insert the head person first."));
    }
  }
  next();
});

personSchema.post("findByIdAndUpdate", async function (doc, next) {
  if (doc.status === "deceased") {
    const family = await mongoose.model("Family").findOne({ id: doc.family });
    if (family.head && family.head.toString() === doc._id.toString()) {
      family.head = undefined;
      await family.save();
    }
  }
  next();
});

personSchema.post("save", async function (doc, next) {
  if (doc.relation === "head") {
    const family = await mongoose.model("Family").findOne({ id: doc.family });
    if (family) {
      await mongoose
        .model("Family")
        .findOneAndUpdate({ id: doc.family }, { head: doc._id });
    }
  }
  next();
});

const Person = mongoose.model("Person", personSchema);
module.exports = Person;
