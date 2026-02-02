/**
 * OpenAPI 3.0 Specification for Trading Bot API
 */

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Trading Bot API",
    description:
      "REST API for paper trading with Alpaca Markets. Supports account management, order execution, and position tracking.",
    version: "1.0.0",
    contact: {
      name: "Alex Szapiro",
      email: "aszapiro@umich.edu",
    },
  },
  servers: [
    {
      url: "https://trading.alexszapiro.com",
      description: "Production",
    },
    {
      url: "http://localhost:3000",
      description: "Local Development",
    },
  ],
  tags: [
    { name: "Account", description: "Account information and balance" },
    { name: "Positions", description: "Current holdings and positions" },
    { name: "Orders", description: "Order management and execution" },
    { name: "Trade", description: "Quick trade execution" },
    { name: "Health", description: "Service health monitoring" },
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        description: "Returns service health status and dependency information",
        responses: {
          "200": {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "healthy" },
                    service: { type: "string", example: "trading-bot" },
                    timestamp: { type: "string", format: "date-time" },
                    uptime: { type: "number", example: 12345.67 },
                    dependencies: {
                      type: "object",
                      properties: {
                        alpaca: { type: "string", example: "configured" },
                        mode: { type: "string", example: "paper" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/account": {
      get: {
        tags: ["Account"],
        summary: "Get account information",
        description:
          "Returns current account balance, buying power, and portfolio value",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": {
            description: "Account information retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Account" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/positions": {
      get: {
        tags: ["Positions"],
        summary: "Get all positions",
        description: "Returns all current open positions with P&L",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": {
            description: "Positions retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Position" },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/orders": {
      get: {
        tags: ["Orders"],
        summary: "Get all orders",
        description: "Returns all orders with optional status filter",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            description: "Filter by order status",
            schema: {
              type: "string",
              enum: ["open", "closed", "all"],
              default: "open",
            },
          },
        ],
        responses: {
          "200": {
            description: "Orders retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Order" },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
      post: {
        tags: ["Orders"],
        summary: "Create new order",
        description: "Submit a new order to the market",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OrderRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Order created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Order" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
      delete: {
        tags: ["Orders"],
        summary: "Cancel order(s)",
        description: "Cancel a specific order or all open orders",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: "orderId",
            in: "query",
            description: "Specific order ID to cancel (omit for all)",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Order(s) cancelled successfully",
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/trade": {
      post: {
        tags: ["Trade"],
        summary: "Execute quick trade",
        description:
          "Execute a trade based on percentage of portfolio or dollar amount",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TradeRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Trade executed successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Order" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description: "API key for authentication",
      },
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "Bearer token (Authorization: Bearer <key>)",
      },
    },
    schemas: {
      Account: {
        type: "object",
        properties: {
          id: { type: "string" },
          account_number: { type: "string" },
          status: { type: "string", example: "ACTIVE" },
          currency: { type: "string", example: "USD" },
          cash: { type: "string", example: "50000.00" },
          portfolio_value: { type: "string", example: "100000.00" },
          buying_power: { type: "string", example: "200000.00" },
          equity: { type: "string", example: "100000.00" },
          last_equity: { type: "string", example: "99500.00" },
          pattern_day_trader: { type: "boolean", example: false },
          trading_blocked: { type: "boolean", example: false },
        },
      },
      Position: {
        type: "object",
        properties: {
          asset_id: { type: "string" },
          symbol: { type: "string", example: "AAPL" },
          qty: { type: "string", example: "10" },
          avg_entry_price: { type: "string", example: "150.00" },
          market_value: { type: "string", example: "1600.00" },
          cost_basis: { type: "string", example: "1500.00" },
          unrealized_pl: { type: "string", example: "100.00" },
          unrealized_plpc: { type: "string", example: "0.0667" },
          current_price: { type: "string", example: "160.00" },
          side: { type: "string", enum: ["long", "short"], example: "long" },
        },
      },
      Order: {
        type: "object",
        properties: {
          id: { type: "string" },
          client_order_id: { type: "string" },
          created_at: { type: "string", format: "date-time" },
          symbol: { type: "string", example: "AAPL" },
          qty: { type: "string", example: "10" },
          side: { type: "string", enum: ["buy", "sell"] },
          type: { type: "string", enum: ["market", "limit", "stop", "stop_limit"] },
          time_in_force: { type: "string", enum: ["day", "gtc", "ioc", "fok"] },
          limit_price: { type: "string", nullable: true },
          stop_price: { type: "string", nullable: true },
          status: {
            type: "string",
            enum: ["new", "filled", "partially_filled", "canceled", "expired"],
          },
          filled_qty: { type: "string" },
          filled_avg_price: { type: "string", nullable: true },
        },
      },
      OrderRequest: {
        type: "object",
        required: ["symbol", "qty", "side", "type"],
        properties: {
          symbol: {
            type: "string",
            description: "Stock symbol (1-5 uppercase letters)",
            example: "AAPL",
          },
          qty: {
            type: "number",
            description: "Quantity to buy/sell",
            minimum: 0.001,
            example: 10,
          },
          side: {
            type: "string",
            enum: ["buy", "sell"],
          },
          type: {
            type: "string",
            enum: ["market", "limit", "stop", "stop_limit"],
            default: "market",
          },
          timeInForce: {
            type: "string",
            enum: ["day", "gtc", "ioc", "fok"],
            default: "day",
          },
          limitPrice: {
            type: "number",
            description: "Required for limit orders",
            example: 150.0,
          },
          stopPrice: {
            type: "number",
            description: "Required for stop orders",
            example: 145.0,
          },
        },
      },
      TradeRequest: {
        type: "object",
        required: ["symbol", "side"],
        properties: {
          symbol: {
            type: "string",
            description: "Stock symbol",
            example: "AAPL",
          },
          side: {
            type: "string",
            enum: ["buy", "sell"],
          },
          percentOfPortfolio: {
            type: "number",
            description: "Percentage of portfolio to trade (1-100)",
            minimum: 0.1,
            maximum: 100,
            example: 5,
          },
          dollarAmount: {
            type: "number",
            description: "Dollar amount to trade",
            minimum: 1,
            example: 1000,
          },
          type: {
            type: "string",
            enum: ["market", "limit"],
            default: "market",
          },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Authentication required",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
              error: "Unauthorized",
              message:
                "Valid API key required. Set x-api-key header or Authorization: Bearer <key>",
            },
          },
        },
      },
      BadRequest: {
        description: "Invalid request parameters",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
              error: "Validation Error",
              message: "Invalid symbol format",
            },
          },
        },
      },
      RateLimited: {
        description: "Rate limit exceeded",
        headers: {
          "X-RateLimit-Limit": {
            schema: { type: "integer" },
            description: "Request limit per window",
          },
          "X-RateLimit-Remaining": {
            schema: { type: "integer" },
            description: "Remaining requests in window",
          },
          "X-RateLimit-Reset": {
            schema: { type: "integer" },
            description: "Unix timestamp when limit resets",
          },
          "Retry-After": {
            schema: { type: "integer" },
            description: "Seconds until retry is allowed",
          },
        },
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
              error: "Too Many Requests",
              message: "Rate limit exceeded. Please try again later.",
              retryAfter: 30,
            },
          },
        },
      },
    },
  },
};
