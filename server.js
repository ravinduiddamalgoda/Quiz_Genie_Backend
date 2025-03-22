const express = require('express');
require('dotenv').config();
const mongoose = require('mongoose');

//importing routers
const userRouter = require('./routers/userRouters');

//express app
const app = express();


//middleware & static files
app.use(express.json());

app.use((req, res, next) => {
    console.log(req.path, req.method);
    next();
    })

//routers
app.use('/api/user', userRouter);

//connect to mongodb
mongoose.connect(process.env.MONGO_URI) 
    .then(()=>{
        //lissening for request
        app.listen(process.env.PORT, () => {
            console.log('connect to the db & listening for request on port ', process.env.PORT);
        })
    })
    .catch((err)=>{console.log(err)});

