# CineMotion Chatbot

CineMotion is a movie and web-series recommendation chatbot with a cinematic animated frontend and a custom Node backend. It understands mood-driven prompts, mixed genres, platform-focused asks like Netflix, and "latest" style discovery requests.

## Features

- Smooth glassmorphism chat UI with animated discovery lanes
- Recommendation engine for moods, genres, platforms, and latest/trending requests
- Supports both movies and web series
- Curated demo catalog with rich recommendation cards
- No external dependencies required

## Run Locally

```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

## Demo Prompt Ideas

- `Recommend dark intense Netflix web series`
- `Show me the latest movies with a premium cinematic feel`
- `Suggest feel-good romantic comedy movies for tonight`
- `Give me mind-bending sci-fi and mystery web series`

## Note

The current project uses a curated demo catalog so it can run offline and without API keys. If you want, the next upgrade can connect this to a live movie API such as TMDb or Watchmode for real-time titles, posters, and platform availability.
