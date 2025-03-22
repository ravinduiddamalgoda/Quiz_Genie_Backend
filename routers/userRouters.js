const express = require('express');

const { 
    createUser, 
    loginUser } = require('../controllers/userController');

const userRouter = express.Router();

// get all users
userRouter.get('/', (req, res) => {
    res.json({ message: 'get all users' });
});

// get single user
userRouter.get('/:id', (req, res) => {
    res.json({ message: 'get single user' });
});

// create user
userRouter.post('/register', createUser);
// login user
userRouter.post('/login', loginUser);


// update user
userRouter.put('/:id', (req, res) => {
    res.json({ message: 'update user' });
});

// delete user
userRouter.delete('/:id', (req, res) => {
    res.json({ message: 'delete user' });
});


module.exports = userRouter;