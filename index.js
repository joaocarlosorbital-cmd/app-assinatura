const express = require('express');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static('public'));
app.use(express.json({ limit: '10mb' }));

let pdfNaMemoria = null;

// 1. Rota para enviar o PDF
app.post('/upload', upload.single('pdf'), (req, res) => {
  pdfNaMemoria = req.file.buffer;
  res.json({ message: 'PDF enviado!', link: '/assinar.html' });
});

// 2. Rota para assinar e carimbar
app.post('/assinar', async (req, res) => {
  try {
    const { assinaturaBase64 } = req.body;
    if (!pdfNaMemoria) return res.status(400).send('Nenhum PDF enviado.');

    const pdfDoc = await PDFDocument.load(pdfNaMemoria);

    const assinaturaBytes = Buffer.from(
      assinaturaBase64.split(',')[1],
      'base64'
    );
    const assinaturaImage = await pdfDoc.embedPng(assinaturaBytes);

    // Pega a PRIMEIRA página
    const pages = pdfDoc.getPages();
    const primeiraPagina = pages[0];

    // Onde a assinatura vai ficar
    primeiraPagina.drawImage(assinaturaImage, {
      x: 250, // Centraliza na horizontal
      y: 105, // ALTURA MATEMÁTICA! (Fica exatamente na linha)
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

app.listen(3000, () => {
  console.log('Motor ligado na porta 3000!');
});
