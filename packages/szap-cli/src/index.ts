#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const program = new Command();

// ASCII Art Banner
const banner = `
${chalk.cyan("╔═══════════════════════════════════════╗")}
${chalk.cyan("║")}     ${chalk.bold.magenta("SZAP CLI")} - Project Scaffolder     ${chalk.cyan("║")}
${chalk.cyan("║")}   ${chalk.gray("Built by Alex Szapiro")}              ${chalk.cyan("║")}
${chalk.cyan("╚═══════════════════════════════════════╝")}
`;

interface ProjectConfig {
  name: string;
  template: "nextjs" | "api" | "library";
  features: string[];
  packageManager: "npm" | "yarn" | "pnpm";
}

// Template generators
const templates = {
  nextjs: {
    name: "Next.js App",
    description: "Full-stack Next.js 14+ with App Router",
    files: (config: ProjectConfig) => ({
      "package.json": JSON.stringify(
        {
          name: config.name,
          version: "0.1.0",
          private: true,
          scripts: {
            dev: "next dev",
            build: "next build",
            start: "next start",
            lint: "next lint",
          },
          dependencies: {
            next: "^14.0.0",
            react: "^18.0.0",
            "react-dom": "^18.0.0",
            ...(config.features.includes("tailwind") && { tailwindcss: "^3.4.0" }),
            ...(config.features.includes("icons") && { "lucide-react": "^0.300.0" }),
          },
          devDependencies: {
            "@types/node": "^20",
            "@types/react": "^18",
            "@types/react-dom": "^18",
            typescript: "^5",
            ...(config.features.includes("tailwind") && { postcss: "^8", autoprefixer: "^10" }),
          },
        },
        null,
        2
      ),
      "tsconfig.json": JSON.stringify(
        {
          compilerOptions: {
            lib: ["dom", "dom.iterable", "esnext"],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: "esnext",
            moduleResolution: "bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: "preserve",
            incremental: true,
            plugins: [{ name: "next" }],
            paths: { "@/*": ["./*"] },
          },
          include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
          exclude: ["node_modules"],
        },
        null,
        2
      ),
      "next.config.ts": `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`,
      "app/layout.tsx": `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${config.name}",
  description: "Built with szap-cli",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
      "app/page.tsx": `export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">${config.name}</h1>
        <p className="text-gray-600">Built with szap-cli</p>
      </div>
    </main>
  );
}
`,
      "app/globals.css": config.features.includes("tailwind")
        ? `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground: #171717;
  --background: #ffffff;
}

body {
  color: var(--foreground);
  background: var(--background);
}
`
        : `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
`,
      ...(config.features.includes("tailwind") && {
        "tailwind.config.ts": `import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
`,
        "postcss.config.mjs": `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`,
      }),
      ".gitignore": `node_modules/
.next/
out/
.env
.env.local
.DS_Store
`,
      "README.md": `# ${config.name}

Created with [szap-cli](https://github.com/adszapiro/szap-projects).

## Getting Started

\`\`\`bash
${config.packageManager} install
${config.packageManager} run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.
`,
    }),
  },
  api: {
    name: "Node.js API",
    description: "Express/Fastify API with TypeScript",
    files: (config: ProjectConfig) => ({
      "package.json": JSON.stringify(
        {
          name: config.name,
          version: "0.1.0",
          type: "module",
          scripts: {
            dev: "tsx watch src/index.ts",
            build: "tsc",
            start: "node dist/index.js",
          },
          dependencies: {
            express: "^4.18.0",
            cors: "^2.8.5",
          },
          devDependencies: {
            "@types/express": "^4.17.0",
            "@types/cors": "^2.8.0",
            "@types/node": "^20",
            typescript: "^5",
            tsx: "^4.0.0",
          },
        },
        null,
        2
      ),
      "tsconfig.json": JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            module: "NodeNext",
            moduleResolution: "NodeNext",
            outDir: "./dist",
            rootDir: "./src",
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
          },
          include: ["src/**/*"],
          exclude: ["node_modules"],
        },
        null,
        2
      ),
      "src/index.ts": `import express from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Welcome to ${config.name} API" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(\`Server running on http://localhost:\${port}\`);
});
`,
      ".gitignore": `node_modules/
dist/
.env
.DS_Store
`,
      "README.md": `# ${config.name}

API created with [szap-cli](https://github.com/adszapiro/szap-projects).

## Getting Started

\`\`\`bash
${config.packageManager} install
${config.packageManager} run dev
\`\`\`

API will be available at [http://localhost:3001](http://localhost:3001).
`,
    }),
  },
  library: {
    name: "TypeScript Library",
    description: "Publishable npm package",
    files: (config: ProjectConfig) => ({
      "package.json": JSON.stringify(
        {
          name: config.name,
          version: "0.1.0",
          main: "dist/index.js",
          types: "dist/index.d.ts",
          scripts: {
            build: "tsc",
            dev: "tsc -w",
            prepublishOnly: "npm run build",
          },
          devDependencies: {
            "@types/node": "^20",
            typescript: "^5",
          },
        },
        null,
        2
      ),
      "tsconfig.json": JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            module: "CommonJS",
            outDir: "./dist",
            rootDir: "./src",
            declaration: true,
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
          },
          include: ["src/**/*"],
          exclude: ["node_modules"],
        },
        null,
        2
      ),
      "src/index.ts": `// ${config.name}
// Built with szap-cli

export function hello(name: string): string {
  return \`Hello, \${name}!\`;
}

export default { hello };
`,
      ".gitignore": `node_modules/
dist/
.DS_Store
`,
      "README.md": `# ${config.name}

Library created with [szap-cli](https://github.com/adszapiro/szap-projects).

## Installation

\`\`\`bash
npm install ${config.name}
\`\`\`

## Usage

\`\`\`typescript
import { hello } from "${config.name}";

console.log(hello("World")); // Hello, World!
\`\`\`
`,
    }),
  },
};

async function createProject(config: ProjectConfig) {
  const spinner = ora("Creating project...").start();
  const projectDir = path.join(process.cwd(), config.name);

  try {
    // Create directory
    if (fs.existsSync(projectDir)) {
      spinner.fail(chalk.red(`Directory ${config.name} already exists`));
      return;
    }
    fs.mkdirSync(projectDir, { recursive: true });

    // Get template files
    const template = templates[config.template];
    const files = template.files(config);

    // Write files
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(projectDir, filePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, content as string);
    }

    spinner.succeed(chalk.green("Project created!"));

    // Install dependencies
    const installSpinner = ora("Installing dependencies...").start();
    const installCmd =
      config.packageManager === "yarn"
        ? "yarn"
        : config.packageManager === "pnpm"
        ? "pnpm install"
        : "npm install";

    execSync(installCmd, { cwd: projectDir, stdio: "ignore" });
    installSpinner.succeed(chalk.green("Dependencies installed!"));

    // Success message
    console.log("\n" + chalk.green.bold("✓ Project ready!"));
    console.log("\n" + chalk.cyan("Next steps:"));
    console.log(chalk.gray(`  cd ${config.name}`));
    console.log(chalk.gray(`  ${config.packageManager} run dev`));
    console.log("");
  } catch (error) {
    spinner.fail(chalk.red("Failed to create project"));
    console.error(error);
  }
}

// CLI Commands
program
  .name("szap")
  .description("CLI tool for scaffolding projects")
  .version("1.0.0");

program
  .command("create")
  .alias("new")
  .description("Create a new project")
  .argument("[name]", "Project name")
  .action(async (name?: string) => {
    console.log(banner);

    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "Project name:",
        default: name || "my-project",
        validate: (input: string) =>
          /^[a-z0-9-]+$/.test(input) || "Use lowercase letters, numbers, and hyphens only",
      },
      {
        type: "list",
        name: "template",
        message: "Select template:",
        choices: Object.entries(templates).map(([key, val]) => ({
          name: `${val.name} - ${val.description}`,
          value: key,
        })),
      },
      {
        type: "checkbox",
        name: "features",
        message: "Select features:",
        choices: [
          { name: "Tailwind CSS", value: "tailwind", checked: true },
          { name: "Lucide Icons", value: "icons", checked: true },
        ],
        when: (answers) => answers.template === "nextjs",
      },
      {
        type: "list",
        name: "packageManager",
        message: "Package manager:",
        choices: ["npm", "yarn", "pnpm"],
        default: "npm",
      },
    ]);

    await createProject({
      name: answers.name,
      template: answers.template,
      features: answers.features || [],
      packageManager: answers.packageManager,
    });
  });

program
  .command("list")
  .description("List available templates")
  .action(() => {
    console.log(banner);
    console.log(chalk.bold("Available Templates:\n"));
    Object.entries(templates).forEach(([key, val]) => {
      console.log(`  ${chalk.cyan(key.padEnd(12))} ${val.name} - ${chalk.gray(val.description)}`);
    });
    console.log("");
  });

program.parse();
