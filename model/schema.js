const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

mongoose
  .connect(process.env.MONGO_DB_URL)
  .then(() => {
    console.log("server is connected to database");
  })
  .catch((error) => {
    console.log("error while connecting to backend ", error);
  });

const txn_schema = new mongoose.Schema({
  from_name: {
    type: String,
    required: true
  },
  to_name: {
    type: String,
    required: true
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: true,
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
});

const account_schema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  upi_id: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    required: true,
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const user_schema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true,
  },
  dateOfBirth: {
    type: Date,
    require: true
  }
});


const User = mongoose.model("User", user_schema);
const Account = mongoose.model("Account", account_schema);
const Transaction = mongoose.model("Transaction", txn_schema);

module.exports = { User, Account, Transaction };