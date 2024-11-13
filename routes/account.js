const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { User, Account, Transaction } = require("../model/schema.js");
const { auth_check_middleware } = require("../middlewares/auth_check.js");
const bcrypt = require("bcrypt");

const account_router = express();
account_router.use(auth_check_middleware);

// sending user detials without its password to frontend via api call
account_router.get("/get-user", async (req, res) => {
  const input_header = req.headers;
  let token = input_header.authorization;
  token = token.split(" ")[1];

  try {
    const user = await User.findOne({
      email: jwt.decode(token).email,
    }).select("-password");

    res.json({
      msg: user,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Internal server error",
    });
  }
});

// getting all the users which are onboarded on the platform
// removing the password of each one
account_router.get("/get-users", async (req, res) => {
  try {
    const user = await User.find({}).select("-password");

    res.json({
      msg: user,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Internal server error",
    });
  }
});

// router to update the user information
// we can update the fist name, lastname or upiId's, passwords etc
// only an single email can formed single transaction account
account_router.post("/update-info", async (req, res) => {
  try {
    const input_header = req.headers;
    let token = input_header.authorization;
    token = token.split(" ")[1];

    const input_body = req.body;
    const decoded = jwt.decode(token);

    if (decoded.email) {
      const email = decoded.email;
      const hashed_password = await bcrypt.hash(input_body.password, 10);
      const user = await User.findOneAndUpdate(
        { email: email },
        {
          firstname: input_body.firstname,
          lastname: input_body.lastname,
          password: hashed_password,
        }
      );

      await user.save();
      res.status(200).json({
        msg: "user updated susscefully",
      });
    } else {
      res.status(500).json({
        msg: "Internal server error",
      });
      return;
    }
  } catch (error) {
    res.status(500).json({
      msg: "Internal server error",
    });
  }
});

// router to add money in user account
// its something like air dropping the money
// at max we can airdrop 5000 ruppess at a time
account_router.post("/airdrop", async (req, res) => {
  const user_id = req.body.userId;
  console.log("reached");

  try {
    await Account.findOneAndUpdate(
      { user_id: user_id },
      { $inc: { balance: 5000 } }
    );
    res.json({
      msg: "money airdroped successfully",
    });
  } catch (error) {
    res.json({
      msg: "Internal server error",
    });
  }
});

// router to transfer the money
// transfer money from one account to another
// What if the database crashes right after the first request (only the balance is decreased for one user, and not for the second user)
// What if the Node.js crashes after the first update?
account_router.post("/transfer", async (req, res) => {
  const session = await mongoose.startSession();
  const { from, amount, to } = req.body;

  try {
    session.startTransaction();

    // Fetch 'from' account
    const from_account = await Account.findOne({ user_id: from }).session(
      session
    );
    if (!from_account || from_account.balance < amount) {
      await session.abortTransaction();
      return res.status(400).json({
        msg: "Insufficient balance",
      });
    }

    // Fetch 'to' account
    const to_account = await Account.findOne({ user_id: to }).session(session);
    if (!to_account) {
      await session.abortTransaction();
      return res.status(400).json({
        msg: "Account not found",
      });
    }

    // Performing the transaction: debit and credit
    await from_account
      .updateOne({ $inc: { balance: -amount } })
      .session(session);
    await to_account.updateOne({ $inc: { balance: amount } }).session(session);

    // Fetching user details
    const from_user = await User.findOne({ _id: from_account.user_id });
    const to_user = await User.findOne({ _id: to_account.user_id });

    const from_name = `${from_user.firstname} ${from_user.lastname}`;
    const to_name = `${to_user.firstname} ${to_user.lastname}`;

    // Creating the transaction record
    await Transaction.create({
      from_name,
      to_name,
      from: from_account._id,
      to: to_account._id,
      amount,
    });

    // Commit the transaction
    await session.commitTransaction();

    return res.json({
      msg: "Transfer successful",
    });
  } catch (error) {
    // Rollback in case of error
    await session.abortTransaction();
    console.error("Error during transaction:", error);
    return res.status(500).json({
      msg: "An error occurred during the transfer",
    });
  } finally {
    // End the session
    session.endSession();
  }
});

// getting balance of account
account_router.get("/balance", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({
      msg: "User ID is required",
    });
  }

  try {
    const account = await Account.findOne({
      user_id: userId,
    });

    if (!account) {
      return res.status(404).json({
        msg: "Account not found",
      });
    }

    res.json({
      balance: account.balance,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Internal server error",
    });
  }
});

// router to get all the transactions
account_router.get("/transactions", async (req, res) => {
  const input_header = req.headers;
  let token = input_header.authorization;
  token = token.split(" ")[1];

  const decode = jwt.decode(token);
  const email = decode.email;

  const user = await User.findOne({ email: email });
  const id = user._id;

  try {
    const account_id = await Account.findOne({ user_id: id });

    const send_transactions = await Transaction.find({ from: account_id });
    const rec_transactions = await Transaction.find({ to: account_id });

    res.json({
      send_transactions: send_transactions,
      rec_transactions: rec_transactions,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Internal server error",
    });
  }
});

module.exports = account_router;
