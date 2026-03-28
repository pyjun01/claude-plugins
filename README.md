# pyjun-plugins

A curated collection of Claude Code plugins.

## Plugins

| Name | Description | Version |
|------|-------------|---------|
| [autonomous-builder](./plugins/autonomous-builder) | Autonomously builds or extends full-stack applications via a Generator-Evaluator convergence loop | 1.0.1 |
| [improve-prompt-consistency](./plugins/improve-prompt-consistency) | Analyze and improve prompts using 9 research-backed consistency criteria | 1.0.0 |
| [debug-tool](./plugins/debug-tool) | Help Claude Code debugging | 1.0.0 |

## Installation

Add this marketplace to your Claude Code:

```
/plugin marketplace add pyjun01/pyjun-plugins
```

Then browse and install individual plugins from this collection.

## Adding a Plugin

1. Create your plugin under `plugins/<plugin-name>/` following the [Claude Code plugin structure](https://docs.anthropic.com/en/docs/claude-code/plugins).
2. Update `.claude-plugin/marketplace.json` to register your plugin in the `plugins` array.
3. Open a Pull Request.

### Plugin Entry Format

Add an entry to the `plugins` array in `.claude-plugin/marketplace.json`:

```json
{
  "name": "your-plugin-name",
  "description": "Short description of what the plugin does",
  "source": "./plugins/your-plugin-name"
}
```

## License

[MIT](LICENSE)
