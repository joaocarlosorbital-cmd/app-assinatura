const express = require('express');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// 1. Configuração para servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

let pdfNaMemoria = null;

// 2. ROTA EXPLÍCITA PARA A RAIZ (Essencial para a Vercel)
// Quando alguém acessar o link principal, envia o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 3. Rota para enviar o PDF
app.post('/upload', upload.single('pdf'), (req, res) => {
  pdfNaMemoria = req.file.buffer;
  res.json({ message: 'PDF enviado!', link: '/assinar.html' });
});

// 4. Rota para assinar e carimbar
app.post('/assinar', async (req, res) => {
  try {
    const { assinaturaBase64 } = req.body;
    if (!pdfNaMemoria) return res.status(400).send('Nenhum PDF enviado.');

    const pdfDoc = await PDFDocument.load(pdfNaMemoria);
    const assinaturaBytes = Buffer.from(assinaturaBase64.split(',')[1], 'base64');
    const assinaturaImage = await pdfDoc.embedPng(assinaturaBytes);

    const pages = pdfDoc.getPages();
    const primeiraPagina = pages[0];

    primeiraPagina.drawImage(assinaturaImage, {
      x: 250,
      y: 105,
      width: 200,
      height: 60,
    });

    const pdfAssinadoBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfAssinadoBytes).toString('base64');

    res.json({
      message: 'Assinado com sucesso!',
      link: `data:application/pdf;base64,${pdfBase64}`,
    });
  } catch (error) {
    res.status(500).send('Erro: ' + error.message);
  }
});

// 5. A linha mais importante para a Vercel:
module.exports = app; 