
const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json({ limit: '50mb' }));

const CONFIG = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  APIFY_TOKEN: process.env.APIFY_TOKEN,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  EMAIL_TO: process.env.EMAIL_TO,
};

async function analyzeWithClaude(data, platform) {
  const response = await fetch('https://api.
