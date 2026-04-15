const express = require('express');
const https = require('https');
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

function getPrompt(data, platform) {
  const brandContext = `
CONTEXTO DE LA CREADORA:
- Nombre: Andrea Urrunaga (@andreau.denegri)
- Identidad: Mamá luchadora, creadora de contenido, emprendedora, estratega de marketing
- Arquetipo emocional: Sofisticada, sensible, femenina, elegante, vulnerable pero fuerte, resiliente
- Estética: Clean aesthetic, wellness lifestyle, beauty minimal, elegancia femenina con un giro inesperado
- Audiencia objetivo: Mujeres que quieren cuidarse, verse bien y sentirse bien, pero viven una vida exigente
- Historia central: reconstrucción personal, maternidad sola, crecimiento emocional y económico

PILARES DE CONTENIDO:
1. BEAUTY: tips de belleza alineados a alimentación y bienestar
2. WELLNESS: tips de alimentación y bienestar del cuerpo
3. MAMÁ / REFLEXIÓN EMOCIONAL: maternidad, crecimiento personal, introspección, vulnerabilidad
4. VIRAL / CONVERSACIÓN PÚBLICA: temas en tendencia, temas polémicos, opinión, cultura digital

FORMATOS QUE USA:
- Video hablado orgánico, Video con texto y música, Video con sobreposiciones
- Video con voz en off, Video con pantalla verde, Transiciones, Carrusel

OBJETIVO: Aumentar visualizaciones, engagement y seguidores.`;

  if (platform === 'TikTok') {
    return `Eres un estratega de contenido digital experto en crecimiento en TikTok para marcas personales femeninas.

${brandContext}

CONTEXTO DE TIKTOK:
- Algoritmo prioriza: retención, shares y tiempo de visualización
- Contenido llega principalmente a NO seguidores (FYP)
- Tono exitoso: espontáneo, raw, auténtico, directo
- Métricas clave: views, shares, comentarios, retención

Analiza estos ${data.length} posts reales de TikTok y genera un informe estratégico:

1. 🏆 TOP 5 VIDEOS MÁS EXITOSOS EN TIKTOK
Para cada uno: tema, pilar, formato, métricas y POR QUÉ funcionó.

2. 📊 QUÉ PILAR FUNCIONA MEJOR EN TIKTOK
Beauty vs Wellness vs Mamá/Emocional vs Viral. ¿Cuál genera más views y shares?

3. 🎬 QUÉ FORMATO DE VIDEO FUNCIONA MEJOR EN TIKTOK

4. 🎣 QUÉ HOOKS FUNCIONAN MEJOR
¿Qué tipo de apertura genera más retención?

5. 💬 QUÉ TEMAS GENERAN MÁS CONVERSACIÓN
Ordena de mayor a menor engagement.

6. 📅 MEJORES DÍAS Y HORARIOS PARA PUBLICAR EN TIKTOK

7. 🚀 3 IDEAS CONCRETAS PARA ESTA SEMANA EN TIKTOK
Cada idea debe incluir: tema exacto, formato, hook de apertura, por qué va a funcionar, y cómo adaptarlo para Instagram.

8. ⚠️ QUÉ EVITAR EN TIKTOK

Datos: ${JSON.stringify(data.slice(0, 50))}`;
  }

  if (platform === 'Instagram') {
    return `Eres un estratega de contenido digital experto en crecimiento en Instagram para marcas personales femeninas.

${brandContext}

CONTEXTO DE INSTAGRAM:
- Algoritmo prioriza: saves, comentarios significativos y tiempo en el post
- Contenido llega principalmente a seguidores existentes
- Tono exitoso: más cuidado, estético, aspiracional pero auténtico
- Métricas clave: saves (la más valiosa), comentarios, shares por DM, alcance en Reels
- Los carruseles generan más saves

Analiza estos ${data.length} posts reales de Instagram y genera un informe estratégico:

1. 🏆 TOP 5 POSTS MÁS EXITOSOS EN INSTAGRAM
Para cada uno: tema, pilar, formato, métricas y POR QUÉ funcionó.

2. 📊 QUÉ PILAR FUNCIONA MEJOR EN INSTAGRAM
Beauty vs Wellness vs Mamá/Emocional vs Viral. ¿Cuál genera más saves y comentarios?

3. 🎬 QUÉ FORMATO FUNCIONA MEJOR EN INSTAGRAM
¿Reels, carruseles, fotos? ¿Qué estilo de video?

4. 💾 QUÉ CONTENIDO GENERA MÁS SAVES

5. 💬 QUÉ TEMAS GENERAN MÁS ENGAGEMENT EN INSTAGRAM

6. 📅 MEJORES DÍAS Y HORARIOS PARA PUBLICAR EN INSTAGRAM

7. 🚀 3 IDEAS CONCRETAS PARA ESTA SEMANA EN INSTAGRAM
Cada idea: tema exacto, formato, primera línea/hook, por qué va a funcionar, y cómo viene adaptado desde TikTok si aplica.

8. 🔄 CONTENIDO GANADOR DE TIKTOK QUE DEBERÍA REPUBLICAR EN INSTAGRAM Y CÓMO ADAPTARLO

9. ⚠️ QUÉ EVITAR EN INSTAGRAM

Datos: ${JSON.stringify(data.slice(0, 50))}`;
  }

  return `Analiza estos datos de ${platform} para @andreau.denegri y genera un informe de rendimiento en español. Datos: ${JSON.stringify(data.slice(0, 50))}`;
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
      model: 'claude-sonnet-4-5',
      max_tokens: 3000,
      messages: [{ role: 'user', content: getPrompt(data, platform) }]
    }
  );

  console.log('Claude response preview:', JSON.stringify(result).slice(0, 200));

  if (result && result.content && Array.isArray(result.content) && result.content.length > 0) {
    return result.content[0].text;
  }
  if (result && result.error) {
    throw new Error('Claude API error: ' + result.error.message);
  }
  throw new Error('Unexpected response: ' + JSON.stringify(result).slice(0, 200));
}

async function sendEmail(subject, htmlContent) {
  const transporter = nodemailer.createTransport({
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
      <div style="font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 30px; background: #fafaf8;">
        <h1 style="color: #2c2c2c; font-size: 24px; border-bottom: 2px solid #d4a89a; padding-bottom: 10px;">
          📊 Informe Semanal — @andreau.denegri
        </h1>
        <p style="color: #888; font-size: 13px;">Generado automáticamente por Claude AI</p>
        <div style="background: white; padding: 25px; border-radius: 8px; margin-top: 20px; line-height: 1.8; color: #333; white-space: pre-wrap;">
          ${htmlContent.replace(/\n/g, '<br>').replace(/---/g, '<hr style="border: 1px solid #eee;">')}
        </div>
        <p style="color: #bbb; font-size: 11px; margin-top: 20px; text-align: center;">
          Generado automáticamente usando Apify + Claude AI
        </p>
      </div>
    `
  });
}

app.post('/webhook', async (req, res) => {
  try {
    console.log('Webhook recibido de Apify');
    const { resource, eventType } = req.body;
    console.log('eventType:', eventType);

    if (eventType !== 'ACTOR.RUN.SUCCEEDED') {
      return res.json({ status: 'ignored' });
    }

    const actorId = resource?.actId || '';
    let platform = 'Redes Sociales';
    if (actorId.includes('tiktok') || actorId.includes('clockworks')) platform = 'TikTok';
    else if (actorId.includes('instagram')) platform = 'Instagram';

    console.log('Platform detectada:', platform);

    const datasetId = resource?.defaultDatasetId;
    if (!datasetId) return res.status(400).json({ error: 'No dataset ID' });

    const data = await httpRequest(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${CONFIG.APIFY_TOKEN}&limit=100`
    );

    console.log('Posts recibidos:', Array.isArray(data) ? data.length : 'error');

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.json({ status: 'no data' });
    }

    console.log(`Analizando ${data.length} posts de ${platform} con Claude...`);
    const analysis = await analyzeWithClaude(data, platform);

    const date = new Date().toLocaleDateString('es-PE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    await sendEmail(`📊 Informe ${platform} - ${date}`, analysis);
    console.log('✅ Informe enviado exitosamente');
    res.json({ status: 'success' });

  } catch (error) {
    console.error('ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'Servidor activo', webhook_url: '/webhook' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
