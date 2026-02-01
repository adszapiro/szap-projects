# szap-cli

A CLI tool for scaffolding projects with best practices.

## Installation

```bash
npm install -g szap-cli
```

## Usage

### Create a new project

```bash
szap create my-app
# or
szap new my-app
```

This will guide you through:
1. Choosing a template (Next.js, API, or Library)
2. Selecting features (Tailwind, Icons, etc.)
3. Picking a package manager

### List available templates

```bash
szap list
```

## Templates

| Template | Description |
|----------|-------------|
| `nextjs` | Full-stack Next.js 14+ with App Router, TypeScript, and Tailwind |
| `api` | Node.js API with Express and TypeScript |
| `library` | Publishable npm package with TypeScript |

## Features

- 🚀 Interactive CLI with beautiful prompts
- 📦 Multiple project templates
- ⚡ Automatic dependency installation
- 🎨 Tailwind CSS integration
- 📝 TypeScript by default
- 🔧 Best practices baked in

## Author

Alex Szapiro - [Portfolio](https://portfolio-adszapiro.vercel.app)

## License

MIT
