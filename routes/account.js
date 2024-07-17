const express = require('express');
const mongoose = require("mongoose");
const jwt = require('jsonwebtoken');
const { User, Account, Transaction } = require('../model/schema.js');
const { auth_check_middleware } = require('../middlewares/auth_check.js');
const bcrypt = require('bcrypt');


const account_router = express();
account_router.use(auth_check_middleware);

account_router.get('/get-user', async(req, res)=>{
    const input_header = req.headers;
    let token = input_header.authorization;
    token = token.split(' ')[1];
    
    try{
        const user = await User.findOne({
            email: jwt.decode(token).email
        })

        res.json({
            msg: user
        })
    }catch(error){
        res.status(500).json({
            msg: "Internal server error"
        })
    }
})

account_router.get('/get-users', async(req, res)=>{
    try{
        const user = await User.find({})

        res.json({
            msg: user
        })
    }catch(error){
        res.status(500).json({
            msg: "Internal server error"
        })
    }
})


// router to update the user information
account_router.post('/update-info', async(req, res)=>{
    try{
        const input_header = req.headers;
        let token = input_header.authorization;
        token = token.split(' ')[1];

        const input_body = req.body;

        const decoded = jwt.decode(token);
        
        if(decoded.email){
            const email = decoded.email;
            const hashed_password = await bcrypt.hash(input_body.password, 10);
            const user = await User.findOneAndUpdate({
                email: email
            }, {
                firstname: input_body.firstname,
                lastname: input_body.lastname,
                password: hashed_password
            })

            await user.save();
            res.status(200).json({
                msg: "user updated susscefully"
            })
        }else{
            res.status(500).json({
                msg: "Internal server error"
            })
            return;
        }
    }catch(error){
        res.status(500).json({
            msg: "Internal server error"
        })
    }
})


// router to add money in user account
account_router.post('/add-money', async(req, res)=>{
    const user_id = req.body.user_id;
    const amount = req.body.amount;

    if(amount > 5000){
        res.status(411).json({
            msg: "amount should be less than 5000"
        })
    }

    try{
        await Account.findOneAndUpdate({user_id: user_id}, {$inc: {balance: amount}});
        res.json({
            msg: "money added successfully"
        })
    }catch(error){
        res.json({
            msg: "Internal server error"
        })
    }
})


// router to transfer the money
// transfer money from one account to another
// What if the database crashes right after the first request (only the balance is decreased for one user, and not for the second user)
// What if the Node.js crashes after the first update?
account_router.post('/transfer', async(req, res)=>{
    // mongoose provide an session object to perform transaction
    const session = await mongoose.startSession();
    const {from, amount, to} = req.body;

    session.startTransaction();
    const from_account = await Account.findOne({ user_id: from }).session(session);

    if(!from_account || from_account.balance < amount){
        await session.abortTransaction();

        res.status(400).json({
            msg: "insufficient balance"
        })
    }
    
    const to_Account = await Account.findOne({ user_id: to }).session(session);
    if(!to_Account){
        await session.abortTransaction();

        res.status(400).json({
            msg: "account not found"
        })
    }

    // perfomring transaction
    from_account.updateOne({ $inc: { balance: -amount } }).session(session);
    to_Account.updateOne({ $inc: { balance: amount } }).session(session);

    const from_ = await User.findOne({ _id: from_account.user_id });
    const to_ = await User.findOne({ _id: to_Account.user_id });

    const from_name = from_.firstname + " " + from_.lastname;
    const to_name = to_.firstname + " " + to_.lastname;

    Transaction.create({
        from_name:  from_name,
        to_name: to_name,
        from: from_account._id,
        to: to_Account._id,
        amount: amount
    })

    await session.commitTransaction();
    res.json({
        message: "Transfer successful"
    });
})


// router to get the current balance of the user
account_router.get('/balance', async(req, res)=>{
    const input_header = req.headers;
    let token = input_header.authorization;
        token = token.split(' ')[1];

    const decode = jwt.decode(token);
    const email = decode.email;

    try{
        const user = await User.findOne({
            email: email
        })

        console.log(user)
        const account = await Account.findOne({
            user_id: user._id
        })

        res.json({
            balance: account.balance
        })
    }catch(error){
        res.status(500).json({
            msg: "Internal server error"
        })
    }
})


// router to get all the transactions
account_router.get('/transactions', async(req, res)=>{
    const input_header = req.headers;
    let token = input_header.authorization;
        token = token.split(' ')[1];

    const decode = jwt.decode(token);
    const email = decode.email;

    const user = await User.findOne({email: email});
    const id = user._id;

    try{

        const account_id = await Account.findOne({user_id: id});

        const send_transactions =  await Transaction.find({ from: account_id });
        const rec_transactions =  await Transaction.find({ to: account_id });
        
        res.json({
            send_transactions: send_transactions,
            rec_transactions: rec_transactions
        })
    }catch(error){
        console.log(error);
        res.status(500).json({
            msg: "Internal server error"
        });
    }
})


module.exports = account_router;