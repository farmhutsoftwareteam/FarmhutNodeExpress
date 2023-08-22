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
    subscriptionStatus: { type: String, enum: ["active", "inactive"], default: "inactive" },
  subscriptionPlan: { type: String, default: "" },
  subscriptionExpiration: { type: Date, default: null },
    
    wallet: {
        balance: {
          type: Number,
          required: false,
          default: 0
        },
        transactions: [
          {
            type: Schema.Types.ObjectId,
            ref: "Transaction"
          }
        ]
      }
   
});


  



// User model
const User = model("User", UserSchema)

module.exports = User