# SysVoice — Voice System Design Diagram

Speak or type your system design — watch the diagram build in real time.

## Setup

```bash
npm install
```

Create a `.env` file in the project root:
```
VITE_GEMINI_KEY=AIzaSy...
```

Get your key free at https://aistudio.google.com

Then run:
```bash
npm run dev
```

Open http://localhost:5173

## Features

- **Voice input** — hold mic button and describe your system
- **Text input** — type and press Enter
- **Multi-project** — create and switch between projects in the sidebar
- **Light/dark mode** — toggle via ☀/☾ in the toolbar
- **Export** — download as SVG, PNG, or JPEG
- **Undo** — step back through changes
- **Pan & zoom** — scroll to zoom, drag background to pan

## Example prompts

- "Create a food delivery app with mobile client, API gateway, order service, restaurant service, user service, Postgres database, and a message queue"
- "Add a Redis cache between the API gateway and order service"
- "Put a load balancer in front of the API gateway"
- "Add a notification service that consumes from the queue"
