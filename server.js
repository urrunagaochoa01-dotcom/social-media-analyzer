const express = require('express');
const nodemailer = require('nodemailer');
const https = require('https');

const app = express();
app.use(express.json({ limit: '50mb' }));

const CONFIG = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  APIFY_TOKEN: process.env.APIFY_TOKEN,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  EMAIL_TO: process.env.EMAIL_TO,
};

async function httpRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function analyzeWithClaude(data, platform) {
  const result = await httpRequest(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    },
    {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `Eres un experto en marketing digital y análisis de redes sociales. 
        
Analiza estos datos de ${platform} y genera un informe ejecutivo en español con:

1. 🏆 TOP 5 POSTS CON MEJOR RENDIMIENTO (con métricas específicas)
2. 📊 MÉTRICAS GENERALES (promedio de likes, comentarios, shares, views)
3. 🔍 PATRONES DE ÉXITO (qué tienen en común los posts más exitosos)
4. 📅 MEJORES DÍAS Y HORARIOS para publicar
5. 💡 RECOMENDACIONES CONCRETAS para mejorar el contenido
6. ⚠️ QUÉ EVITAR basado en los posts con menor rendimiento

Datos: ${JSON.stringify(data.slice(0, 50))}

El informe debe ser claro, accionable y con emojis para mejor lectura.`
      }]
    }
  );
  return result.content[0].text;
}

async function sendEmail(subject, htmlContent) {
  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: CONFIG.EMAIL_USER,
      pass: CONFIG.EMAIL_PASSWORD
    }
  });
  await transporter.sendMail({
    from: `"Social Media Analyzer" <${CONFIG.EMAIL_USER}>`,
    to: CONFIG.EMAIL_TO,
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6c48c5;">📊 Informe Semanal de Redes Sociales</h1>
        <p style="color: #666;">Generado automáticamente por Claude AI</p>
        <hr style="border: 1px solid #eee;">
        <div style="white-space: pre-wrap; line-height: 1.6;">
          ${htmlContent.replace(/\n/g, '<br>')}
        </div>
        <hr>
        <p style="color: #999; font-size: 12px;">Generado automáticamente usando Apify + Claude AI</p>
      </div>
    `
  });
}

app.post('/webhook', async (req, res) => {
  try {
    console.log('📥 Webhook recibido de Apify');
    const { resource, eventType } = req.body;
    if (eventType !== 'ACTOR.RUN.SUCCEEDED') {
      return res.json({ status: 'ignored' });
    }
    const actorId = resource?.actId || '';
    let platform = 'Redes Sociales';
    if (actorId.includes('tiktok') || actorId.includes('clockworks')) platform = 'TikTok';
    else if (actorId.includes('instagram')) platform = 'Instagram';

    const datasetId = resource?.defaultDatasetId;
    if (!datasetId) return res.status(400).json({ error: 'No dataset ID' });

    const data = await httpRequest(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${CONFIG.APIFY_TOKEN}&limit=100`
    );
    if (!data || data.length === 0) return res.json({ status: 'no data' });

    console.log(`🤖 Analizando ${data.length} posts con Claude...`);
    const analysis = await analyzeWithClaude(data, platform);
    const date = new Date().toLocaleDateString('es-PE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    await sendEmail(`📊 Informe ${platform} - ${date}`, analysis);
    console.log('✅ Informe enviado');
    res.json({ status: 'success' });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.json({ status: '✅ Servidor activo', webhook_url: '/webhook' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
