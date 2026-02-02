"use client";

import { openApiSpec } from "@/lib/openapi";

type Method = "get" | "post" | "put" | "delete" | "patch";

const methodColors: Record<Method, string> = {
  get: "bg-green-500",
  post: "bg-blue-500",
  put: "bg-yellow-500",
  delete: "bg-red-500",
  patch: "bg-purple-500",
};

interface PathOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  security?: unknown[];
  parameters?: Array<{
    name: string;
    in: string;
    description?: string;
    required?: boolean;
    schema?: { type?: string; enum?: string[]; default?: unknown };
  }>;
  requestBody?: {
    required?: boolean;
    content?: {
      "application/json"?: {
        schema?: { $ref?: string };
      };
    };
  };
  responses?: Record<
    string,
    {
      description?: string;
      content?: unknown;
      $ref?: string;
    }
  >;
}

export default function ApiDocsPage() {
  const spec = openApiSpec;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{spec.info.title}</h1>
              <p className="text-gray-400 text-sm mt-1">
                Version {spec.info.version}
              </p>
            </div>
            <a
              href="/"
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Description */}
        <section className="mb-8">
          <p className="text-gray-300 leading-relaxed">
            {spec.info.description}
          </p>
        </section>

        {/* Servers */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Base URLs</h2>
          <div className="space-y-2">
            {spec.servers.map((server, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-2"
              >
                <code className="text-green-400 font-mono text-sm">
                  {server.url}
                </code>
                <span className="text-gray-500 text-sm">
                  — {server.description}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Authentication */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Authentication</h2>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-300 mb-3">
              API endpoints require authentication. Include one of these
              headers:
            </p>
            <div className="space-y-2 font-mono text-sm">
              <div className="bg-gray-900 rounded px-3 py-2">
                <span className="text-purple-400">x-api-key:</span>{" "}
                <span className="text-gray-400">your-api-key</span>
              </div>
              <div className="bg-gray-900 rounded px-3 py-2">
                <span className="text-purple-400">Authorization:</span>{" "}
                <span className="text-gray-400">Bearer your-api-key</span>
              </div>
            </div>
          </div>
        </section>

        {/* Rate Limiting */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Rate Limiting</h2>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-300 mb-2">
              API requests are rate limited to <strong>5 requests per minute</strong>{" "}
              per IP address.
            </p>
            <p className="text-gray-400 text-sm">
              Rate limit headers are included in all responses:{" "}
              <code className="text-blue-400">X-RateLimit-Limit</code>,{" "}
              <code className="text-blue-400">X-RateLimit-Remaining</code>,{" "}
              <code className="text-blue-400">X-RateLimit-Reset</code>
            </p>
          </div>
        </section>

        {/* Endpoints by Tag */}
        {spec.tags.map((tag) => (
          <section key={tag.name} className="mb-12">
            <h2 className="text-xl font-semibold mb-2">{tag.name}</h2>
            <p className="text-gray-400 mb-4">{tag.description}</p>

            <div className="space-y-4">
              {Object.entries(spec.paths)
                .filter(([, methods]) =>
                  Object.values(methods as Record<string, PathOperation>).some(
                    (op) => op.tags?.includes(tag.name)
                  )
                )
                .map(([path, methods]) =>
                  Object.entries(methods as Record<Method, PathOperation>)
                    .filter(([, op]) => op.tags?.includes(tag.name))
                    .map(([method, operation]) => (
                      <div
                        key={`${method}-${path}`}
                        className="bg-gray-800 rounded-lg overflow-hidden"
                      >
                        {/* Endpoint Header */}
                        <div className="flex items-center gap-3 px-4 py-3 bg-gray-750 border-b border-gray-700">
                          <span
                            className={`${methodColors[method as Method]} text-white text-xs font-bold px-2 py-1 rounded uppercase`}
                          >
                            {method}
                          </span>
                          <code className="text-gray-100 font-mono">
                            {path}
                          </code>
                          {operation.security && (
                            <span className="ml-auto text-xs text-yellow-400 flex items-center gap-1">
                              🔒 Auth Required
                            </span>
                          )}
                        </div>

                        {/* Endpoint Body */}
                        <div className="px-4 py-4">
                          <h3 className="font-medium mb-1">
                            {operation.summary}
                          </h3>
                          <p className="text-gray-400 text-sm mb-4">
                            {operation.description}
                          </p>

                          {/* Parameters */}
                          {operation.parameters &&
                            operation.parameters.length > 0 && (
                              <div className="mb-4">
                                <h4 className="text-sm font-medium text-gray-300 mb-2">
                                  Parameters
                                </h4>
                                <div className="bg-gray-900 rounded p-3 space-y-2">
                                  {operation.parameters.map((param) => (
                                    <div
                                      key={param.name}
                                      className="flex items-start gap-2 text-sm"
                                    >
                                      <code className="text-blue-400">
                                        {param.name}
                                      </code>
                                      <span className="text-gray-500">
                                        ({param.in})
                                      </span>
                                      {param.required && (
                                        <span className="text-red-400 text-xs">
                                          required
                                        </span>
                                      )}
                                      <span className="text-gray-400">
                                        — {param.description}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          {/* Request Body */}
                          {operation.requestBody && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-300 mb-2">
                                Request Body
                                {operation.requestBody.required && (
                                  <span className="text-red-400 ml-2 text-xs">
                                    required
                                  </span>
                                )}
                              </h4>
                              <div className="bg-gray-900 rounded p-3">
                                <code className="text-green-400 text-sm">
                                  {operation.requestBody.content?.[
                                    "application/json"
                                  ]?.schema?.$ref?.replace(
                                    "#/components/schemas/",
                                    ""
                                  ) || "JSON"}
                                </code>
                              </div>
                            </div>
                          )}

                          {/* Responses */}
                          {operation.responses && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-300 mb-2">
                                Responses
                              </h4>
                              <div className="bg-gray-900 rounded p-3 space-y-2">
                                {Object.entries(operation.responses).map(
                                  ([code, response]) => (
                                    <div
                                      key={code}
                                      className="flex items-center gap-3 text-sm"
                                    >
                                      <span
                                        className={`font-mono font-bold ${
                                          code.startsWith("2")
                                            ? "text-green-400"
                                            : code.startsWith("4")
                                              ? "text-yellow-400"
                                              : "text-red-400"
                                        }`}
                                      >
                                        {code}
                                      </span>
                                      <span className="text-gray-400">
                                        {response.description ||
                                          response.$ref?.replace(
                                            "#/components/responses/",
                                            ""
                                          )}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                )}
            </div>
          </section>
        ))}

        {/* Schemas */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Schemas</h2>
          <div className="space-y-4">
            {Object.entries(spec.components.schemas).map(([name, schema]) => (
              <div key={name} className="bg-gray-800 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-750 border-b border-gray-700">
                  <code className="text-purple-400 font-mono">{name}</code>
                </div>
                <div className="px-4 py-4">
                  <pre className="text-sm text-gray-300 overflow-x-auto">
                    {JSON.stringify(schema, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700 py-6">
        <div className="max-w-6xl mx-auto px-6 text-center text-gray-500 text-sm">
          <p>Trading Bot API Documentation — OpenAPI 3.0</p>
          <p className="mt-1">
            Contact:{" "}
            <a
              href={`mailto:${spec.info.contact?.email}`}
              className="text-blue-400 hover:text-blue-300"
            >
              {spec.info.contact?.email}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
