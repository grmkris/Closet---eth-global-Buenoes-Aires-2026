# OpenAI Apps SDK - Summary & Resources

## Overview
Build interactive web apps that run **inside ChatGPT** conversations. Apps combine:
- **MCP Server** (Node/Python) - defines tools & serves HTML widgets
- **Web Components** - UI rendered in iframe with `window.openai` API bridge
- **Natural Language Invocation** - users trigger apps via chat prompts

## Key Resources

### Official Documentation
- **Main Docs**: https://developers.openai.com/apps-sdk/
- **Quickstart**: https://developers.openai.com/apps-sdk/quickstart/
- **UI Kit**: https://openai.github.io/apps-sdk-ui
- **Examples Repo**: https://github.com/openai/openai-apps-sdk-examples

### Tutorials
- **FreeCodeCamp Pizza App Tutorial**: https://www.freecodecamp.org/news/how-to-use-the-chatgpt-apps-sdk/
- **OpenAI Announcement**: https://openai.com/index/introducing-apps-in-chatgpt/

### MCP (Model Context Protocol)
- **Python SDK**: `pip install mcp`
- **Node SDK**: `npm install @modelcontextprotocol/sdk zod`
- **MCP Inspector**: `npx @modelcontextprotocol/inspector@latest http://localhost:8787/mcp`

## Architecture

### MCP Server Capabilities
```javascript
// Register a widget resource
server.registerResource(
  "widget-name",
  "ui://widget/app.html",
  {},
  async () => ({ contents: [{ uri: "...", mimeType: "text/html+skybridge", text: htmlContent }] })
);

// Register a tool
server.registerTool(
  "add_item",
  {
    title: "Add Item",
    description: "Creates an item",
    inputSchema: { title: z.string() },
    _meta: {
      "openai/outputTemplate": "ui://widget/app.html",
      "openai/toolInvocation/invoking": "Adding item",
      "openai/toolInvocation/invoked": "Added item"
    }
  },
  async (args) => {
    // Tool logic
    return {
      content: [{ type: "text", text: "Success message" }],
      structuredContent: { data: yourData }
    };
  }
);
```

### Web Component API (`window.openai`)

**Data Access:**
- `window.openai.toolOutput` - initial data from ChatGPT
- `window.openai.theme` - light/dark mode
- `window.openai.locale` - user language
- `window.openai.device` - mobile/desktop
- `window.openai.maxHeight` - layout constraints

**Methods:**
- `callTool(name, payload)` - trigger MCP server action
- `sendFollowUpMessage(text)` - insert chat prompt
- `requestClose()` - close widget
- `requestDisplayMode(mode)` - switch inline/pip/fullscreen
- `setWidgetState(state)` - persist data visible to ChatGPT

**Events:**
- `window.addEventListener("openai:set_globals", handler)` - updates from ChatGPT

## Demo App Ideas (Easy → Advanced)

### 1. Todo List (Quickstart Example)
**Complexity: Low**
- CRUD operations (add, complete, list)
- Checkbox interactions
- Form handling
- **Learn**: Basic MCP tools, state sync, `callTool()` pattern

### 2. Weather Dashboard
**Complexity: Low-Medium**
- Fetch OpenWeather API
- Display cards with conditions/forecast
- Location search tool
- **Learn**: External API integration, structured data display

### 3. Expense Tracker
**Complexity: Medium**
- Add/categorize expenses
- Chart.js visualization
- Date filtering, totals calculation
- **Learn**: Data visualization, complex state management

### 4. Recipe Finder
**Complexity: Medium**
- Search recipe API (Spoonacular)
- Carousel component for browsing
- Save favorites with `setWidgetState()`
- **Learn**: Multiple UI modes, state persistence

### 5. Pomodoro Timer + Tasks
**Complexity: Medium**
- Timer controls (start/pause/reset)
- Task list integration
- Browser notifications
- **Learn**: Time-based interactions, notifications API

### 6. 3D Model Viewer
**Complexity: High**
- Three.js/WebGL rendering
- Interactive camera controls
- Load different models via tools
- **Learn**: 3D graphics, performance optimization

## Quick Start Steps

### 1. Setup MCP Server
```bash
mkdir my-chatgpt-app
cd my-chatgpt-app
npm init -y
npm install @modelcontextprotocol/sdk zod

# Add to package.json
echo '{"type": "module"}' > package.json
```

### 2. Create `server.js`
- Register resources (HTML widgets)
- Register tools (actions ChatGPT can call)
- Return `structuredContent` for data sync

### 3. Create `public/widget.html`
- Access initial data via `window.openai.toolOutput`
- Call tools via `window.openai.callTool(name, args)`
- Listen for updates via `openai:set_globals` event

### 4. Run Locally
```bash
node server.js
# Server runs on http://localhost:8787/mcp

# Test with MCP Inspector
npx @modelcontextprotocol/inspector@latest http://localhost:8787/mcp

# Expose publicly
ngrok http 8787
# Use https://<subdomain>.ngrok.app/mcp
```

### 5. Connect to ChatGPT
1. Enable **Developer Mode** in ChatGPT Settings → Apps & Connectors → Advanced
2. Settings → Connectors → Create
3. Paste ngrok URL + `/mcp` path
4. Open new chat, add connector from + menu
5. Prompt: "Add a task to read my book"

## Official Examples in Repo

### Pizzaz (Node & Python)
- **Location**: `mcp-servers/pizzaz-node/`, `mcp-servers/pizzaz-python/`
- **Features**: Multiple widgets (map, carousel, album, list, video)
- **Demonstrates**: Full tool surface, component bundling, Vite build setup

### Solar System (Python)
- **Location**: `mcp-servers/solar-system-python/`
- **Features**: 3D WebGL visualization
- **Demonstrates**: Complex graphics, Python MCP patterns

## Development Workflow

### File Structure
```
my-app/
├── server.js              # MCP server
├── public/
│   └── widget.html        # Web component
├── package.json
└── node_modules/
```

### Iteration Loop
1. Edit MCP server or widget
2. Restart server: `node server.js`
3. Refresh connector in ChatGPT Settings → Connectors
4. Test in chat

### Using React/Vite
```bash
npm create vite@latest my-widget -- --template react
cd my-widget
npm install
npm run build  # Outputs to dist/

# Inline dist/index.html content into MCP resource
```

## Key Metadata for Tools

```javascript
_meta: {
  // Widget to render after tool call
  "openai/outputTemplate": "ui://widget/app.html",

  // Loading states
  "openai/toolInvocation/invoking": "Processing...",
  "openai/toolInvocation/invoked": "Done!",

  // Widget preferences
  "openai/widgetPrefersBorder": true
}
```

## Authentication (OAuth)
- Supports user authentication via OAuth
- Access user tokens in MCP server
- See docs for full OAuth flow setup

## Best Practices
1. **Start Simple**: Clone todo example, modify incrementally
2. **Test with Inspector**: Use MCP Inspector before ChatGPT integration
3. **Use UI Kit**: Leverage https://openai.github.io/apps-sdk-ui for consistent design
4. **Handle Errors**: Return clear error messages in tool responses
5. **Optimize Loading**: Inline CSS/JS for faster widget rendering

## Recommended Starting Point

**Modify Todo App** from quickstart to add:
- Categories/tags with color coding
- Due dates with date picker
- Priority levels
- Filter controls (show completed, by category)
- Export to JSON

This teaches all core concepts without overwhelming complexity.

## Status
- **Current**: Developer Preview (testing phase)
- **Coming**: App submission opens later in 2025
- **Access**: Enable Developer Mode in ChatGPT settings
