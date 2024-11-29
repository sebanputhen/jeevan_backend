/*const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: [
      {
        type: String,
        default: "user",
      },
    ]
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
*/
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, // Ensure email is unique
    },
    phone: {
      type: String,
      required: true,
      unique: true, // Ensure phone is unique
    },
    password: {
      type: String,
      required: true,
    },
    role: [
      {
        type: String,
        default: "user",
      },
    ],
    parish: {
      type: String,
      required: true,
      default: "user",
    },
  },
  {
    timestamps: true,
  }
);

// Password hashing middleware before saving the user
userSchema.pre("save", async function (next) {
  //if (!this.isModified("password")) return next();

 // const salt = await bcrypt.genSalt(10);
  //this.password = await bcrypt.hash(this.password, salt);
  //this.password = this.password ;
  next();
});

// Method to compare password during login
userSchema.methods.comparePassword = async function (password) {
  console.log('Comparing:', password, this.password);  // Log input and hashed password
  //return bcrypt.compare(password, this.password);
  return this.password === password;
};
const User = mongoose.model("Users", userSchema);
module.exports = User;