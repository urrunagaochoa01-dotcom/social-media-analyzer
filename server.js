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

function detectPlatform(data, actorId = '') {
  if (actorId.includes('tiktok') || actorId.includes('clockworks')) return 'TikTok';
  if (actorId.includes('instagram')) return 'Instagram';
  // Auto-detectar por los campos del JSON
  if (data && data.length > 0) {
    const first = data[0];
    if (first.playCount !== undefined || first.videoMeta !== undefined) return 'TikTok';
    if (first.videoViewCount !== undefined || first.ownerUsername !== undefined) return 'Instagram';
  }
  return 'Redes Sociales';
}

function getPrompt(data, platform) {
  const EXCLUDED_TIKTOK = ['fusion water magic', 'hyaluronic', 'kativa', 'oleos capilares que probe'];
  const EXCLUDED_INSTAGRAM = ['confirmen', 'bestfriend', 'bestie', '5 soles al que adivina'];

  const organicData = data.filter(p => {
    const text = (p.text || p.caption || '').toLowerCase();
    if (platform === 'TikTok') return !EXCLUDED_TIKTOK.some(kw => text.includes(kw));
    if (platform === 'Instagram') return !EXCLUDED_INSTAGRAM.some(kw => text.includes(kw));
    return true;
  });

  const brandContext = `
CREADORA: Andrea Urrunaga (@andreau.denegri)
Estratega digital, community manager y creadora de contenido. Fundadora de Raya Studio.
BilingÃ¼e espaÃ±ol/inglÃ©s. MamÃ¡ soltera. Lima, PerÃº.
Arquetipo: sofisticada, sensible, femenina, elegante, vulnerable pero fuerte, resiliente.
Audiencia objetivo: mujeres que quieren cuidarse, verse bien y sentirse bien, pero viven una vida exigente.

PILARES DE CONTENIDO:
1. BEAUTY (pilar principal)
   - Pelo, skincare, makeup
   - Wellness cuando se cruza con cuidado natural de piel o pelo â€” van de la mano
   - Es el pilar que mÃ¡s atrae marcas y colaboraciones pagas
   - FÃ³rmula ganadora: hook visual/emocional en 0-2 seg + producto especÃ­fico o tÃ©cnica concreta + Andrea protagonista + resultado prometido

2. MAMÃ (pilar secundario)
   - Maternidad, momentos con Matilda
   - Con toque de reflexiÃ³n emocional â€” van integrados, no son categorÃ­as separadas

NOTA: Viral/actualidad no es un pilar â€” es contenido esporÃ¡dico de vez en cuando.

FORMATOS DE VIDEO (identificados por hashtag al final del caption):
#fmt_hablado #fmt_textmusic #fmt_voiceover #fmt_greenscreen #fmt_tutorial #fmt_hookvisual #fmt_trend #fmt_opinion #fmt_story #fmt_carrusel

CONTENIDO EXCLUIDO DEL ANÃLISIS ORGÃNICO:
TikTok: Fusion Water Magic, Hyaluronic, oleos Kativa
Instagram collabs: "Confirmen #bestfriend", "5 soles al que adivina"

Posts orgÃ¡nicos analizados: ${organicData.length} de ${data.length} totales.`;

  if (platform === 'TikTok') {
    return `Eres un estratega de contenido digital experto en TikTok para marcas personales de beauty.

${brandContext}

CONTEXTO DE TIKTOK:
- Algoritmo prioriza: retenciÃ³n, shares y tiempo de visualizaciÃ³n
- Contenido llega principalmente a NO seguidores (FYP)
- MÃ©tricas clave: views, shares, saves, comentarios
- El hook en los primeros 2 segundos determina todo
- El storytelling dentro del video de beauty es clave â€” no solo hook + tip

Analiza estos ${organicData.length} posts orgÃ¡nicos de TikTok y genera un informe estratÃ©gico en espaÃ±ol:

1. ðŸ† TOP 5 VIDEOS MÃS EXITOSOS
Para cada uno: tema, pilar, formato (#fmt_ si aparece), mÃ©tricas exactas (views/likes/shares/saves/comentarios), duraciÃ³n, y anÃ¡lisis de POR QUÃ‰ funcionÃ³.

2. âš ï¸ BOTTOM 5 VIDEOS CON MENOR RENDIMIENTO
Para cada uno: mÃ©tricas y anÃ¡lisis de POR QUÃ‰ no funcionÃ³ y quÃ© cambiar.

3. ðŸ“Š RENDIMIENTO POR PILAR
Beauty vs MamÃ¡. Â¿CuÃ¡l genera mÃ¡s views? Â¿CuÃ¡l mÃ¡s shares? Â¿CuÃ¡l mÃ¡s saves?

4. ðŸŽ¬ RENDIMIENTO POR FORMATO
Si hay hashtags #fmt_ en los captions, analiza quÃ© formato funciona mejor.

5. ðŸŽ£ PATRONES DE HOOK QUE FUNCIONAN
Â¿QuÃ© tipo de apertura generÃ³ mÃ¡s retenciÃ³n?

6. ðŸ“… MEJORES DÃAS Y HORARIOS PARA PUBLICAR

7. ðŸš€ 3 IDEAS CONCRETAS PARA ESTA SEMANA EN TIKTOK
Cada idea: tema exacto, formato recomendado (#fmt_), hook de apertura sugerido, por quÃ© va a funcionar, cÃ³mo adaptarlo a Instagram.

Datos: ${JSON.stringify(organicData.slice(0, 50))}

SÃ© muy especÃ­fica, accionable y basada en los datos reales.`;
  }

  if (platform === 'Instagram') {
    return `Eres un estratega de contenido digital experto en Instagram para marcas personales.

${brandContext}

CONTEXTO DE INSTAGRAM:
- Algoritmo prioriza: saves, comentarios y tiempo en el post
- Contenido llega principalmente a seguidores existentes
- MÃ©tricas clave: saves (la mÃ¡s valiosa), likes, comentarios, alcance en Reels
- El beauty funciona mejor anclado a historia personal de Andrea
- Formato ganador: video corto con texto y mÃºsica o voz en off â€” NO hablado directo a cÃ¡mara
- Los carruseles generan mÃ¡s saves que los videos

Analiza estos ${organicData.length} posts orgÃ¡nicos de Instagram y genera un informe estratÃ©gico en espaÃ±ol:

1. ðŸ† TOP 5 POSTS MÃS EXITOSOS
Para cada uno: tema, pilar, formato, mÃ©tricas exactas, y anÃ¡lisis de POR QUÃ‰ funcionÃ³.

2. âš ï¸ BOTTOM 5 POSTS CON MENOR RENDIMIENTO
Para cada uno: mÃ©tricas y anÃ¡lisis de POR QUÃ‰ no funcionÃ³.

3. ðŸ“Š RENDIMIENTO POR PILAR
Beauty vs MamÃ¡. Â¿CuÃ¡l genera mÃ¡s saves? Â¿CuÃ¡l mÃ¡s likes? Â¿CuÃ¡l mÃ¡s comentarios?

4. ðŸ’¾ QUÃ‰ CONTENIDO GENERA MÃS SAVES
Â¿QuÃ© tipo de contenido la gente guarda?

5. ðŸŽ¬ RENDIMIENTO POR FORMATO
Â¿Reels, carruseles, fotos? Â¿QuÃ© funciona mejor?

6. ðŸ“… MEJORES DÃAS Y HORARIOS PARA PUBLICAR EN INSTAGRAM

7. ðŸš€ 3 IDEAS CONCRETAS PARA ESTA SEMANA EN INSTAGRAM
Cada idea: tema exacto, formato recomendado, hook o primera lÃ­nea sugerida, por quÃ© va a funcionar.

Datos: ${JSON.stringify(organicData.slice(0, 50))}

SÃ© muy especÃ­fica, accionable y basada en los datos reales.`;
  }

  return `Analiza estos datos de ${platform} para @andreau.denegri y genera un informe en espaÃ±ol. Datos: ${JSON.stringify(organicData.slice(0, 50))}`;
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

  if (result && result.content && Array.isArray(result.content) && result.content.length > 0) {
    return result.content[0].text;
  }
  if (result && result.error) throw new Error('Claude API error: ' + result.error.message);
  throw new Error('Unexpected response: ' + JSON.stringify(result).slice(0, 200));
}

async function sendEmail(subject, htmlContent) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: CONFIG.EMAIL_USER, pass: CONFIG.EMAIL_PASSWORD }
  });

  await transporter.sendMail({
    from: `"Raya Studio Analytics" <${CONFIG.EMAIL_USER}>`,
    to: CONFIG.EMAIL_TO,
    subject: subject,
    html: `
      <div style="font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 30px; background: #fafaf8;">
        <h1 style="color: #2c2c2c; font-size: 24px; border-bottom: 2px solid #d4a89a; padding-bottom: 10px;">
          ðŸ“Š Informe de Redes Sociales
        </h1>
        <p style="color: #888; font-size: 13px;">Generado automÃ¡ticamente por Raya Studio Analytics Â· Claude AI</p>
        <div style="background: white; padding: 25px; border-radius: 8px; margin-top: 20px; line-height: 1.8; color: #333; white-space: pre-wrap;">
          ${htmlContent.replace(/\n/g, '<br>').replace(/---/g, '<hr style="border: 1px solid #eee;">')}
        </div>
        <p style="color: #bbb; font-size: 11px; margin-top: 20px; text-align: center;">
          Raya Studio Â· @andreau.denegri Â· Powered by Apify + Claude AI
        </p>
      </div>
    `
  });
}

// =====================
// RUTAS
// =====================

// Webhook normal de Apify
app.post('/webhook', async (req, res) => {
  try {
    console.log('Webhook recibido de Apify');
    const { resource, eventType } = req.body;

    if (eventType !== 'ACTOR.RUN.SUCCEEDED') {
      return res.json({ status: 'ignored' });
    }

    const actorId = resource?.actId || '';
    const datasetId = resource?.defaultDatasetId;
    if (!datasetId) return res.status(400).json({ error: 'No dataset ID' });

    const data = await httpRequest(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${CONFIG.APIFY_TOKEN}&limit=100`
    );

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.json({ status: 'no data' });
    }

    const platform = detectPlatform(data, actorId);
    console.log(`Analizando ${data.length} posts de ${platform} con Claude...`);

    const analysis = await analyzeWithClaude(data, platform);
    const date = new Date().toLocaleDateString('es-PE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    await sendEmail(`ðŸ“Š Informe ${platform} Â· ${date}`, analysis);
    console.log('âœ… Informe enviado exitosamente');
    res.json({ status: 'success', platform, posts: data.length });

  } catch (error) {
    console.error('ERROR webhook:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Ruta de prueba â€” acepta datos directamente sin Apify
app.post('/test', async (req, res) => {
  try {
    console.log('Prueba directa recibida');
    const data = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'EnvÃ­a un array de posts en el body' });
    }

    const platform = detectPlatform(data);
    console.log(`Plataforma detectada: ${platform} Â· ${data.length} posts`);

    const analysis = await analyzeWithClaude(data, platform);
    const date = new Date().toLocaleDateString('es-PE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    await sendEmail(`ðŸ§ª PRUEBA Â· Informe ${platform} Â· ${date}`, analysis);
    console.log('âœ… Prueba enviada exitosamente');
    res.json({ status: 'success', platform, posts: data.length, message: 'Revisa tu Gmail' });

  } catch (error) {
    console.error('ERROR test:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.json({
    status: 'Raya Studio Analytics Â· activo',
    rutas: {
      webhook: 'POST /webhook â€” para Apify',
      test: 'POST /test â€” para pruebas directas con JSON'
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Raya Studio Analytics corriendo en puerto ${PORT}`));
