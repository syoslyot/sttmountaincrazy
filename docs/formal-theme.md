# Formal Theme

The formal theme is a quiet, document-like interface. It should feel consistent with printed expedition records: compact, restrained, and readable.

## Pages

| Page | Purpose |
| --- | --- |
| `/formal` | index, county browsing, mobile filters |
| `/formal/[id]` | expedition detail, maps, GPX/KML, downloads |
| `/formal/about` | static informational page |
| `/formal/submit` | static submission guidance page |

## Visual Rules

- Prefer thin borders, small labels, and restrained color.
- Avoid card-heavy marketing layout.
- Keep typography compact inside controls and lists.
- Mobile filter controls should align with the formal border/grid language.

## Map Behavior

Detail pages can show:

- 2D Leaflet map;
- 3D MapLibre terrain view;
- GPX/KML record points and tracks;
- start/end labels when track points are available.

Mobile map controls should be available in the bottom tab area, not hidden behind desktop-only controls.

## Filter Behavior

Formal mobile filters include:

- keyword input;
- year select;
- grade select.

`ALL` can appear in menu options when matching desktop data labels, but selected mobile display text may use localized wording when the design requires it.

Year options must come from `get_expedition_years()`, not from a synthetic continuous range.
