const express = require('express');
const router = express.Router();
const battleController = require('../controllers/battleController');

//crete a new battle
router.post('/createBattle', battleController.createBattle);

// Get all battles
router.get('/display-all', battleController.getAllBattles);

//join an existing battle
router.post('/joinBattle/:id', battleController.joinBattle);

//get all battles related to a user
router.get('/getUserBattles/:userId', battleController.getUserBattles);

//delete a battle
// Delete a battle
router.delete('/:id', battleController.deleteBattle);

//getr single battle details
router.get('/:id', battleController.getBattleDetails);



module.exports = router;