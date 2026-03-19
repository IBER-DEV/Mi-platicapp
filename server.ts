import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { google } from 'googleapis';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/auth/callback`
);

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.metadata.readonly'];
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

const CATEGORIES = {
  Ingreso: [
    'Salarios',
    'Aux de transporte',
    'Prestación de servicios',
    'Otros ingresos'
  ],
  Gasto: {
    Alojamiento: [
      'Hipoteca', 'Teléfono', 'Electricidad', 'Gas', 'Agua',
      'Televisión por cable', 'Aseo', 'Mantenimiento/reparac.', 'Suministros'
    ],
    Transporte: [
      'Gastos de taxi o bus', 'Combustible', 'Mantenimiento'
    ],
    Comida: [
      'Alimentos', 'Restaurantes'
    ],
    Otros: [
      'Pólizas de seguros', 'Gastos mascotas', 'Cuidado personal/Higiene',
      'Impuestos', 'Préstamos', 'Tarjetas de crédito', 'Entretenimiento', 'Otros gastos'
    ]
  }
};

// Auth Routes
app.get('/api/auth/url', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  res.json({ url });
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    
    // Store tokens in a secure cookie
    res.cookie('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Autenticación exitosa. Esta ventana se cerrará automáticamente.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    res.status(500).send('Error de autenticación');
  }
});

app.get('/api/auth/status', (req, res) => {
  const tokens = req.cookies.google_tokens;
  res.json({ isAuthenticated: !!tokens });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('google_tokens');
  res.json({ success: true });
});

app.post('/api/ai/parse-entry', async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: 'No autenticado' });
  if (!ai) return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en servidor' });

  const { quickEntry } = req.body;
  if (typeof quickEntry !== 'string' || !quickEntry.trim()) {
    return res.status(400).json({ error: 'Entrada invalida' });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analiza este gasto/ingreso y extrae los datos en JSON: "${quickEntry}".
      Categorías permitidas: ${JSON.stringify(CATEGORIES)}.
      Responde SOLO con el JSON con campos: type (Ingreso o Gasto), amount (número), category (string de las permitidas), description (string).`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['Ingreso', 'Gasto'] },
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ['type', 'amount', 'category', 'description']
        }
      }
    });

    const parsed = JSON.parse(response.text);
    res.json(parsed);
  } catch (error) {
    console.error('Error processing AI quick entry:', error);
    res.status(500).json({ error: 'No se pudo procesar la entrada con IA' });
  }
});

// Sheets API Routes
app.get('/api/sheets/list', async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: 'No autenticado' });

  try {
    const tokens = JSON.parse(tokensStr);
    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      fields: 'files(id, name)',
      pageSize: 20
    });

    res.json(response.data.files);
  } catch (error) {
    console.error('Error listing sheets:', error);
    res.status(500).json({ error: 'Error al listar archivos' });
  }
});

app.get('/api/sheets/recent', async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: 'No autenticado' });

  const { spreadsheetId } = req.query;

  try {
    const tokens = JSON.parse(tokensStr);
    oauth2Client.setCredentials(tokens);
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // Get the last 5 rows from Registros sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId as string,
      range: 'Registros!A2:F1000', // Assuming headers are in row 1
    });

    const rows = response.data.values || [];
    const recent = rows.slice(-5).reverse(); // Last 5, newest first
    res.json(recent);
  } catch (error) {
    console.error('Error fetching recent records:', error);
    res.status(500).json({ error: 'Error al obtener registros recientes' });
  }
});

app.post('/api/sheets/append', async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: 'No autenticado' });

  const { spreadsheetId, range, values } = req.body;

  try {
    const tokens = JSON.parse(tokensStr);
    oauth2Client.setCredentials(tokens);
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values]
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error appending to sheet:', error);
    res.status(500).json({ error: 'Error al guardar datos' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
