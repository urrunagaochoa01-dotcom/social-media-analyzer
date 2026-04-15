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

function getPrompt(data, platform) {
  const brandContext = `
CONTEXTO DE LA CREADORA:
- Nombre: Andrea Urrunaga (@andreau.denegri)
- Identidad: Mamá luchadora, creadora de contenido, emprendedora, estratega de marketing
- Arquetipo emocional: Sofisticada, sensible, femenina, elegante, vulnerable pero fuerte, resiliente
- Estética: Clean aesthetic, wellness lifestyle, beauty minimal, elegancia femenina con un giro inesperado
- Audiencia objetivo: Mujeres que quieren cuidarse, verse bien y sentirse bien, pero viven una vida exigente
- Historia central: reconstrucción personal, maternidad sola, crecimiento emocional y económico, volver a empezar

PILARES DE CONTENIDO:
1. BEAUTY: tips de belleza alineados a alimentación y bienestar
2. WELLNESS: tips de alimentación y bienestar del cuerpo
3. MAMÁ / REFLEXIÓN EMOCIONAL: maternidad, crecimiento personal, introspección, vulnerabilidad
4. VIRAL / CONVERSACIÓN PÚBLICA: temas en tendencia, temas polémicos, opinión, cultura digital

FORMATOS QUE USA:
- Video hablado orgánico (primer plano / plano medio)
- Video con texto y música
- Video hablado con sobreposiciones
- Video con voz en off
- Video con pantalla verde
- Transiciones
- Carrusel / plano general

OBJETIVO: Aumentar visualizaciones, engagement y seguidores.`;

  if (platform === 'TikTok') {
    return `Eres un estratega de contenido digital experto en crecimiento en TikTok para marcas personales femeninas.

${brandContext}

CONTEXTO DE TIKTOK:
- El algoritmo de TikTok prioriza: retención del video, shares y tiempo de visualización
- El contenido llega principalmente a NO seguidores (FYP - For You Page)
- Lo que más viraliza: hooks fuertes en los primeros 2-3 segundos, contenido que genera conversación, trends con giro personal
- Métricas clave en TikTok: views, shares, comentarios, ratio de retención
- El tono exitoso en TikTok: más espontáneo, raw, auténtico, directo
- Los sonidos y trends son clave para el alcance

Analiza estos ${data.length} posts reales de TikTok de Andrea y genera un informe estratégico:

---
1. 🏆 TOP 5 VIDEOS MÁS EXITOSOS EN TIKTOK
Para cada uno: tema, pilar, formato, métricas (views/likes/comentarios/shares) y POR QUÉ funcionó en el algoritmo de TikTok.

2. 📊 QUÉ PILAR FUNCIONA MEJOR EN TIKTOK
Compara Beauty vs Wellness vs Mamá/Emocional vs Viral. ¿Cuál genera más views? ¿Cuál genera más shares (clave para viralizarse)?

3. 🎬 QUÉ FORMATO DE VIDEO FUNCIONA MEJOR EN TIKTOK
¿Video hablado orgánico, con texto y música, voz en off, transiciones? Basado en los datos reales.

4. 🎣 QUÉ HOOKS (APERTURAS) FUNCIONAN MEJOR
Analiza los primeros segundos de los videos más vistos. ¿Qué tipo de apertura genera más retención?

5. 💬 QUÉ TEMAS GENERAN MÁS CONVERSACIÓN EN TIKTOK
Ordena los temas de mayor a menor engagement. ¿Qué genera más comentarios y shares?

6. 📅 MEJORES DÍAS Y HORARIOS PARA PUBLICAR EN TIKTOK

7. 🚀 3 IDEAS CONCRETAS PARA SUBIR ESTA SEMANA EN TIKTOK
Cada idea debe incluir:
- Tema exacto del video
- Formato recomendado
- Hook de apertura sugerido (primeras palabras del video)
- Por qué va a funcionar en el algoritmo de TikTok
- Adaptación para Instagram: cómo modificar este mismo contenido para que funcione en Instagram Reels

8. ⚠️ QUÉ EVITAR EN TIKTOK
Qué tipo de contenido tiene bajo rendimiento y por qué.

Datos de los posts: ${JSON.stringify(data.slice(0, 50))}

Sé muy específica, accionable y basada en los datos reales. Andrea es una profesional.`;
  }

  if (platform === 'Instagram') {
    return `Eres un estratega de contenido digital experto en crecimiento en Instagram para marcas personales femeninas.

${brandContext}

CONTEXTO DE INSTAGRAM:
- El algoritmo de Instagram prioriza: saves, comentarios significativos y tiempo en el post
- El contenido llega principalmente a SEGUIDORES existentes (menos alcance orgánico a nuevos)
- Lo que más crece en Instagram: Reels con alta retención, carruseles que se guardan, contenido que fideliza
- Métricas clave en Instagram: saves (la métrica más valiosa), comentarios, shares por DM, alcance en Reels
- El tono exitoso en Instagram: más cuidado, estético, aspiracional pero auténtico
- La estética visual importa más que en TikTok
- Los carruseles generan más saves y son ideales para contenido de valor

Analiza estos ${data.length} posts reales de Instagram de Andrea y genera un informe estratégico:

---
1. 🏆 TOP 5 POSTS MÁS EXITOSOS EN INSTAGRAM
Para cada uno: tema, pilar, formato (reel/carrusel/foto), métricas y POR QUÉ funcionó en Instagram.

2. 📊 QUÉ PILAR FUNCIONA MEJOR EN INSTAGRAM
Compara Beauty vs Wellness vs Mamá/Emocional vs Viral. ¿Cuál genera más saves? ¿Cuál genera más comentarios significativos?

3. 🎬 QUÉ FORMATO FUNCIONA MEJOR EN INSTAGRAM
¿Reels, carruseles, fotos? ¿Video hablado, con texto y música, voz en off? Basado en datos reales.

4. 💾 QUÉ CONTENIDO GENERA MÁS SAVES
Los saves son la métrica más importante en Instagram. ¿Qué tipo de contenido de Andrea la gente guarda?

5. 💬 QUÉ TEMAS GENERAN MÁS ENGAGEMENT EN INSTAGRAM
Ordena los temas de mayor a menor engagement. ¿Qué genera más comentarios y conversación?

6. 📅 MEJORES DÍAS Y HORARIOS PARA PUBLICAR EN INSTAGRAM

7. 🚀 3 IDEAS CONCRETAS PARA SUBIR ESTA SEMANA EN INSTAGRAM
Cada idea debe incluir:
- Tema exacto del contenido
- Formato recomendado (Reel/carrusel/foto)
- Hook o primera línea sugerida
- Por qué va a funcionar en el algoritmo de Instagram
- Adaptación desde TikTok: si este contenido viene de TikTok, cómo adaptarlo para que funcione en Instagram

8. 🔄 CONTENIDO GANADOR DE TIKTOK QUE DEBERÍA REPUBLICAR EN INSTAGRAM
Basado en los posts más exitosos, ¿cuáles deberían adaptarse para Instagram y cómo?

9. ⚠️ QUÉ EVITAR EN INSTAGRAM
Qué tipo de contenido tiene bajo rendimiento y por qué.

Datos de los posts: ${JSON.stringify(data.slice(0, 50))}

Sé muy específica, accionable y basada en los datos reales. Andrea es una profesional.`;
  }

  // Fallback genérico
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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: getPrompt(data, platform) }]
    }
  );

  console.log('Claude response preview:', JSON.stringify(result).slice(0, 300));

  if (result && result.content && Array.isArray(result.content) && result.content.length > 0) {
    return result.content[0].text;
  }
  if (result && result.error) {
    throw new Error('Claude API error: ' + result.error.message);
  }
  throw new Error('Unexpected Claude response: ' + JSON.stringify(result).slice(0, 200));
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
    console.log('Informe enviado exitosamente');
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
