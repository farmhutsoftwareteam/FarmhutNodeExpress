const express = require('express');
const multer = require('multer');
const BlogPost = require('../models/BlogPost');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

const router = express.Router();

router.post('/new', upload.single('coverImage'), async (req, res) => {
  try {
    const { title, content } = req.body;

    const coverImage = path.basename(req.file.path);
    // Create a new blog post with the uploaded cover image
    const newBlogPost = new BlogPost({
      title,
      content,
      coverImage
    });
    


    // Save the new blog post to the database
    await newBlogPost.save();

    res.status(201).json(newBlogPost);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router.get('/all', async (req, res) => {
    try {
      // Find all the blog posts in the database
      const blogPosts = await BlogPost.find();
  
      // Send the blog posts as a response
      res.json(blogPosts);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

module.exports = router;
