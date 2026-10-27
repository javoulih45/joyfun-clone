const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve os arquivos estáticos da interface (HTML, CSS, JS) colocados na pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Estado inicial: 500M de créditos
let userCredits = 500_000_000;
const activeJobs = new Map();

// Configuração de Modelos de Vídeo (Simulando endpoints de APIs gratuitas como Hugging Face Inference ou Replicate)
const MODELS = {
  "stable-video-diffusion": {
    name: "Stable Video Diffusion 14B",
    costPerSecond: 150,
    endpoint: "https://huggingface.co"
  },
  "ltx-video": {
    name: "LTX-Video 0.9",
    costPerSecond: 100,
    endpoint: "https://huggingface.co"
  }
};

// Rota de Status
app.get('/api/status', (req, res) => {
  res.json({
    credits: userCredits,
    activeJobs: activeJobs.size,
    models: Object.keys(MODELS)
  });
});

// Rota de Geração
app.post('/api/generate', async (req, res) => {
  const { model, prompt, duration, seed } = req.body;
  const modelConfig = MODELS[model];

  if (!modelConfig) return res.status(400).json({ error: "Modelo inválido" });
  
  const cost = modelConfig.costPerSecond * duration;
  if (userCredits < cost) return res.status(400).json({ error: "Créditos insuficientes" });

  userCredits -= cost;
  const jobId = uuidv4();
  
  activeJobs.set(jobId, {
    status: "processing",
    model: modelConfig.name,
    prompt,
    progress: 0,
    eta: 0
  });

  // Inicia a geração assíncrona na GPU
  generateVideo(jobId, model, prompt, duration, seed).catch(err => {
    console.error(err);
    activeJobs.set(jobId, { status: "failed", error: err.message });
  });

  res.json({ jobId, cost, remainingCredits: userCredits });
});

// Rota de Progresso
app.get('/api/jobs/:id', (req, res) => {
  const job = activeJobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job não encontrado" });
  res.json(job);
});

// Simulação de Geração na GPU
async function generateVideo(jobId, modelId, prompt, duration, seed) {
  const modelConfig = MODELS[modelId];
  const totalSteps = duration * 10; // Simulação de passos de inferência
  
  for (let i = 1; i <= totalSteps; i++) {
    await new Promise(r => setTimeout(r, 500));
    const progress = (i / totalSteps) * 100;
    const eta = Math.ceil((totalSteps - i) * 0.5);
    activeJobs.set(jobId, { ...activeJobs.get(jobId), progress, eta });
    
    // Lógica real de chamada à GPU via API de inference
    if (i === totalSteps) {
      const videoUrl = `https://googleapis.com{jobId}.mp4`;
      activeJobs.set(jobId, { status: "completed", url: videoUrl, progress: 100 });
    }
  }
}

// Rota raiz que entrega o seu site visual (deve ficar abaixo das rotas de API)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`JoyFun Clone rodando na porta ${PORT}`));
        
