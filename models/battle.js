// models/Battle.js
const mongoose = require("mongoose");

const battleSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
},
  subject: { 
    type: String, 
    required: true 
},
  type: { 
    type: String, 
    enum: ["public", "private"], 
    default: "public" 
},
  admin: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
},
  participants: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" }],
    createdAt: { 
    type: Date, 
    default: Date.now 
},
});

module.exports = mongoose.model("Battle", battleSchema);
