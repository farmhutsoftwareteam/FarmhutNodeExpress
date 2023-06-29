require("dotenv").config() // load .env variables
const {Schema, model} = require("../DB/connection") // import Schema & model

// User Schema
const UserSchema = new Schema({
    phone: {type: String, unique: true, required: true},
    username: {type: String, unique: true, required: true},
    password: {type: String, required: false},
    avatar: {type: String, default: ""},
    fullName: {type: String, default: ""},
    email: {type: String, default: ""},
    isPublic: {type: Boolean, default: false},
    isVerified: {type: Boolean, default: false},
    isAvailable: {type: Boolean, default: false},
   
});


  



// User model
const User = model("User", UserSchema)

module.exports = User