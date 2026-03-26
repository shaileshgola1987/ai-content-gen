const express = require('express');
const router = express.Router();
const aiCtrl = require('../controllers/ai.controller');

router.post('/about-us', aiCtrl.generateAboutUs);
router.post('/description', aiCtrl.generateProductDesc);
router.post('/short-description', aiCtrl.generateProductShortDesc);
router.post('/specs', aiCtrl.generateTechSpecs);
router.post('/seo', aiCtrl.generateSEO);
router.post('/blog-intro', aiCtrl.generateBlogIntro);

module.exports = router;