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

  // Videos excluidos del análisis orgánico
  const EXCLUDED_TIKTOK = ['fusion water magic', 'hyaluronic', 'kativa', 'oleos capilares que probe'];
  const EXCLUDED_INSTAGRAM = ['confirmen', 'bestfriend', 'bestie', '5 soles al que adivina'];

  // Filtrar contenido pagado y collabs
  const organicData = data.filter(p => {
    const text = (p.text || p.caption || '').toLowerCase();
    if (platform === 'TikTok') {
      return !EXCLUDED_TIKTOK.some(kw => text.includes(kw));
    }
    if (platform === 'Instagram') {
      return !EXCLUDED_INSTAGRAM.some(kw => text.includes(kw));
    }
    return true;
  });

  const brandContext = `
CREADORA: Andrea Urrunaga (@andreau.denegri)
Estratega digital, community manager y creadora de contenido. Fundadora de Raya Studio.
Bilingüe español/inglés. Mamá soltera. Lima, Perú.
Arquetipo: sofisticada, sensible, femenina, elegante, vulnerable pero fuerte, resiliente.
Audiencia objetivo: mujeres que quieren cuidarse, verse bien y sentirse bien, pero viven una vida exigente.

PILARES DE CONTENIDO:
1. BEAUTY (pilar principal)
   - Pelo, skincare, makeup
   - Wellness cuando se cruza con cuidado natural de piel o pelo — van de la mano
   - Es el pilar que más atrae marcas y colaboraciones pagas
   - Fórmula ganadora: hook visual/emocional en 0-2 seg + producto específico o técnica concreta + Andrea protagonista + resultado prometido

2. MAMÁ (pilar secundario)
   - Maternidad, momentos con Matilda
   - Con toque de reflexión emocional — van integrados, no son categorías separadas

NOTA: Viral/actualidad no es un pilar — es contenido esporádico que aparece de vez en cuando con temas de actualidad relevantes.

FORMATOS DE VIDEO (identificados por hashtag al final del caption):
- #fmt_hablado — video hablado directo a cámara
- #fmt_textmusic — video con texto y música, sin hablar
- #fmt_voiceover — voz en off sobre imágenes o acciones
- #fmt_greenscreen — pantalla verde con imagen de fondo
- #fmt_tutorial — pasos con resultado final visible
- #fmt_hookvisual — hook visual inesperado en primeros 0.5 seg + texto encima
- #fmt_trend — trend o audio viral con versión propia
- #fmt_opinion — opinión rápida 15-25 seg
- #fmt_story — storytelling personal antes del tip o producto
- #fmt_carrusel — slides con texto e imágenes (Instagram)

CONTENIDO EXCLUIDO DEL ANÁLISIS ORGÁNICO:
TikTok — pauta activada por marca: Fusion Water Magic, Hyaluronic, oleos Kativa
Instagram — collabs que no son de Andrea: "Confirmen #bestfriend", "5 soles al que adivina"

NOTA: Los datos ya vienen filtrados. Total de posts orgánicos analizados: ${organicData.length} de ${data.length} totales.`;

  if (platform === 'TikTok') {
    return `Eres un estratega de contenido digital experto en TikTok para marcas personales de beauty.

${brandContext}

CONTEXTO DE TIKTOK:
- Algoritmo prioriza: retención, shares y tiempo de visualización
- Contenido llega principalmente a NO seguidores (FYP)
- Métricas clave: views, shares, saves, comentarios
- El hook en los primeros 2 segundos determina todo
- El storytelling dentro del video de beauty es clave — no solo hook + tip

Analiza estos ${organicData.length} posts orgánicos de TikTok y genera un informe estratégico en español:

1. 🏆 TOP 5 VIDEOS MÁS EXITOSOS
Para cada uno: tema, pilar, formato (#fmt_ si aparece), métricas exactas (views/likes/shares/saves/comentarios), duración, y análisis detallado de POR QUÉ funcionó — hook, estructura, tema, timing.

2. ⚠️ BOTTOM 5 VIDEOS CON MENOR RENDIMIENTO
Para cada uno: métricas, y análisis detallado de POR QUÉ no funcionó y qué habría que cambiar.

3. 📊 RENDIMIENTO POR PILAR
Compara Beauty vs Mamá. ¿Cuál genera más views? ¿Cuál genera más shares? ¿Cuál más saves?

4. 🎬 RENDIMIENTO POR FORMATO
Si hay hashtags #fmt_ en los captions, analiza qué formato funciona mejor. Si no hay, analiza por la duración y el tipo de contenido descrito en el caption.

5. 🎣 PATRONES DE HOOK QUE FUNCIONAN
¿Qué tipo de apertura generó más retención? ¿Pattern interrupt visual, auditivo, pregunta directa, advertencia?

6. 📅 MEJORES DÍAS Y HORARIOS PARA PUBLICAR
Basado en los posts con mejor rendimiento.

7. 🚀 3 IDEAS CONCRETAS PARA ESTA SEMANA EN TIKTOK
Cada idea debe incluir:
- Tema exacto del video
- Formato recomendado (#fmt_)
- Hook de apertura sugerido (primeras palabras o acción visual)
- Por qué va a funcionar basado en los datos
- Cómo adaptarlo para Instagram

8. 🔄 TENDENCIA VS MES ANTERIOR
Si hay datos de períodos distintos, ¿está creciendo o cayendo el rendimiento?

Datos orgánicos: ${JSON.stringify(organicData.slice(0, 50))}

Sé muy específica, accionable y basada en los datos reales. Cada recomendación debe tener base en los números.`;
  }

  if (platform === 'Instagram') {
    return `Eres un estratega de contenido digital experto en Instagram para marcas personales.

${brandContext}

CONTEXTO DE INSTAGRAM:
- Algoritmo prioriza: saves, comentarios significativos y tiempo en el post
- Contenido llega principalmente a seguidores existentes — la audiencia ya conoce a Andrea
- Métricas clave: saves (la más valiosa), likes, comentarios, alcance en Reels
- La audiencia de Instagram sigue a Andrea principalmente por Mamá/vida real
- El beauty en Instagram funciona mejor anclado a su historia personal — no como tip genérico
- Formato ganador: video corto con texto y música (aspiracional) o voz en off — NO hablado directo a cámara
- Los carruseles generan más saves que los videos

Analiza estos ${organicData.length} posts orgánicos de Instagram y genera un informe estratégico en español:

1. 🏆 TOP 5 POSTS MÁS EXITOSOS EN INSTAGRAM
Para cada uno: tema, pilar, formato, métricas exactas, y análisis detallado de POR QUÉ funcionó.

2. ⚠️ BOTTOM 5 POSTS CON MENOR RENDIMIENTO
Para cada uno: métricas y análisis de POR QUÉ no funcionó.

3. 📊 RENDIMIENTO POR PILAR
Beauty vs Mamá. ¿Cuál genera más saves? ¿Cuál más likes? ¿Cuál más comentarios?

4. 💾 QUÉ CONTENIDO GENERA MÁS SAVES
Los saves son la métrica más importante en Instagram. ¿Qué tipo de contenido de Andrea la gente guarda?

5. 🎬 RENDIMIENTO POR FORMATO
¿Reels, carruseles, fotos? ¿Texto y música, voz en off, hablado? ¿Qué funciona mejor?

6. 📅 MEJORES DÍAS Y HORARIOS PARA PUBLICAR EN INSTAGRAM

7. 🚀 3 IDEAS CONCRETAS PARA ESTA SEMANA EN INSTAGRAM
Cada idea debe incluir:
- Tema exacto
- Formato recomendado
- Hook o primera línea sugerida
- Por qué va a funcionar en Instagram
- Si viene adaptado de TikTok, cómo se adaptó

8. 🔄 CONTENIDO DE TIKTOK QUE DEBERÍA REPUBLICAR EN INSTAGRAM
¿Qué tipos de video de TikTok funcionarían bien adaptados a Instagram y cómo?

Datos orgánicos: ${JSON.stringify(organicData.slice(0, 50))}

Sé muy específica, accionable y basada en los datos reales.`;
  }

  return `Analiza estos datos de ${platform} para @andreau.denegri y genera un informe de rendimiento en español. Datos: ${JSON.stringify(organicData.slice(0, 50))}`;
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
    from: `"Raya Studio Analytics" <${CONFIG.EMAIL_USER}>`,
    to: CONFIG.EMAIL_TO,
    subject: subject,
    html: `
      <div style="font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 30px; background: #fafaf8;">
        <h1 style="color: #2c2c2c; font-size: 24px; border-bottom: 2px solid #d4a89a; padding-bottom: 10px;">
          📊 Informe de Redes Sociales
        </h1>
        <p style="color: #888; font-size: 13px;">Generado automáticamente por Raya Studio Analytics · Claude AI</p>
        <div style="background: white; padding: 25px; border-radius: 8px; margin-top: 20px; line-height: 1.8; color: #333; white-space: pre-wrap;">
          ${htmlContent.replace(/\n/g, '<br>').replace(/---/g, '<hr style="border: 1px solid #eee;">')}
        </div>
        <p style="color: #bbb; font-size: 11px; margin-top: 20px; text-align: center;">
          Raya Studio · @andreau.denegri · Powered by Apify + Claude AI
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

    console.log(`Analizando posts de ${platform} con Claude...`);
    const analysis = await analyzeWithClaude(data, platform);

    const date = new Date().toLocaleDateString('es-PE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    await sendEmail(`📊 Informe ${platform} · ${date}`, analysis);
    console.log('✅ Informe enviado exitosamente');
    res.json({ status: 'success' });

  } catch (error) {
    console.error('ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'Raya Studio Analytics · activo', webhook_url: '/webhook' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Raya Studio Analytics corriendo en puerto ${PORT}`));
