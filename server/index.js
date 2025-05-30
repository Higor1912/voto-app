const express = require('express');
const fs = require('fs');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3001;
const DB_PATH = './server/db.json';

const ADMIN = {
  nome: 'admin',
  senha: 'admin123'
};

app.use(cors());
app.use(express.json());

function lerBD() {
  const raw = fs.readFileSync(DB_PATH);
  return JSON.parse(raw);
}

function salvarBD(dados) {
  fs.writeFileSync(DB_PATH, JSON.stringify(dados, null, 2));
}

// 🔐 Função para envio de e-mail com relatório
async function enviarEmailRelatorio(destinatario, assunto, conteudo) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'grautecnicocabo1@gmail.com',        
      pass: 'cdro nwtz nxkv eqfg'        
    }
  });

  await transporter.sendMail({
    from: '"Sistema de Votação" <grautecnicocabo1@gmail.com>',  
    to: destinatario,                                   
    subject: assunto,
    text: conteudo
  });
}

// 🔄 Rotas
app.post('/vote', (req, res) => {
  const { voterId, candidate } = req.body;
  const db = lerBD();

  if (!voterId || !candidate) {
    return res.json({ error: 'Dados incompletos' });
  }

  if (!db.candidatos.includes(candidate)) {
    return res.json({ error: 'Candidato inválido' });
  }

  if (db.eleitores.includes(voterId)) {
    return res.json({ error: 'Você já votou' });
  }

  db.votos.push({ voterId, candidate });
  db.eleitores.push(voterId);
  salvarBD(db);

  res.json({ message: 'Voto computado com sucesso!' });
});

app.post('/results', (req, res) => {
  const { nome, senha } = req.body;
  if (nome !== ADMIN.nome || senha !== ADMIN.senha) {
    return res.json({ error: 'Nome ou senha incorretos' });
  }

  const db = lerBD();
  const contagem = {};
  db.candidatos.forEach(c => contagem[c] = 0);
  db.votos.forEach(v => {
    if (contagem[v.candidate] !== undefined) {
      contagem[v.candidate]++;
    }
  });

  res.json({ resultados: contagem });
});

app.get('/candidatos', (req, res) => {
  const db = lerBD();
  res.json({ candidatos: db.candidatos });
});

app.post('/admin/add-candidato', (req, res) => {
  const { senha, nome } = req.body;
  if (senha !== ADMIN.senha) return res.json({ error: 'Senha incorreta' });

  const db = lerBD();
  if (!nome || db.candidatos.includes(nome)) {
    return res.json({ error: 'Candidato inválido ou já existe.' });
  }

  db.candidatos.push(nome);
  salvarBD(db);
  res.json({ message: 'Candidato adicionado com sucesso.' });
});

app.post('/admin/remove-candidato', (req, res) => {
  const { senha, nome } = req.body;
  if (senha !== ADMIN.senha) return res.json({ error: 'Senha incorreta' });

  const db = lerBD();
  db.candidatos = db.candidatos.filter(c => c !== nome);
  salvarBD(db);
  res.json({ message: 'Candidato removido com sucesso.' });
});

// ✉️ Rota para enviar o relatório por e-mail
app.post('/admin/enviar-relatorio', async (req, res) => {
  const { nome, senha } = req.body;
  if (nome !== ADMIN.nome || senha !== ADMIN.senha) {
    return res.json({ error: 'Nome ou senha incorretos' });
  }

  const db = lerBD();
  const contagem = {};
  db.candidatos.forEach(c => contagem[c] = 0);
  db.votos.forEach(v => {
    if (contagem[v.candidate] !== undefined) {
      contagem[v.candidate]++;
    }
  });

  const max = Math.max(...Object.values(contagem));
  const vencedores = Object.entries(contagem).filter(([_, v]) => v === max);

  let texto = '🏆 Relatório Final da Votação\n\n';
  if (vencedores.length === 1) {
    texto += `Vencedor: ${vencedores[0][0]}\nVotos: ${vencedores[0][1]}\n\n`;
  } else {
    texto += `Empate entre: ${vencedores.map(([n]) => n).join(', ')}\nVotos: ${max}\n\n`;
  }

  texto += 'Demais candidatos:\n';
  for (const [nome, votos] of Object.entries(contagem)) {
    texto += `${nome}: ${votos} voto(s)\n`;
  }

  try {
    await enviarEmailRelatorio('higorgrauti@gmail.com', 'Relatório Final da Votação', texto);
    res.json({ message: 'Relatório enviado por e-mail com sucesso!' });
  } catch (err) {
    res.json({ error: 'Falha ao enviar e-mail: ' + err.message });
  }
});

// 🚀 Inicia o servidor
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
