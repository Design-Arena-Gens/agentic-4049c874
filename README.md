<div align="center">
  <h1>Aurora FotoLab</h1>
  <p>Aplicativo web para restauração rápida de fotos antigas diretamente no navegador.</p>
</div>

## ✨ Recursos principais

- Upload por arraste e soltar com pré-visualização imediata.
- Comparador interativo de antes/depois com controle deslizante.
- Presets inteligentes para restauração automática, recuperação de cores, detalhes ou limpeza suave.
- Ajustes finos de exposição, contraste, vitalidade, temperatura, remoção de sépia, clareza e redução de ruído.
- Download da foto restaurada em alta qualidade (JPEG 92%).

## 🛠️ Stack

- [Next.js 14 (App Router)](https://nextjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)

## 🚀 Rodando localmente

```bash
npm install
npm run dev
```

Acesse **http://localhost:3000** e carregue uma foto para começar a restauração.

## 📂 Estrutura relevante

```
src/
 ├─ app/
 │   ├─ layout.tsx         # Layout raiz e metadados
 │   ├─ page.tsx           # Interface e lógica da aplicação
 │   └─ globals.css        # Estilos globais (gradientes, tema)
 └─ lib/
     └─ image-processing.ts # Algoritmos de restauração e ajustes
```

## 📦 Build de produção

```bash
npm run build
npm run start
```

## 📜 Licença

Este projeto foi criado para fins demonstrativos. Ajuste, evolua e distribua conforme necessário.
