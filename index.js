const express = require('express');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const path = require('path');
const { Resend } = require('resend'); // Importa o Resend

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const resend = new Resend(process.env.RESEND_API_KEY); // Pega a chave da Vercel

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

let pdfNaMemoria = null;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota de upload (agora envia o e-mail)
app.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    pdfNaMemoria = req.file.buffer;
    const emailFuncionario = req.body.email; // Pega o e-mail que veio do HTML

    if (emailFuncionario) {
      // Dispara o e-mail
      const { data, error } = await resend.emails.send({
        from: 'onboarding@resend.dev', // E-mail padrão do Resend para testes
        to: [emailFuncionario],
        subject: 'Documento para assinatura',
        html: `<p>Olá! Você recebeu um documento para assinar.</p>
               <p><a href="https://${req.get('host')}/assinar.html">Clique aqui para assinar</a></p>`,
      });
      
      if (error) {
        console.error('Erro no Resend:', error);
      }
    }

    res.json({ message: 'PDF enviado e e-mail disparado!', link: '/assinar.html' });
  } catch (error) {
    res.status(500).send('Erro no upload: ' + error.message);
  }
});

// Rota de assinatura
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
    res.status(500).send('Erro ao assinar: ' + error.message);
  }
});

module.exports = app;