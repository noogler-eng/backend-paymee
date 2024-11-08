const express = require('express');
const cors = require('cors');
// const { rateLimit } = require('express-rate-limit');
const auth_router = require('./routes/auth.js');
const account_router = require('./routes/account.js');
const dotenv = require("dotenv");
dotenv.config();

const app = express();

// const limiter = rateLimit({
// 	windowMs: 15 * 60 * 1000,
// 	limit: 100,
// 	standardHeaders: 'draft-7',
// 	legacyHeaders: false,
// })

app.use(cors());
app.use(express.json());
// app.use(limiter);

app.use('/api/auth', auth_router);
app.use('/api/app', account_router);

const PORT = process.env.PORT || 8000;
app.listen(PORT, ()=>{
    console.log('server running at port: ', PORT);
})
