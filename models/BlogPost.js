require("dotenv").config() // load .env variables
const {Schema, model} = require("../DB/connection") // import Schema & model

const BlogPostSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  coverImage: { type: String, required: true }
});


const Blog = model ('BlogPost', BlogPostSchema )
module.exports = Blog
