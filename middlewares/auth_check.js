const jwt = require('jsonwebtoken');

const auth_check_middleware =  async (req, res, next) => {
    try{
        const input_header = await req.headers;
        let token = input_header.authorization;
        token = token.split(' ')[1];

        const isVerified = await jwt.verify(token, 'secret_key');

        if(isVerified.email){
            next();
        }else{
            res.status(500).json({
                msg: "lInternal server problem"
            })
        }
    }catch(error){
        res.status(403).json({
            msg: "login first"
        })
        console.log(error)
    }
}

module.exports = { auth_check_middleware };