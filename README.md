# Claude Plugins

A curated collection of Claude Code plugins.

## Installation

Add this marketplace to your Claude Code:

```
/plugin marketplace add pyjun01/claude-plugins
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
  "path": "./plugins/your-plugin-name"
}
```

## License

[MIT](LICENSE)
