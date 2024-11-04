const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Account } = require("../model/schema.js");
const { z } = require("zod");

const auth_router = express();
const saltRounds = 10;

// route using for signinup or onboarding new users
// using of zod done here
auth_router.post("/sign-up", async (req, res) => {
  const sign_up_schema = z.object({
    firstname: z.string(),
    lastname: z.string(),
    email: z.string().email(),
    imageUrl: z.string(),
    password: z.string().length(6),
  });

  const input_body = req.body;
  const isValid = sign_up_schema.safeParse(input_body);

  if (!isValid.success) {
    res.status(403).json({
      msg: "invalid credentials",
    });
    return;
  }

  // email id must be unique
  const existing_user = await User.findOne({
    email: input_body.email,
  });

  if (existing_user) {
    res.status(403).json({
      msg: "user already exists",
    });
    return;
  }

  try {
    // hasing the password
    const hashed_password = await bcrypt.hash(input_body.password, saltRounds);
    const user = await User.create({
      firstname: input_body.firstname,
      lastname: input_body.lastname,
      email: input_body.email,
      imageUrl: input_body.imageUrl,
      password: hashed_password,
    });

    await user.save();

    // creation of account on new user signup, email will be unique for each account
    const account = await Account.create({
      user_id: user._id,
      balance: Math.floor(Math.random() * 100),
    });

    res.json({
      msg: "user created successfully and account created",
      accountId: account._id,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "unable to create an user",
    });
  }
});

auth_router.post("/sign-in", async (req, res) => {
  const sign_in_schema = z.object({
    email: z.string().email(),
    password: z.string().length(6),
  });

  const input_body = req.body;
  const isValid = sign_in_schema.safeParse(input_body);

  if (!isValid.success) {
    res.status(403).json({
      msg: "invalid credentials",
    });
    return;
  }

  try {
    const user = await User.findOne({
      email: input_body.email,
    });

    const isMatched = await bcrypt.compareSync(
      input_body.password,
      user.password
    );
    console.log(isMatched, user);

    if (user && isMatched) {
      const token = await jwt.sign({ email: input_body.email }, "secret_key", {
        expiresIn: "2h",
      });
      res.json({
        msg: user,
        token: token,
      });
    } else {
      res.json({
        msg: "Invlaid username or password",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "unable to find an user",
    });
  }
});

module.exports = auth_router;
