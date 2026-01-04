# scrapbox-mcp

MCP server for Scrapbox API.

## Run

```bash
bunx @r_masseater/scrapbox-mcp@latest
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SCRAPBOX_PROJECT` | ✓ | Project name |
| `SCRAPBOX_COOKIE` | ✓ | Value of `connect.sid` cookie |
| `SCRAPBOX_PRESET` | | Tool preset (see below) |
| `SCRAPBOX_TOOLS` | | Comma-separated list of tools to enable |
| `SCRAPBOX_ENABLE_DELETE` | | Set `true` to enable delete_page |

### Getting the Cookie

1. Log in to [scrapbox.io](https://scrapbox.io)
2. DevTools (F12) → **Application** → **Cookies** → `https://scrapbox.io`
3. Copy the value of `connect.sid`

### Tool Presets

Select available tools with `SCRAPBOX_PRESET`:

| Preset | Tools |
|--------|-------|
| `minimal` | list_pages, get_page |
| `readonly` | list_pages, get_page, search_pages, get_links, get_backlinks |
| `full` (default) | All tools (delete_page requires `SCRAPBOX_ENABLE_DELETE=true`) |

Custom selection: `SCRAPBOX_TOOLS=list_pages,get_page,search_pages`

## Available Tools

### Read

| Tool | Description |
|------|-------------|
| `list_pages` | List all pages in the project |
| `get_page` | Get page content (Scrapbox notation) |
| `search_pages` | Full-text search |
| `get_links` | Get outgoing links from a page |
| `get_backlinks` | Get backlinks to a page |

### Write

| Tool | Description |
|------|-------------|
| `create_page` | Create a new page |
| `update_page` | Update an existing page (full replacement) |
| `insert_lines` | Insert lines at a specific position (or append to end) |
| `delete_page` | Delete a page (requires `SCRAPBOX_ENABLE_DELETE=true`) |
